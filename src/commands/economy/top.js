import { db } from '../../database.js';

export default {
  name: 'top',
  aliases: ['lb', 'leaderboard', 'ricos'],
  description: 'Muestra la tabla de clasificación de los usuarios con más dinero.',
  usage: '!top',
  category: 'economy',
  async execute({ sock, remoteJid }) {
    const topUsers = db.getTopUsers(10);

    if (topUsers.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '📉 Aún no hay registros económicos en el bot.'
      });
      return;
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const mentions = [];

    const lines = topUsers.map((u, i) => {
      const clean = u.jid.split(':')[0].split('@')[0];
      mentions.push(u.jid);
      return `${medals[i] || '▫️'} @${clean} — *$${u.total}* (Nvl ${u.level})`;
    });

    const text = [
      '🏆 *TABLA DE CLASIFICACIÓN ECONÓMICA*',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      ...lines,
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      '💡 Trabaja y apuesta para subir en el ranking.'
    ].join('\n');

    await sock.sendMessage(remoteJid, {
      text,
      mentions
    });
  }
};
