import { getRandomYandePost } from '../../utils/nsfwHelper.js';
import { downloadMediaBuffer } from '../../utils/media.js';

export default {
  name: 'waifu',
  aliases: ['waifunsfw'],
  description: 'Genera variantes de waifus en categorías +18.',
  usage: '!waifu [nsfw]',
  category: 'nsfw',
  async execute({ sock, remoteJid, msg }) {
    await sock.sendMessage(remoteJid, { react: { text: '💖', key: msg.key } });

    try {
      const imageUrl = await getRandomYandePost('rating:explicit+1girl');

      if (!imageUrl) {
        await sock.sendMessage(remoteJid, {
          text: '❌ No se encontró una imagen disponible en este momento.'
        });
        return;
      }

      let imagePayload = { url: imageUrl };
      try {
        imagePayload = await downloadMediaBuffer(imageUrl, 4500);
      } catch (dlErr) {
        console.warn('[Waifu] Descarga directa falló, usando URL:', dlErr.message);
      }

      await sock.sendMessage(
        remoteJid,
        {
          image: imagePayload,
          caption: '💖 *Waifu NSFW Edition (KyotoBot)*'
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
    } catch (err) {
      console.error('[Waifu Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al obtener la waifu.'
      });
    }
  }
};
