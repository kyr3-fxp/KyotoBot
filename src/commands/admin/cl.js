import { checkGroupAdmin, isUserMatch } from '../../utils/permissions.js';

export default {
  name: 'cl',
  aliases: [],
  description: 'Expulsa a todos los integrantes del grupo, incluidos los administradores.',
  usage: '!cl all',
  category: 'admin',
  async execute({ sock, remoteJid, sender, args, msg, m, isFromMe, prefix = '!' }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    const action = (args[0] || '').toLowerCase();

    if (action !== 'all') {
      await sock.sendMessage(remoteJid, {
        text: `⚠️ Uso: *${prefix}cl all*`
      });
      return;
    }

    // Refresh metadata immediately before acting and always keep the bot in the group.
    const metadata = await sock.groupMetadata(remoteJid);
    const botId = sock?.user?.id || sock?.user?.jid || '';
    const eligible = (metadata?.participants || []).filter(p =>
      p.id &&
      !isUserMatch(p, botId, sock?.user?.lid)
    );

    if (eligible.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: 'ℹ️ No hay otros integrantes que se puedan expulsar.'
      });
      return;
    }

    await sock.sendMessage(remoteJid, {
      text: `⏳ Intentando expulsar a ${eligible.length} integrante(s)…`
    });

    try {
      const result = await sock.groupParticipantsUpdate(
        remoteJid,
        eligible.map(p => p.id),
        'remove'
      );
      const successCount = Array.isArray(result)
        ? result.filter(item => item.status === '200').length
        : 0;
      const failureCount = eligible.length - successCount;
      await sock.sendMessage(remoteJid, {
        text: failureCount
          ? `⚠️ Acción finalizada: ${successCount} expulsado(s); ${failureCount} no se pudieron expulsar. Revisa los permisos y el estado del grupo.`
          : `✅ Acción finalizada: ${successCount} integrante(s) expulsado(s). El bot permanece en el grupo.`
      });
    } catch (err) {
      console.error('[CL Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo completar la expulsión masiva. Verifica que el bot siga siendo administrador.'
      });
    }
  }
};
