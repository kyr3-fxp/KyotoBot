import { downloadBaileysMedia } from '../../utils/media.js';

export default {
  name: 'viewonce',
  aliases: ['r', 'vv', 'revelar', 'readviewonce'],
  description: 'Revela y reenvía imágenes, videos o audios enviados como "Ver una sola vez".',
  usage: '!r o !vv (respondiendo al mensaje de una sola vista)',
  category: 'media',
  async execute({ sock, remoteJid, quotedMsg, msg }) {
    const targetMsg = quotedMsg || msg.message;

    if (!targetMsg) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes responder directamente a un mensaje de "Ver una sola vez" con `!r` o `!vv`.'
      }, { quoted: msg });
      return;
    }

    // Desempaquetar capas internas de ViewOnce
    let inner = targetMsg;
    if (inner.ephemeralMessage?.message) inner = inner.ephemeralMessage.message;
    if (inner.viewOnceMessage?.message) inner = inner.viewOnceMessage.message;
    if (inner.viewOnceMessageV2?.message) inner = inner.viewOnceMessageV2.message;
    if (inner.viewOnceMessageV2Extension?.message) inner = inner.viewOnceMessageV2Extension.message;
    if (inner.documentWithCaptionMessage?.message) inner = inner.documentWithCaptionMessage.message;

    const imageNode = inner.imageMessage;
    const videoNode = inner.videoMessage;
    const audioNode = inner.audioMessage;

    if (!imageNode && !videoNode && !audioNode) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ El mensaje citado no contiene contenido multimedia de "Ver una sola vez".'
      }, { quoted: msg });
      return;
    }

    try {
      await sock.sendMessage(remoteJid, { react: { text: '🔓', key: msg.key } });

      if (imageNode) {
        const buffer = await downloadBaileysMedia(imageNode, 'image');
        if (!buffer || buffer.length === 0) throw new Error('Buffer de imagen vacío');

        const caption = imageNode.caption ? `🔓 ${imageNode.caption}` : '🔓 *Contenido revelado (Ver una sola vez)*';
        await sock.sendMessage(
          remoteJid,
          {
            image: buffer,
            caption
          },
          { quoted: msg }
        );
      } else if (videoNode) {
        const buffer = await downloadBaileysMedia(videoNode, 'video');
        if (!buffer || buffer.length === 0) throw new Error('Buffer de video vacío');

        const caption = videoNode.caption ? `🔓 ${videoNode.caption}` : '🔓 *Contenido revelado (Ver una sola vez)*';
        await sock.sendMessage(
          remoteJid,
          {
            video: buffer,
            caption
          },
          { quoted: msg }
        );
      } else if (audioNode) {
        const buffer = await downloadBaileysMedia(audioNode, 'audio');
        if (!buffer || buffer.length === 0) throw new Error('Buffer de audio vacío');

        await sock.sendMessage(
          remoteJid,
          {
            audio: buffer,
            mimetype: audioNode.mimetype || 'audio/ogg; codecs=opus',
            ptt: audioNode.ptt ?? true
          },
          { quoted: msg }
        );
      }
    } catch (err) {
      console.error('[ViewOnce Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo revelar el contenido de "Ver una sola vez". Es posible que los datos multimedia hayan caducado en los servidores de WhatsApp.'
      }, { quoted: msg });
    }
  }
};
