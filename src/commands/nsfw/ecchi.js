import { getRandomYandePost } from '../../utils/nsfwHelper.js';
import { downloadMediaBuffer } from '../../utils/media.js';

export default {
  name: 'ecchi',
  aliases: ['erotico', 'soft'],
  description: 'Muestra imágenes de tono sugerente o erótico suave (ecchi).',
  usage: '!ecchi',
  category: 'nsfw',
  async execute({ sock, remoteJid, msg }) {
    await sock.sendMessage(remoteJid, { react: { text: '😳', key: msg.key } });

    try {
      const imageUrl = await getRandomYandePost('rating:questionable');

      if (!imageUrl) {
        await sock.sendMessage(remoteJid, {
          text: '❌ No se pudo cargar la imagen ecchi en este momento.'
        });
        return;
      }

      let imagePayload = { url: imageUrl };
      try {
        imagePayload = await downloadMediaBuffer(imageUrl, 4500);
      } catch (dlErr) {
        console.warn('[Ecchi] Descarga directa falló, usando URL:', dlErr.message);
      }

      await sock.sendMessage(
        remoteJid,
        {
          image: imagePayload,
          caption: '😳 *Ecchi & Sugerente (KyotoBot)*'
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
    } catch (err) {
      console.error('[Ecchi Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al cargar la imagen ecchi.'
      });
    }
  }
};
