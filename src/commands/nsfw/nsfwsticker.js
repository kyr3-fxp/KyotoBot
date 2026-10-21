import { getRandomYandePost } from '../../utils/nsfwHelper.js';
import { imageToWebp } from '../../utils/media.js';

export default {
  name: 'nsfwsticker',
  aliases: ['stickernsfw', 's18'],
  description: 'Convierte imágenes de la categoría NSFW directamente a formato sticker de WhatsApp.',
  usage: '!nsfwsticker',
  category: 'nsfw',
  async execute({ sock, remoteJid, msg }) {
    await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const imageUrl = await getRandomYandePost('rating:explicit');

      if (!imageUrl) {
        await sock.sendMessage(remoteJid, {
          text: '❌ No se pudo obtener la imagen para el sticker.'
        });
        return;
      }

      const res = await fetch(imageUrl);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const stickerWebp = await imageToWebp(buffer);

      await sock.sendMessage(
        remoteJid,
        {
          sticker: stickerWebp
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '🔥', key: msg.key } });
    } catch (err) {
      console.error('[NsfwSticker Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al generar el sticker NSFW.'
      });
    }
  }
};
