import { checkGroupAdmin } from '../../utils/permissions.js';
import { db } from '../../database.js';

export default {
  name: 'mute',
  aliases: ['unmute', 'silenciar', 'dessilenciar'],
  description: 'Silencia o quita el silencio a un miembro en particular del grupo.',
  usage: '!mute @usuario | !unmute @usuario',
  category: 'admin',
  async execute({ sock, remoteJid, sender, mentions, quotedParticipant, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    const target = quotedParticipant || (mentions && mentions.length > 0 ? mentions[0] : null);

    if (!target) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes etiquetar o responder al mensaje del miembro a silenciar/dessilenciar.\n*Ejemplo:* `!mute @usuario`'
      });
      return;
    }

    const cleanTarget = target.split(':')[0].split('@')[0];
    const group = db.getGroup(remoteJid);
    if (!Array.isArray(group.muted)) {
      group.muted = [];
    }

    const isMuted = group.muted.includes(cleanTarget);

    if (isMuted) {
      // Quitar silencio
      group.muted = group.muted.filter(id => id !== cleanTarget);
      db.saveGroups();
      await sock.sendMessage(remoteJid, {
        text: `🔊 @${cleanTarget} ha sido dessilenciado. Ya puede enviar mensajes nuevamente.`,
        mentions: [target]
      });
    } else {
      // Silenciar
      group.muted.push(cleanTarget);
      db.saveGroups();
      await sock.sendMessage(remoteJid, {
        text: `🔇 @${cleanTarget} ha sido silenciado. Sus mensajes en este grupo serán eliminados automáticamente por el bot.`,
        mentions: [target]
      });
    }
  }
};
