import { areJidsSameUser, jidNormalizedUser } from '@whiskeysockets/baileys';

/**
 * Normaliza un JID de WhatsApp quitando sufijos de dispositivo (multi-device)
 * tanto para el ID del remitente como para el de los participantes.
 * Regla: .split(':')[0] + '@s.whatsapp.net'
 */
export function normalizeJid(jid) {
  if (!jid || typeof jid !== 'string') return '';
  try {
    return jidNormalizedUser(jid);
  } catch {
    const clean = jid.split(':')[0].split('@')[0];
    return `${clean}@s.whatsapp.net`;
  }
}

/**
 * Comprueba si un participante de grupo coincide con un JID/LID objetivo
 * contemplando JIDs estándar (@s.whatsapp.net), LIDs (@lid), número de teléfono y sufijos de dispositivo.
 */
export function isUserMatch(participant, targetJid, targetLid) {
  if (!participant) return false;
  const pId = participant.id || '';
  const pLid = participant.lid || '';
  const pPhone = participant.phoneNumber || '';

  // 1. areJidsSameUser de Baileys (comparación nativa)
  if (targetJid) {
    try {
      if (areJidsSameUser(pId, targetJid)) return true;
      if (pPhone && areJidsSameUser(pPhone, targetJid)) return true;
    } catch {}
  }
  if (targetLid) {
    try {
      if (areJidsSameUser(pId, targetLid)) return true;
      if (pLid && areJidsSameUser(pLid, targetLid)) return true;
    } catch {}
  }

  // 2. Normalización de usuario con jidNormalizedUser
  const normTarget = normalizeJid(targetJid);
  if (normTarget) {
    if (normalizeJid(pId) === normTarget) return true;
    if (pPhone && normalizeJid(pPhone) === normTarget) return true;
  }

  // 3. Comparación numérica limpia (solo dígitos del número de teléfono)
  const cleanDigits = j => (j || '').replace(/[^0-9]/g, '');
  const targetDigits = cleanDigits(targetJid);
  if (targetDigits && targetDigits.length >= 7) {
    const pDigits = cleanDigits(pPhone || pId);
    if (pDigits === targetDigits || pDigits.endsWith(targetDigits) || targetDigits.endsWith(pDigits)) {
      return true;
    }
  }

  return false;
}

/**
 * Helper para verificar permisos de administrador en grupos de WhatsApp
 * Aplica permiso al dueño (Owner / fromMe), normalización de JIDs y soporte multi-device / LID.
 */
export async function checkGroupAdmin({
  sock,
  remoteJid,
  sender,
  msg,
  m,
  isFromMe,
  requireBotAdmin = true
}) {
  const isGroup = remoteJid && remoteJid.endsWith('@g.us');
  if (!isGroup) {
    return {
      isGroup: false,
      isAdmin: false,
      isBotAdmin: false,
      isOwner: false,
      isCreator: false,
      error: '⚠️ Este comando solo se puede utilizar en grupos.'
    };
  }

  // Identificador del bot normalizado y LID
  const rawBotId = sock?.user?.id || sock?.user?.jid || '';
  const botLid = sock?.user?.lid || '';
  const botJid = normalizeJid(rawBotId);

  // Remitente normalizado (soporta sender, m.sender, msg.sender, participant)
  const rawSender =
    sender ||
    msg?.sender ||
    m?.sender ||
    (msg?.key?.fromMe ? rawBotId : (msg?.key?.participant || remoteJid));
  const senderJid = normalizeJid(rawSender);
  const senderLid = msg?.key?.participant?.endsWith('@lid') ? msg.key.participant : '';

  // Verificación de dueño / cuenta propia del bot
  const ownerFromMe = Boolean(
    isFromMe ||
    msg?.key?.fromMe ||
    m?.key?.fromMe ||
    m?.messages?.[0]?.key?.fromMe
  );
  const isOwner =
    ownerFromMe ||
    (botJid && senderJid === botJid) ||
    isUserMatch({ id: senderJid, lid: senderLid }, botJid, botLid);

  // Intentar obtener la información y participantes del grupo
  let metadata = null;
  let participants = [];
  try {
    metadata = await sock.groupMetadata(remoteJid);
    participants = metadata?.participants || [];
  } catch (err) {
    console.warn('[Permissions] No se pudo obtener groupMetadata:', err?.message || err);
  }

  // Si no se pudo obtener metadata
  if (!metadata) {
    if (isOwner) {
      return {
        isGroup: true,
        isAdmin: true,
        isBotAdmin: true,
        isOwner: true,
        isCreator: true,
        metadata: null,
        participants: [],
        error: null
      };
    }
    return {
      isGroup: true,
      isAdmin: false,
      isBotAdmin: false,
      isOwner: false,
      isCreator: false,
      error: '❌ Error al obtener los permisos del grupo.'
    };
  }

  // Filtrar administradores
  const adminParticipants = participants.filter(
    p => p.admin === 'admin' || p.admin === 'superadmin'
  );

  const isAdmin = isOwner || adminParticipants.some(p => isUserMatch(p, senderJid, senderLid));
  const isBotAdmin = adminParticipants.some(p => isUserMatch(p, botJid, botLid));

  if (!isAdmin) {
    return {
      isGroup: true,
      isAdmin: false,
      isBotAdmin,
      isOwner,
      isCreator: false,
      metadata,
      participants,
      error: '⛔ Necesitas ser *Administrador* del grupo para usar este comando.'
    };
  }

  // Si el comando exige que el bot también sea admin para operar (ej: expulsar, cambiar enlace, etc.)
  if (requireBotAdmin && !isBotAdmin) {
    return {
      isGroup: true,
      isAdmin: true,
      isBotAdmin: false,
      isOwner,
      isCreator: false,
      metadata,
      participants,
      error: '⚠️ El bot necesita ser *Administrador* del grupo para ejecutar esta acción.'
    };
  }

  return {
    isGroup: true,
    isAdmin: true,
    isBotAdmin,
    isOwner,
    isCreator: isOwner,
    metadata,
    participants,
    error: null
  };
}
