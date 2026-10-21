import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'link',
  aliases: ['enlace', 'invitacion'],
  description: 'Obtiene y muestra el enlace de invitación del grupo.',
  usage: '!link',
  category: 'admin',
  async execute({ sock, remoteJid, sender, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    try {
      const code = await sock.groupInviteCode(remoteJid);
      const inviteUrl = `https://chat.whatsapp.com/${code}`;

      await sock.sendMessage(remoteJid, {
        text: `🔗 *Enlace de Invitación del Grupo:*\n${inviteUrl}`
      });
    } catch (err) {
      console.error('[Link Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo obtener el enlace de invitación. Verifica que el bot sea administrador.'
      });
    }
  }
};
