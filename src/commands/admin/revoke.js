import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'revoke',
  aliases: ['restablecer', 'resetlink'],
  description: 'Restablece el enlace de invitación del grupo invalidando el anterior.',
  usage: '!revoke',
  category: 'admin',
  async execute({ sock, remoteJid, sender, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    try {
      const newCode = await sock.groupRevokeInvite(remoteJid);
      const newInviteUrl = `https://chat.whatsapp.com/${newCode}`;

      await sock.sendMessage(remoteJid, {
        text: `🔄 *Enlace Restablecido con Éxito!*\nEl enlace anterior ha sido invalidado.\n\n🔗 *Nuevo Enlace:* ${newInviteUrl}`
      });
    } catch (err) {
      console.error('[Revoke Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo restablecer el enlace de invitación.'
      });
    }
  }
};
