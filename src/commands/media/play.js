import yts from 'yt-search';

export default {
  name: 'play',
  aliases: ['cancion', 'musica', 'audio'],
  description: 'Busca una canción en YouTube y muestra su información y enlace de descarga.',
  usage: '!play <nombre de la canción o enlace>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes ingresar el nombre de la canción o el enlace de YouTube.\n*Ejemplo:* `!play Alan Walker Faded`'
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
          text: `❌ No se encontraron resultados en YouTube para "*${query}*".`
        });
        return;
      }

      const text = [
        '🎵 *REPRODUCTOR DE MÚSICA KYOTO*',
        '━━━━━━━━━━━━━━━━━━━━',
        `📌 *Título:* ${video.title}`,
        `👤 *Canal:* ${video.author.name}`,
        `⏱️ *Duración:* ${video.timestamp}`,
        `👁️ *Vistas:* ${video.views.toLocaleString()}`,
        `🔗 *Enlace:* ${video.url}`,
        '━━━━━━━━━━━━━━━━━━━━',
        '💡 Usa `!ytmp3 ' + video.url + '` para descargar el archivo de audio directo.'
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

      await sock.sendMessage(remoteJid, { react: { text: '🎶', key: msg.key } });
    } catch (err) {
      console.error('[Play Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al buscar la canción en YouTube.'
      });
    }
  }
};
