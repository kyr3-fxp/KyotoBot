import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'kick',
  aliases: ['ban', 'expulsar', 'sacar'],
  description: 'Expulsa a un usuario del grupo.',
  usage: '!kick @usuario (o respondiendo a su mensaje)',
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
        text: '⚠️ Debes etiquetar o responder al mensaje del usuario que deseas expulsar.\n*Ejemplo:* `!kick @usuario`'
      });
      return;
    }

    const cleanTarget = target.split(':')[0].split('@')[0];
    const cleanSender = sender.split(':')[0].split('@')[0];

    if (cleanTarget === cleanSender) {
      await sock.sendMessage(remoteJid, { text: '🤦‍♂️ No puedes expulsarte a ti mismo.' });
      return;
    }

    try {
      await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
      await sock.sendMessage(remoteJid, {
        text: `🚪 @${cleanTarget} ha sido expulsado del grupo por @${cleanSender}.`,
        mentions: [target, sender]
      });
    } catch (err) {
      console.error('[Kick Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo expulsar al usuario. Verifica que el bot tenga permisos de administrador.'
      });
    }
  }
};
