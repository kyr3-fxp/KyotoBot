import { getRandomYandePost } from '../../utils/nsfwHelper.js';
import { downloadMediaBuffer } from '../../utils/media.js';

export default {
  name: 'real',
  aliases: ['nsfwreal', 'cosplay18', 'cosplay'],
  description: 'Envía contenido y fotografía de cosplay en catálogo general NSFW.',
  usage: '!real',
  category: 'nsfw',
  async execute({ sock, remoteJid, msg }) {
    await sock.sendMessage(remoteJid, { react: { text: '🔞', key: msg.key } });

    try {
      const imageUrl = await getRandomYandePost('rating:explicit+cosplay');
      const finalUrl = imageUrl || (await getRandomYandePost('rating:explicit'));

      if (!finalUrl) {
        await sock.sendMessage(remoteJid, {
          text: '❌ No se pudo cargar el recurso.'
        });
        return;
      }

      let imagePayload = { url: finalUrl };
      try {
        imagePayload = await downloadMediaBuffer(finalUrl, 4500);
      } catch (dlErr) {
        console.warn('[Real] Descarga directa falló, usando URL:', dlErr.message);
      }

      await sock.sendMessage(
        remoteJid,
        {
          image: imagePayload,
          caption: '🔞 *Cosplay & Real Model NSFW*'
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
    } catch (err) {
      console.error('[Real Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al cargar la imagen.'
      });
    }
  }
};
