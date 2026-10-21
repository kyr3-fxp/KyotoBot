import { checkGroupAdmin } from '../../utils/permissions.js';
import { db } from '../../database.js';

export default {
  name: 'warn',
  aliases: ['advertir', 'aviso'],
  description: 'Aplica una advertencia a un miembro (al acumular 3 advertencias es expulsado automáticamente).',
  usage: '!warn @usuario [motivo opcional]',
  category: 'admin',
  async execute({ sock, remoteJid, sender, mentions, quotedParticipant, args, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe, requireBotAdmin: false });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    const target = quotedParticipant || (mentions && mentions.length > 0 ? mentions[0] : null);

    if (!target) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes etiquetar o responder al mensaje del miembro a advertir.\n*Ejemplo:* `!warn @usuario spam`'
      });
      return;
    }

    const cleanTarget = target.split(':')[0].split('@')[0];
    const user = db.getUser(target);
    const reason = args.filter(a => !a.includes('@')).join(' ') || 'Incumplimiento de normas';

    user.warns = (user.warns || 0) + 1;
    db.saveUsers();

    if (user.warns >= 3) {
      user.warns = 0;
      db.saveUsers();

      try {
        await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
        await sock.sendMessage(remoteJid, {
          text: `🚨 @${cleanTarget} ha acumulado *3/3 advertencias* y ha sido expulsado automáticamente del grupo.`,
          mentions: [target]
        });
      } catch (kickErr) {
        console.error('[Warn Kick Error]', kickErr);
        await sock.sendMessage(remoteJid, {
          text: `🚨 @${cleanTarget} acumuló 3 advertencias, pero el bot no tiene permisos suficientes para expulsarlo.`,
          mentions: [target]
        });
      }
    } else {
      await sock.sendMessage(remoteJid, {
        text: `⚠️ *ADVERTENCIA APLICADA*\n━━━━━━━━━━━━━━━━━━━━\n👤 *Usuario:* @${cleanTarget}\n⚠️ *Advertencias:* ${user.warns}/3\n📝 *Motivo:* ${reason}\n━━━━━━━━━━━━━━━━━━━━\n📌 Al acumular 3 advertencias serás expulsado.`,
        mentions: [target]
      });
    }
  }
};
