export default {
  name: 'ia',
  aliases: ['gpt', 'chatgpt', 'ai', 'bot'],
  description: 'Realiza consultas directas a un modelo de inteligencia artificial.',
  usage: '!ia <pregunta o indicación>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes escribir una consulta para la inteligencia artificial.\n*Ejemplo:* `!ia Explícame la teoría de la relatividad en 2 párrafos`'
      });
      return;
    }

    const prompt = args.join(' ');
    await sock.sendMessage(remoteJid, { react: { text: '🧠', key: msg.key } });

    try {
      const systemInstruction = encodeURIComponent(
        'Eres KyotoBot, un asistente de WhatsApp amigable, conciso, útil e inteligente en español.'
      );
      const encodedPrompt = encodeURIComponent(prompt);
      const url = `https://text.pollinations.ai/${encodedPrompt}?system=${systemInstruction}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const answer = await res.text();

      const text = [
        '🤖 *RESPUESTA DE IA (KyotoBot)*',
        '━━━━━━━━━━━━━━━━━━━━',
        answer.trim(),
        '━━━━━━━━━━━━━━━━━━━━'
      ].join('\n');

      await sock.sendMessage(remoteJid, { text }, { quoted: msg });
      await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
    } catch (err) {
      console.error('[IA Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al consultar el modelo de inteligencia artificial.'
      });
    }
  }
};
