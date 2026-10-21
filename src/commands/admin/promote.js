import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'promote',
  aliases: ['promover', 'daradmin'],
  description: 'Otorga permisos de administrador a un miembro del grupo.',
  usage: '!promote @usuario (o respondiendo a su mensaje)',
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
        text: '⚠️ Debes etiquetar o responder al mensaje del miembro a promover.\n*Ejemplo:* `!promote @usuario`'
      });
      return;
    }

    const cleanTarget = target.split(':')[0].split('@')[0];

    try {
      await sock.groupParticipantsUpdate(remoteJid, [target], 'promote');
      await sock.sendMessage(remoteJid, {
        text: `👑 ¡Felicidades! @${cleanTarget} ahora es Administrador del grupo.`,
        mentions: [target]
      });
    } catch (err) {
      console.error('[Promote Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo promover al usuario.'
      });
    }
  }
};
