import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { webpToVideo } from '../../utils/media.js';

export default {
  name: 'tovideo',
  aliases: ['tomp4', 'togif'],
  description: 'Convierte un sticker animado en un video MP4 reproducible.',
  usage: '!tovideo (respondiendo a un sticker animado)',
  category: 'media',
  async execute({ sock, msg, remoteJid, quotedMsg }) {
    const stickerNode = quotedMsg?.stickerMessage || msg.message?.stickerMessage;

    if (!stickerNode) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes responder a un *sticker animado* con `!tovideo`.'
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

      const mp4Buffer = await webpToVideo(buffer);

      await sock.sendMessage(
        remoteJid,
        {
          video: mp4Buffer,
          caption: '🎥 Aquí tienes tu video convertido desde sticker animado.',
          gifPlayback: true
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      console.error('[ToVideo Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al convertir el sticker animado a video.'
      });
    }
  }
};
