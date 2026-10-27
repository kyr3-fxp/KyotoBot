import { downloadBaileysMedia } from '../../utils/media.js';

export default {
  name: 'status',
  aliases: ['estado', 'dlstatus', 'verestado'],
  description: 'Descarga y reenvía estados/historias de WhatsApp (texto, imagen, video o audio) al responderles.',
  usage: '!status o !estado (respondiendo a un estado de WhatsApp)',
  category: 'media',
  async execute({ sock, remoteJid, quotedMsg, contextInfo, msg }) {
    if (!quotedMsg) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes responder directamente a un estado o historia de WhatsApp con `!status` o `!estado` para descargarlo.'
      }, { quoted: msg });
      return;
    }

    // Desempaquetar capas posibles
    let inner = quotedMsg;
    if (inner.ephemeralMessage?.message) inner = inner.ephemeralMessage.message;
    if (inner.viewOnceMessage?.message) inner = inner.viewOnceMessage.message;
    if (inner.viewOnceMessageV2?.message) inner = inner.viewOnceMessageV2.message;
    if (inner.documentWithCaptionMessage?.message) inner = inner.documentWithCaptionMessage.message;

    const isStatusContext =
      contextInfo?.remoteJid === 'status@broadcast' ||
      contextInfo?.participant?.includes('status') ||
      Boolean(quotedMsg);

    const textContent =
      inner.conversation ||
      inner.extendedTextMessage?.text ||
      '';

    const imageNode = inner.imageMessage;
    const videoNode = inner.videoMessage;
    const audioNode = inner.audioMessage;

    try {
      await sock.sendMessage(remoteJid, { react: { text: '📥', key: msg.key } });

      // 1. Caso: Estado de Imagen
      if (imageNode) {
        const buffer = await downloadBaileysMedia(imageNode, 'image');
        if (!buffer || buffer.length === 0) throw new Error('Buffer de imagen vacío');

        const caption = imageNode.caption ? `📥 ${imageNode.caption}` : '📥 *Estado descargado con éxito*';
        await sock.sendMessage(
          remoteJid,
          {
            image: buffer,
            caption
          },
          { quoted: msg }
        );
        return;
      }

      // 2. Caso: Estado de Video
      if (videoNode) {
        const buffer = await downloadBaileysMedia(videoNode, 'video');
        if (!buffer || buffer.length === 0) throw new Error('Buffer de video vacío');

        const caption = videoNode.caption ? `📥 ${videoNode.caption}` : '📥 *Estado descargado con éxito*';
        await sock.sendMessage(
          remoteJid,
          {
            video: buffer,
            caption
          },
          { quoted: msg }
        );
        return;
      }

      // 3. Caso: Estado de Audio / Nota de voz
      if (audioNode) {
        const buffer = await downloadBaileysMedia(audioNode, 'audio');
        if (!buffer || buffer.length === 0) throw new Error('Buffer de audio vacío');

        await sock.sendMessage(
          remoteJid,
          {
            audio: buffer,
            mimetype: audioNode.mimetype || 'audio/mp4',
            ptt: audioNode.ptt ?? false
          },
          { quoted: msg }
        );
        return;
      }

      // 4. Caso: Estado de Texto
      if (textContent) {
        await sock.sendMessage(
          remoteJid,
          {
            text: `📝 *Texto del Estado:*\n\n${textContent}`
          },
          { quoted: msg }
        );
        return;
      }

      await sock.sendMessage(remoteJid, {
        text: '⚠️ No se encontró contenido multimedia ni texto descargable en el estado citado.'
      }, { quoted: msg });
    } catch (err) {
      console.error('[Status Download Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al descargar el estado. Es posible que el contenido haya expirado.'
      }, { quoted: msg });
    }
  }
};
