import yts from 'yt-search';

export default {
  name: 'video',
  aliases: ['ytvideo', 'vervideo'],
  description: 'Busca un video en YouTube y genera detalles y enlace de descarga en alta resolución.',
  usage: '!video <nombre del video o enlace>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes ingresar el nombre o enlace del video.\n*Ejemplo:* `!video trailer gta 6`'
      });
      return;
    }

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { react: { text: '🔍', key: msg.key } });

    try {
      const search = await yts(query);
      const video = search.videos[0];

      if (!video) {
        await sock.sendMessage(remoteJid, {
          text: `❌ No se encontraron videos para "*${query}*".`
        });
        return;
      }

      const text = [
        '🎬 *VIDEO DE YOUTUBE*',
        '━━━━━━━━━━━━━━━━━━━━',
        `📌 *Título:* ${video.title}`,
        `👤 *Canal:* ${video.author.name}`,
        `⏱️ *Duración:* ${video.timestamp}`,
        `👁️ *Vistas:* ${video.views.toLocaleString()}`,
        `📅 *Publicado:* ${video.ago}`,
        `🔗 *Ver en YouTube:* ${video.url}`,
        '━━━━━━━━━━━━━━━━━━━━',
        '💡 Usa `!ytmp4 ' + video.url + '` para descargar el archivo de video.'
      ].join('\n');

      if (video.thumbnail) {
        await sock.sendMessage(
          remoteJid,
          {
            image: { url: video.thumbnail },
            caption: text
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(remoteJid, { text }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, { react: { text: '🎥', key: msg.key } });
    } catch (err) {
      console.error('[Video Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al buscar el video en YouTube.'
      });
    }
  }
};
