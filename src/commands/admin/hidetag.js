import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'hidetag',
  aliases: ['notificar', 'tagfantasma'],
  description: 'Envía un mensaje notificando a todos los integrantes sin mostrar menciones explícitas ni adornos.',
  usage: '!hidetag <mensaje> o respondiendo a un mensaje',
  category: 'admin',
  async execute({ sock, remoteJid, sender, args, quotedMsg, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe, requireBotAdmin: false });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    // Obtener los JIDs de todos los participantes del grupo
    const groupParticipantsJids = (perm.participants || []).map(p => p.id);

    // Extraer únicamente el texto limpio escrito o el del mensaje citado
    const textFromArgs = args.join(' ').trim();
    const quotedText = (
      quotedMsg?.conversation ||
      quotedMsg?.extendedTextMessage?.text ||
      quotedMsg?.imageMessage?.caption ||
      quotedMsg?.videoMessage?.caption ||
      quotedMsg?.documentMessage?.caption ||
      ''
    ).trim();

    const cleanText = textFromArgs || quotedText;

    if (!cleanText) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes escribir un mensaje o responder a un texto para notificar.'
      });
      return;
    }

    // Enviar de forma limpia únicamente el texto exacto sin encabezados, bordes ni emojis adicionales
    await sock.sendMessage(remoteJid, {
      text: cleanText,
      mentions: groupParticipantsJids
    });
  }
};
