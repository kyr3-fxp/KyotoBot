import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { webpToPng } from '../../utils/media.js';

export default {
  name: 'toimg',
  aliases: ['a広imagen', 'toimage'],
  description: 'Convierte un sticker estático de vuelta a formato de imagen PNG.',
  usage: '!toimg (respondiendo a un sticker estático)',
  category: 'media',
  async execute({ sock, msg, remoteJid, quotedMsg }) {
    const stickerNode = quotedMsg?.stickerMessage || msg.message?.stickerMessage;

    if (!stickerNode) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes responder a un *sticker* con `!toimg` para convertirlo a imagen.'
      });
      return;
    }

    if (stickerNode.isAnimated) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Este sticker es animado. Usa `!tovideo` para stickers animados.'
      });
      return;
    }

    try {
      await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } });

      const stream = await downloadContentFromMessage(stickerNode, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const pngBuffer = await webpToPng(buffer);

      await sock.sendMessage(
        remoteJid,
        {
          image: pngBuffer,
          caption: '🖼️ Aquí tienes tu imagen convertida desde sticker.'
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      console.error('[ToImg Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al convertir el sticker a imagen.'
      });
    }
  }
};
