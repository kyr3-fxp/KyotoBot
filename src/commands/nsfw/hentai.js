import { getRandomYandePost } from '../../utils/nsfwHelper.js';
import { downloadMediaBuffer } from '../../utils/media.js';

export default {
  name: 'hentai',
  aliases: ['anime18'],
  description: 'Envía imágenes de arte anime NSFW aleatorias de alta resolución.',
  usage: '!hentai',
  category: 'nsfw',
  async execute({ sock, remoteJid, msg }) {
    await sock.sendMessage(remoteJid, { react: { text: '🔞', key: msg.key } });

    try {
      const imageUrl = await getRandomYandePost('rating:explicit');

      if (!imageUrl) {
        await sock.sendMessage(remoteJid, {
          text: '❌ No se pudo cargar el recurso. Intenta de nuevo en unos segundos.'
        });
        return;
      }

      let imagePayload = { url: imageUrl };
      try {
        imagePayload = await downloadMediaBuffer(imageUrl, 4500);
      } catch (dlErr) {
        console.warn('[Hentai] Descarga directa falló, usando URL:', dlErr.message);
      }

      await sock.sendMessage(
        remoteJid,
        {
          image: imagePayload,
          caption: '🔞 *Hentai Gallery (KyotoBot)*'
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
    } catch (err) {
      console.error('[Hentai Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al cargar la imagen.'
      });
    }
  }
};
