import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { imageToWebp } from '../../utils/media.js';

export default {
  name: 'rembg',
  aliases: ['quitarfondo', 'nobg'],
  description: 'Remueve automáticamente el fondo de una imagen dejando un PNG transparente o sticker.',
  usage: '!rembg (respondiendo a una imagen)',
  category: 'media',
  async execute({ sock, remoteJid, quotedMsg, msg }) {
    const imageNode = quotedMsg?.imageMessage || msg.message?.imageMessage;

    if (!imageNode) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes responder a una *imagen* con `!rembg` para removerle el fondo.'
      });
      return;
    }

    await sock.sendMessage(remoteJid, { react: { text: '✂️', key: msg.key } });

    try {
      const stream = await downloadContentFromMessage(imageNode, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Convertir a sticker transparente optimizado
      const stickerBuffer = await imageToWebp(buffer);

      await sock.sendMessage(
        remoteJid,
        {
          sticker: stickerBuffer
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, {
        text: '✨ ¡Fondo procesado! Se ha enviado en formato de sticker transparente.'
      });

      await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      console.error('[Rembg Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al procesar el fondo de la imagen.'
      });
    }
  }
};
