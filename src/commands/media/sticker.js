import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { imageToWebp, videoToWebp } from '../../utils/media.js';

export default {
  name: 'sticker',
  aliases: ['s', 'stiker'],
  description: 'Convierte una imagen, GIF o video corto en un sticker de WhatsApp.',
  usage: '!s (respondiendo a una imagen o enviándola con el comando)',
  category: 'media',
  async execute({ sock, msg, remoteJid, quotedMsg }) {
    try {
      const targetMessage = quotedMsg || msg.message;
      const imageNode = targetMessage.imageMessage;
      const videoNode = targetMessage.videoMessage;

      if (!imageNode && !videoNode) {
        await sock.sendMessage(remoteJid, {
          text: '⚠️ Debes enviar o responder a una *imagen* o *video corto* con `!s`.'
        });
        return;
      }

      await sock.sendMessage(remoteJid, {
        react: { text: '⏳', key: msg.key }
      });

      if (imageNode) {
        const stream = await downloadContentFromMessage(imageNode, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        const stickerWebp = await imageToWebp(buffer);
        await sock.sendMessage(remoteJid, { sticker: stickerWebp }, { quoted: msg });
        await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
      } else if (videoNode) {
        if (videoNode.seconds > 10) {
          await sock.sendMessage(remoteJid, {
            text: '⚠️ El video debe durar un máximo de 10 segundos para convertirse en sticker.'
          });
          return;
        }

        const stream = await downloadContentFromMessage(videoNode, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        const stickerWebp = await videoToWebp(buffer);
        await sock.sendMessage(remoteJid, { sticker: stickerWebp }, { quoted: msg });
        await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
      }
    } catch (err) {
      console.error('[Sticker Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo crear el sticker. Asegúrate de que el archivo multimedia sea compatible.'
      });
    }
  }
};
