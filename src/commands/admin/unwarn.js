import { checkGroupAdmin } from '../../utils/permissions.js';
import { db } from '../../database.js';

export default {
  name: 'unwarn',
  aliases: ['quitaraviso', 'desadvertir'],
  description: 'Remueve una advertencia aplicada a un miembro del grupo.',
  usage: '!unwarn @usuario',
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
        text: '⚠️ Debes etiquetar o responder al mensaje del miembro a quien remover la advertencia.'
      });
      return;
    }

    const cleanTarget = target.split(':')[0].split('@')[0];
    const user = db.getUser(target);

    if (!user.warns || user.warns <= 0) {
      await sock.sendMessage(remoteJid, {
        text: `ℹ️ @${cleanTarget} no tiene ninguna advertencia registrada.`,
        mentions: [target]
      });
      return;
    }

    user.warns = Math.max(0, user.warns - 1);
    db.saveUsers();

    await sock.sendMessage(remoteJid, {
      text: `✅ Se ha removido una advertencia a @${cleanTarget}.\n⚠️ *Advertencias actuales:* ${user.warns}/3`,
      mentions: [target]
    });
  }
};
