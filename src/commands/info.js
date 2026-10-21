import os from 'os';

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default {
  name: 'info',
  aliases: ['botinfo', 'status'],
  description: 'Muestra estadísticas del sistema y estado del bot.',
  usage: '!info',
  category: 'general',
  async execute({ sock, remoteJid }) {
    const memory = process.memoryUsage();
    const usedRamMb = (memory.rss / (1024 * 1024)).toFixed(2);
    const uptimeStr = formatUptime(process.uptime());
    const platform = `${os.type()} ${os.arch()}`;

    const text = [
      '🤖 *Información del Bot (Kyoto)*',
      '━━━━━━━━━━━━━━━━━━━━',
      `⏱️ *Tiempo en línea:* ${uptimeStr}`,
      `💾 *RAM en uso:* ${usedRamMb} MB`,
      `⚙️ *Node.js:* ${process.version}`,
      `💻 *Plataforma:* ${platform}`,
      `⚡ *Motor:* Baileys Multi-Device (WebSockets)`,
      '━━━━━━━━━━━━━━━━━━━━',
      '✅ Estado: *Estable y Operativo*'
    ].join('\n');

    await sock.sendMessage(remoteJid, { text });
  }
};
