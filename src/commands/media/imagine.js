export default {
  name: 'imagine',
  aliases: ['dall-e', 'dalle', 'generar', 'draw'],
  description: 'Genera imágenes artísticas y realistas a partir de descripciones de texto usando IA.',
  usage: '!imagine <descripción de la imagen>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes escribir una descripción para la imagen.\n*Ejemplo:* `!imagine un gato astronauta explorando marte estilo cyberpunk`'
      });
      return;
    }

    const prompt = args.join(' ');
    await sock.sendMessage(remoteJid, { react: { text: '🎨', key: msg.key } });

    try {
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=1024&height=1024&nologo=true`;

      const caption = [
        '🎨 *IMAGEN GENERADA POR IA*',
        '━━━━━━━━━━━━━━━━━━━━',
        `💡 *Prompt:* "${prompt}"`,
        '━━━━━━━━━━━━━━━━━━━━'
      ].join('\n');

      await sock.sendMessage(
        remoteJid,
        {
          image: { url: imageUrl },
          caption
        },
        { quoted: msg }
      );

      await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
    } catch (err) {
      console.error('[Imagine Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al generar la imagen con inteligencia artificial.'
      });
    }
  }
};
