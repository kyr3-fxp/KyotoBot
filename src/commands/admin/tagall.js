import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'tagall',
  aliases: ['todos', 'invocar', 'mencionartodos'],
  description: 'Mención masiva a todos los integrantes del grupo.',
  usage: '!tagall [mensaje opcional]',
  category: 'admin',
  async execute({ sock, remoteJid, sender, args, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe, requireBotAdmin: false });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    const participants = perm.participants || [];
    const customMessage = args.length > 0 ? args.join(' ') : '¡Atención a todos los miembros!';

    const mentions = [];
    const lines = [];

    for (const p of participants) {
      const clean = p.id.split(':')[0].split('@')[0];
      mentions.push(p.id);
      lines.push(`• @${clean}`);
    }

    const text = [
      '📢 *LLAMADO GENERAL*',
      '━━━━━━━━━━━━━━━━━━━━',
      `💬 *Mensaje:* ${customMessage}`,
      '━━━━━━━━━━━━━━━━━━━━',
      ...lines,
      '━━━━━━━━━━━━━━━━━━━━'
    ].join('\n');

    await sock.sendMessage(remoteJid, {
      text,
      mentions
    });
  }
};
