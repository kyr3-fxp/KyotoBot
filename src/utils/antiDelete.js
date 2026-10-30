import { downloadBaileysMedia } from './media.js';
import { normalizeJid } from './permissions.js';

/**
 * Desempaqueta capas anidadas de mensajes de Baileys
 */
export function unwrapMessage(msgContent) {
  if (!msgContent) return null;
  let content = msgContent;
  let iterations = 0;
  while (content && iterations < 5) {
    if (content.ephemeralMessage?.message) {
      content = content.ephemeralMessage.message;
    } else if (content.viewOnceMessage?.message) {
      content = content.viewOnceMessage.message;
    } else if (content.viewOnceMessageV2?.message) {
      content = content.viewOnceMessageV2.message;
    } else if (content.viewOnceMessageV2Extension?.message) {
      content = content.viewOnceMessageV2Extension.message;
    } else if (content.documentWithCaptionMessage?.message) {
      content = content.documentWithCaptionMessage.message;
    } else if (content.deviceSentMessage?.message) {
      content = content.deviceSentMessage.message;
    } else {
      break;
    }
    iterations++;
  }
  return content;
}

/**
 * Extrae el texto legible de un mensaje
 */
export function extractText(message) {
  if (!message) return '';
  const unwrapped = unwrapMessage(message);
  if (!unwrapped) return '';

  return (
    unwrapped.conversation ||
    unwrapped.extendedTextMessage?.text ||
    unwrapped.imageMessage?.caption ||
    unwrapped.videoMessage?.caption ||
    unwrapped.documentMessage?.caption ||
    ''
  ).trim();
}

class AntiDeleteTracker {
  constructor() {
    this.cache = new Map(); // id -> entry
    this.deletedStore = new Map(); // id -> entry
    this.deletedByChat = new Map(); // remoteJid -> [id1, id2, ...]
    this.maxSize = 400; // Reducido para evitar saturación de RAM con buffers multimedia
  }

  /**
   * Almacena un mensaje en memoria para reintentos (getMessage)
   * y guarda buffer multimedia para recuperación bajo demanda con !undel.
   */
  async store(msg) {
    if (!msg || !msg.key || !msg.key.id || !msg.message) return;

    if (msg.key.remoteJid === 'status@broadcast') return;

    const id = msg.key.id;
    const remoteJid = msg.key.remoteJid;
    const isFromMe = Boolean(msg.key.fromMe);
    const rawSender = isFromMe
      ? remoteJid
      : (msg.key.participant || remoteJid);
    const sender = normalizeJid(rawSender);
    const pushName = msg.pushName || rawSender.split(':')[0].split('@')[0] || 'Usuario';

    const unwrapped = unwrapMessage(msg.message);
    let mediaType = null;
    let mediaNode = null;
    let caption = '';

    if (unwrapped?.imageMessage) {
      mediaType = 'image';
      mediaNode = unwrapped.imageMessage;
      caption = unwrapped.imageMessage.caption || '';
    } else if (unwrapped?.videoMessage) {
      mediaType = 'video';
      mediaNode = unwrapped.videoMessage;
      caption = unwrapped.videoMessage.caption || '';
    } else if (unwrapped?.stickerMessage) {
      mediaType = 'sticker';
      mediaNode = unwrapped.stickerMessage;
    } else if (unwrapped?.audioMessage) {
      mediaType = 'audio';
      mediaNode = unwrapped.audioMessage;
    } else if (unwrapped?.documentMessage) {
      mediaType = 'document';
      mediaNode = unwrapped.documentMessage;
      caption = unwrapped.documentMessage.caption || unwrapped.documentMessage.fileName || '';
    }

    const entry = {
      key: msg.key,
      remoteJid,
      fromMe: isFromMe,
      sender,
      pushName,
      message: msg.message,
      mediaType,
      mediaNode,
      caption,
      mediaBuffer: null,
      timestamp: msg.messageTimestamp || Date.now()
    };

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(id, entry);

    // Pre-descargar buffer de forma silenciosa para que esté listo ante borrados
    if (mediaNode && mediaType) {
      downloadBaileysMedia(mediaNode, mediaType)
        .then(buffer => {
          if (buffer && buffer.length > 0) {
            entry.mediaBuffer = buffer;
          }
        })
        .catch(() => {});
    }
  }

  /**
   * Obtiene el mensaje sin procesar para getMessage de Baileys
   */
  getMessage(key) {
    if (!key || !key.id) return undefined;
    const item = this.cache.get(key.id) || this.deletedStore.get(key.id);
    return item?.message || undefined;
  }

  /**
   * Registra silenciosamente un mensaje como eliminado sin enviar alertas automáticas al chat.
   * Queda disponible para ser consultado con el comando !undel.
   */
  async handleRevoke(sock, targetKey) {
    if (!targetKey || !targetKey.id) return;
    const targetId = targetKey.id;

    const cached = this.cache.get(targetId);
    if (!cached) return;

    // Si el mensaje fue borrado por el bot (ej. !del o antilink), no guardarlo
    if (cached.fromMe || targetKey.fromMe) return;

    const remoteJid = cached.remoteJid || targetKey.remoteJid;
    if (!remoteJid || remoteJid === 'status@broadcast') return;

    // Si aún no tenía buffer y tiene nodo, intentar descargarlo
    if (cached.mediaType && !cached.mediaBuffer && cached.mediaNode) {
      try {
        cached.mediaBuffer = await downloadBaileysMedia(cached.mediaNode, cached.mediaType);
      } catch {}
    }

    // Registrar en almacén de eliminados
    this.deletedStore.set(targetId, cached);
    if (this.deletedStore.size > 200) {
      const oldestDeletedKey = this.deletedStore.keys().next().value;
      this.deletedStore.delete(oldestDeletedKey);
    }

    let chatList = this.deletedByChat.get(remoteJid);
    if (!chatList) {
      chatList = [];
      this.deletedByChat.set(remoteJid, chatList);
    }

    // Insertar al inicio de la lista de eliminados recientes del chat
    if (!chatList.includes(targetId)) {
      chatList.unshift(targetId);
      if (chatList.length > 50) chatList.pop();
    }

    console.log(`[AntiDelete] Guardado mensaje eliminado (${targetId}) de @${cached.sender?.split('@')[0]} en ${remoteJid}`);
  }

  /**
   * Obtiene un mensaje eliminado específico o el más reciente en el chat
   */
  getDeletedMessage(remoteJid, targetId) {
    if (targetId) {
      return this.deletedStore.get(targetId) || this.cache.get(targetId) || null;
    }

    const chatList = this.deletedByChat.get(remoteJid);
    if (chatList && chatList.length > 0) {
      for (const id of chatList) {
        const found = this.deletedStore.get(id) || this.cache.get(id);
        if (found) return found;
      }
    }

    return null;
  }
}

export const antiDeleteTracker = new AntiDeleteTracker();

/**
 * Escuchador de protocolo en messages.upsert para registrar eliminaciones
 */
export async function handleUpsertAntiDelete(sock, msg) {
  try {
    if (!msg || !msg.message) return;

    const protocol = msg.message.protocolMessage;
    if (protocol) {
      // Protocol REVOKE (tipo 0)
      if (protocol.type === 0 && protocol.key) {
        await antiDeleteTracker.handleRevoke(sock, protocol.key);
      }
    } else {
      await antiDeleteTracker.store(msg);
    }
  } catch (err) {
    console.error('[AntiDelete Upsert Error]', err);
  }
}

/**
 * Escuchador de actualizaciones en messages.update para registrar eliminaciones
 */
export async function handleMessagesUpdate(sock, updates) {
  try {
    if (!updates || !Array.isArray(updates)) return;

    for (const item of updates) {
      const { key, update } = item;
      if (!key) continue;

      if (update && update.message === null) {
        await antiDeleteTracker.handleRevoke(sock, key);
      }
    }
  } catch (err) {
    console.error('[AntiDelete Update Error]', err);
  }
}
