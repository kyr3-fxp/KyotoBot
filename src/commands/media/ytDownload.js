import yts from 'yt-search';

export default {
  name: 'ytmp3',
  aliases: ['ytmp4', 'descargar'],
  description: 'Proporciona la descarga directa de audio (MP3) o video (MP4) introduciendo el enlace de YouTube.',
  usage: '!ytmp3 <enlace de YouTube> | !ytmp4 <enlace de YouTube>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes proporcionar un enlace válido de YouTube.\n*Ejemplo:* `!ytmp3 https://youtu.be/...` o `!ytmp4 https://youtube.com/watch?v=...`'
      });
      return;
    }

    const url = args[0];
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ El enlace proporcionado no parece ser un enlace válido de YouTube.'
      });
      return;
    }

    await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const search = await yts(url);
      const video = search.videos[0];

      const title = video ? video.title : 'Audio/Video de YouTube';
      const duration = video ? video.timestamp : 'N/A';
      const channel = video ? video.author.name : 'YouTube';

      const downloadAudioLink = `https://api.vevioz.com/api/button/mp3/${video?.videoId || ''}`;
      const downloadVideoLink = `https://api.vevioz.com/api/button/videos/${video?.videoId || ''}`;

      const text = [
        '📥 *DESCARGA DE YOUTUBE*',
        '━━━━━━━━━━━━━━━━━━━━',
        `📌 *Título:* ${title}`,
        `⏱️ *Duración:* ${duration}`,
        `👤 *Canal:* ${channel}`,
        '━━━━━━━━━━━━━━━━━━━━',
        '🔗 *Enlaces rápidos de descarga directa:*',
        `🎧 *Audio MP3:* https://y2mate.nu/es/youtube-to-mp3?q=${encodeURIComponent(url)}`,
        `🎬 *Video MP4:* https://y2mate.is/es/youtube-video-downloader.html?url=${encodeURIComponent(url)}`,
        '━━━━━━━━━━━━━━━━━━━━'
      ].join('\n');

      await sock.sendMessage(remoteJid, { text }, { quoted: msg });
      await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      console.error('[YT Download Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo procesar el enlace de descarga de YouTube.'
      });
    }
  }
};
