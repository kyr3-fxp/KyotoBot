/**
 * Normaliza un JID de WhatsApp quitando sufijos de dispositivo (multi-device)
 * tanto para el ID del remitente como para el de los participantes.
 * Regla: .split(':')[0] + '@s.whatsapp.net'
 */
export function normalizeJid(jid) {
  if (!jid || typeof jid !== 'string') return '';
  const clean = jid.split(':')[0].split('@')[0];
  return `${clean}@s.whatsapp.net`;
}

/**
 * Helper para verificar permisos de administrador en grupos de WhatsApp
 * Aplica permiso absoluto al dueño (Owner / fromMe) y normalización de JIDs.
 */
export async function checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe }) {
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

  // Identificador del bot normalizado
  const rawBotId = sock?.user?.id || sock?.user?.jid || '';
  const botJid = normalizeJid(rawBotId);

  // Remitente normalizado (soporta sender, m.sender, msg.sender, participant)
  const rawSender =
    sender ||
    msg?.sender ||
    m?.sender ||
    (msg?.key?.fromMe ? rawBotId : (msg?.key?.participant || remoteJid));
  const senderJid = normalizeJid(rawSender);

  // Verificación de dueño / cuenta propia del bot
  const ownerFromMe = Boolean(
    isFromMe ||
    msg?.key?.fromMe ||
    m?.key?.fromMe ||
    m?.messages?.[0]?.key?.fromMe
  );
  const isOwner = ownerFromMe || (botJid && senderJid === botJid);

  // Intentar obtener la información y participantes del grupo
  let metadata = null;
  let participants = [];
  try {
    metadata = await sock.groupMetadata(remoteJid);
    participants = metadata?.participants || [];
  } catch (err) {
    console.warn('[Permissions] No se pudo obtener groupMetadata:', err?.message || err);
  }

  // --- Permiso absoluto al dueño (Owner / fromMe) ---
  // Si el mensaje proviene de la propia cuenta del bot (m.key.fromMe === true),
  // debe omitirse la validación y otorgarle acceso inmediato como Administrador y Creador del bot.
  if (isOwner) {
    return {
      isGroup: true,
      isAdmin: true,
      isBotAdmin: true,
      isOwner: true,
      isCreator: true,
      metadata,
      participants,
      error: null
    };
  }

  if (!metadata) {
    return {
      isGroup: true,
      isAdmin: false,
      isBotAdmin: false,
      isOwner: false,
      isCreator: false,
      error: '❌ Error al obtener los permisos del grupo.'
    };
  }

  // --- Normalización de JIDs para el filtro de Admins ---
  // Filtra administradores limpiando identificadores con .split(':')[0] + '@s.whatsapp.net'
  const adminParticipants = participants.filter(
    p => p.admin === 'admin' || p.admin === 'superadmin'
  );
  const adminJids = adminParticipants.map(p => normalizeJid(p.id));

  const isAdmin = adminJids.includes(senderJid);
  const isBotAdmin = adminJids.includes(botJid);

  if (!isAdmin) {
    return {
      isGroup: true,
      isAdmin: false,
      isBotAdmin,
      isOwner: false,
      isCreator: false,
      metadata,
      participants,
      error: '⛔ Necesitas ser *Administrador* del grupo para usar este comando.'
    };
  }

  if (!isBotAdmin) {
    return {
      isGroup: true,
      isAdmin: true,
      isBotAdmin: false,
      isOwner: false,
      isCreator: false,
      metadata,
      participants,
      error: '⚠️ El bot necesita ser *Administrador* del grupo para ejecutar esta acción.'
    };
  }

  return {
    isGroup: true,
    isAdmin: true,
    isBotAdmin: true,
    isOwner: false,
    isCreator: false,
    metadata,
    participants,
    error: null
  };
}
