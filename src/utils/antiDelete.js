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
    this.cache = new Map();
    this.maxSize = 1500;
    this.processedEvents = new Set();
  }

  /**
   * Almacena un mensaje en la memoria para soporte de reintentos (getMessage)
   * y para detección de eliminación / edición (Anti-Delete / Anti-Edit).
   */
  async store(msg) {
    if (!msg || !msg.key || !msg.key.id || !msg.message) return;

    // Ignorar estados de difusión
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

    // Control de límite de memoria
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(id, entry);

    // Si es multimedia, pre-descargar el buffer de forma segura para tenerlo si lo borran
    if (mediaNode && mediaType) {
      downloadBaileysMedia(mediaNode, mediaType)
        .then(buffer => {
          if (buffer && buffer.length > 0) {
            entry.mediaBuffer = buffer;
          }
        })
        .catch(() => {
          // Ignorar fallo de pre-descarga
        });
    }
  }

  /**
   * Obtiene el mensaje sin procesar para getMessage de Baileys
   */
  getMessage(key) {
    if (!key || !key.id) return undefined;
    const item = this.cache.get(key.id);
    return item?.message || undefined;
  }

  /**
   * Procesa la eliminación de un mensaje (REVOKE)
   */
  async handleRevoke(sock, targetKey) {
    if (!targetKey || !targetKey.id) return;
    const targetId = targetKey.id;

    const eventKey = `revoke_${targetId}`;
    if (this.processedEvents.has(eventKey)) return;
    this.processedEvents.add(eventKey);

    const cached = this.cache.get(targetId);
    if (!cached) return;

    // No notificar si el mensaje fue borrado por el propio bot (ej. comandos de moderación silenciosa)
    if (cached.fromMe || targetKey.fromMe) return;

    const remoteJid = cached.remoteJid || targetKey.remoteJid;
    if (!remoteJid || remoteJid === 'status@broadcast') return;

    const pushName = cached.pushName || 'Usuario';
    const sender = cached.sender;
    const mentions = sender ? [sender] : [];

    try {
      // 1. Mensaje con archivo multimedia borrado
      if (cached.mediaType) {
        let buffer = cached.mediaBuffer;
        if (!buffer && cached.mediaNode) {
          try {
            buffer = await downloadBaileysMedia(cached.mediaNode, cached.mediaType);
          } catch {}
        }

        const formatCaption = cached.caption
          ? `${pushName}: ${cached.caption}`
          : `${pushName}`;

        if (buffer && buffer.length > 0) {
          if (cached.mediaType === 'image') {
            await sock.sendMessage(remoteJid, {
              image: buffer,
              caption: formatCaption,
              mentions
            });
            return;
          } else if (cached.mediaType === 'video') {
            await sock.sendMessage(remoteJid, {
              video: buffer,
              caption: formatCaption,
              mentions
            });
            return;
          } else if (cached.mediaType === 'sticker') {
            await sock.sendMessage(remoteJid, {
              sticker: buffer
            });
            await sock.sendMessage(remoteJid, {
              text: `${pushName}: [Sticker eliminado]`,
              mentions
            });
            return;
          } else if (cached.mediaType === 'audio') {
            await sock.sendMessage(remoteJid, {
              audio: buffer,
              mimetype: 'audio/mp4',
              ptt: Boolean(cached.mediaNode?.ptt)
            });
            await sock.sendMessage(remoteJid, {
              text: `${pushName}: [Audio eliminado]`,
              mentions
            });
            return;
          } else if (cached.mediaType === 'document') {
            await sock.sendMessage(remoteJid, {
              document: buffer,
              mimetype: cached.mediaNode?.mimetype || 'application/octet-stream',
              fileName: cached.mediaNode?.fileName || 'documento',
              caption: formatCaption,
              mentions
            });
            return;
          }
        }
      }

      // 2. Mensaje de texto borrado
      const originalText = extractText(cached.message);
      if (originalText) {
        await sock.sendMessage(remoteJid, {
          text: `${pushName}: ${originalText}`,
          mentions
        });
      }
    } catch (err) {
      console.error('[AntiDelete Revoke Error]', err);
    }
  }

  /**
   * Procesa la edición de un mensaje
   */
  async handleEdit(sock, targetKey, editedMessage) {
    if (!targetKey || !targetKey.id) return;
    const targetId = targetKey.id;

    const eventKey = `edit_${targetId}_${Date.now()}`;
    if (this.processedEvents.has(eventKey)) return;
    this.processedEvents.add(eventKey);

    const cached = this.cache.get(targetId);
    if (!cached) return;

    if (cached.fromMe || targetKey.fromMe) return;

    const remoteJid = cached.remoteJid || targetKey.remoteJid;
    if (!remoteJid || remoteJid === 'status@broadcast') return;

    const pushName = cached.pushName || 'Usuario';
    const sender = cached.sender;
    const mentions = sender ? [sender] : [];

    const originalText = extractText(cached.message);
    if (!originalText) return;

    try {
      // Formato requerido: <NombreDeUsuario>: <MensajeOriginal>
      await sock.sendMessage(remoteJid, {
        text: `${pushName}: ${originalText}`,
        mentions
      });

      // Actualizar el caché con la nueva versión del mensaje para futuras ediciones
      if (editedMessage) {
        cached.message = editedMessage;
      }
    } catch (err) {
      console.error('[AntiDelete Edit Error]', err);
    }
  }
}

export const antiDeleteTracker = new AntiDeleteTracker();

/**
 * Escuchador de protocolo en messages.upsert para detectar eliminaciones y ediciones
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
      // Protocol MESSAGE_EDIT (tipo 14)
      else if (protocol.type === 14 && protocol.key && protocol.editedMessage) {
        await antiDeleteTracker.handleEdit(sock, protocol.key, protocol.editedMessage);
      }
    } else {
      // Guardar mensaje normal en memoria
      await antiDeleteTracker.store(msg);
    }
  } catch (err) {
    console.error('[AntiDelete Upsert Error]', err);
  }
}

/**
 * Escuchador de actualizaciones en messages.update
 */
export async function handleMessagesUpdate(sock, updates) {
  try {
    if (!updates || !Array.isArray(updates)) return;

    for (const item of updates) {
      const { key, update } = item;
      if (!key) continue;

      // Detección de eliminación por mensaje nulo o stub
      if (update && update.message === null) {
        await antiDeleteTracker.handleRevoke(sock, key);
      }

      // Detección de edición
      const edited =
        update?.message?.protocolMessage?.editedMessage ||
        update?.editedMessage;
      if (edited) {
        await antiDeleteTracker.handleEdit(sock, key, edited);
      }
    }
  } catch (err) {
    console.error('[AntiDelete Update Error]', err);
  }
}
