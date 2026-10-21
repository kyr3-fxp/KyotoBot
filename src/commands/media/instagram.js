export default {
  name: 'ig',
  aliases: ['instagram', 'reels'],
  description: 'Descarga publicaciones, Reels o historias públicas de Instagram.',
  usage: '!ig <enlace de Instagram>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes proporcionar un enlace de Instagram.\n*Ejemplo:* `!ig https://www.instagram.com/reel/...`'
      });
      return;
    }

    const url = args[0];
    if (!url.includes('instagram.com')) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ El enlace ingresado no pertenece a Instagram.'
      });
      return;
    }

    await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      // Intentar API pública rápida de SnapInsta/FastDL
      const fastUrl = `https://fastdl.to/api/ig?url=${encodeURIComponent(url)}`;
      const res = await fetch(fastUrl).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.url) {
          await sock.sendMessage(
            remoteJid,
            {
              video: { url: data.url },
              caption: '📸 Aquí tienes tu video/reel de Instagram.'
            },
            { quoted: msg }
          );
          await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
          return;
        }
      }

      // Si la API directa falla o tiene captcha, entregar enlace de extracción instantánea
      const helperText = [
        '📸 *DESCARGADOR DE INSTAGRAM*',
        '━━━━━━━━━━━━━━━━━━━━',
        '🔗 *Descarga directa en línea:*',
        `👉 https://snapinsta.app/es?url=${encodeURIComponent(url)}`,
        `👉 https://fastdl.app/es?url=${encodeURIComponent(url)}`,
        '━━━━━━━━━━━━━━━━━━━━',
        '💡 Haz clic en cualquiera de los enlaces para guardar tu publicación o reel en máxima resolución.'
      ].join('\n');

      await sock.sendMessage(remoteJid, { text: helperText }, { quoted: msg });
      await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      console.error('[Instagram Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al procesar el enlace de Instagram.'
      });
    }
  }
};
