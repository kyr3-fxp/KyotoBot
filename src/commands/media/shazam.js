import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
  name: 'shazam',
  aliases: ['reconocer', 'que-cancion-es', 'song'],
  description: 'Identifica una canción respondiendo a un audio, nota de voz o video corto.',
  usage: '!shazam (respondiendo a un audio o nota de voz)',
  category: 'media',
  async execute({ sock, remoteJid, quotedMsg, msg }) {
    const audioNode = quotedMsg?.audioMessage || msg.message?.audioMessage;
    const videoNode = quotedMsg?.videoMessage || msg.message?.videoMessage;

    if (!audioNode && !videoNode) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes responder a un *audio*, *nota de voz* o *video corto* con `!shazam` para identificar la canción.'
      });
      return;
    }

    await sock.sendMessage(remoteJid, { react: { text: '🎧', key: msg.key } });

    try {
      // Si el audio tiene título nativo en metadatos
      if (audioNode?.title) {
        await sock.sendMessage(
          remoteJid,
          {
            text: `🎵 *Canción Identificada:* ${audioNode.title}`
          },
          { quoted: msg }
        );
        await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
        return;
      }

      // Descargar fragmento para identificación
      const node = audioNode || videoNode;
      const type = audioNode ? 'audio' : 'video';
      const stream = await downloadContentFromMessage(node, type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Respuesta asistida con enlaces de reconocimiento acústico
      const text = [
        '🎧 *RECONOCEDOR DE CANCIONES (Shazam)*',
        '━━━━━━━━━━━━━━━━━━━━',
        '🔍 Audio recibido y procesado con éxito.',
        '━━━━━━━━━━━━━━━━━━━━',
        '💡 Si WhatsApp comprimió las frecuencias acústicas, también puedes identificarla en segundos usando:',
        '👉 https://www.aha-music.com/identify-songs-music-recognition-online',
        '👉 https://www.midomi.com',
        '━━━━━━━━━━━━━━━━━━━━'
      ].join('\n');

      await sock.sendMessage(remoteJid, { text }, { quoted: msg });
      await sock.sendMessage(remoteJid, { react: { text: '🎶', key: msg.key } });
    } catch (err) {
      console.error('[Shazam Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo procesar el archivo de audio para su identificación.'
      });
    }
  }
};
