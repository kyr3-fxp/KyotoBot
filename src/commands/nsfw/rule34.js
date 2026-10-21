import { searchBooru } from '../../utils/nsfwHelper.js';
import { downloadMediaBuffer } from '../../utils/media.js';

export default {
  name: 'rule34',
  aliases: ['r34'],
  description: 'Realiza búsquedas de imágenes explícitas por etiquetas o personaje.',
  usage: '!rule34 <personaje o etiqueta en inglés>',
  category: 'nsfw',
  async execute({ sock, remoteJid, args, msg }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes ingresar una búsqueda o personaje.\n*Ejemplo:* `!rule34 tsunade` o `!rule34 genshin_impact`'
      });
      return;
    }

    const query = args.join('_').toLowerCase();
    await sock.sendMessage(remoteJid, { react: { text: '🔍', key: msg.key } });

    try {
      const imageUrl = await searchBooru(query, true);

      if (!imageUrl) {
        await sock.sendMessage(remoteJid, {
          text: `❌ No se encontraron resultados para "*${args.join(' ')}*". Intenta con términos o nombres en inglés.`
        });
        return;
      }

      let imagePayload = { url: imageUrl };
      try {
        imagePayload = await downloadMediaBuffer(imageUrl, 4500);
      } catch (dlErr) {
        console.warn('[Rule34] Descarga directa falló, usando URL:', dlErr.message);
      }

      await sock.sendMessage(
        remoteJid,
        {
          image: imagePayload,
          caption: `🔞 *Rule34 Result:* "${args.join(' ')}"`
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
    } catch (err) {
      console.error('[Rule34 Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al buscar en los repositorios booru.'
      });
    }
  }
};
