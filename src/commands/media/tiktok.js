export default {
  name: 'tiktok',
  aliases: ['tt', 'tik'],
  description: 'Descarga videos de TikTok sin marca de agua.',
  usage: '!tiktok <enlace de TikTok>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes proporcionar un enlace de TikTok.\n*Ejemplo:* `!tiktok https://vm.tiktok.com/...`'
      });
      return;
    }

    const url = args[0];
    if (!url.includes('tiktok.com')) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ El enlace ingresado no pertenece a TikTok.'
      });
      return;
    }

    await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (data.code !== 0 || !data.data) {
        await sock.sendMessage(remoteJid, {
          text: '❌ No se pudo extraer el video de TikTok. Verifica que el video sea público.'
        });
        return;
      }

      const videoUrl = data.data.play;
      const title = data.data.title || 'Video de TikTok';
      const author = data.data.author?.nickname || 'Usuario de TikTok';
      const likes = data.data.digg_count || 0;

      const caption = [
        '🎵 *TIKTOK SIN MARCA DE AGUA*',
        '━━━━━━━━━━━━━━━━━━━━',
        `👤 *Autor:* ${author}`,
        `❤️ *Likes:* ${likes.toLocaleString()}`,
        `📝 *Descripción:* ${title}`,
        '━━━━━━━━━━━━━━━━━━━━'
      ].join('\n');

      await sock.sendMessage(
        remoteJid,
        {
          video: { url: videoUrl },
          caption
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      console.error('[TikTok Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al procesar el video de TikTok.'
      });
    }
  }
};
