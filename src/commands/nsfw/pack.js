import { getRandomYandePost } from '../../utils/nsfwHelper.js';
import { downloadMediaBuffer } from '../../utils/media.js';

export default {
  name: 'pack',
  aliases: ['packs', 'galeria18'],
  description: 'Envía un recurso multimedia aleatorio dentro de la categoría para adultos.',
  usage: '!pack',
  category: 'nsfw',
  async execute({ sock, remoteJid, msg }) {
    await sock.sendMessage(remoteJid, { react: { text: '📦', key: msg.key } });

    try {
      const imageUrl = await getRandomYandePost('rating:explicit');

      if (!imageUrl) {
        await sock.sendMessage(remoteJid, {
          text: '❌ No se pudo cargar el pack en este momento.'
        });
        return;
      }

      let imagePayload = { url: imageUrl };
      try {
        imagePayload = await downloadMediaBuffer(imageUrl, 4500);
      } catch (dlErr) {
        console.warn('[Pack] Descarga directa falló, usando URL:', dlErr.message);
      }

      await sock.sendMessage(
        remoteJid,
        {
          image: imagePayload,
          caption: '📦 *Pack Sorpresa NSFW (KyotoBot)*'
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '🔥', key: msg.key } });
    } catch (err) {
      console.error('[Pack Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al cargar el pack.'
      });
    }
  }
};
