export default {
  name: 'ping',
  aliases: ['p'],
  description: 'Verifica si el bot responde y calcula la latencia de respuesta.',
  usage: '!ping',
  category: 'general',
  async execute({ sock, remoteJid, startTimestamp }) {
    const latency = Date.now() - startTimestamp;
    await sock.sendMessage(remoteJid, {
      text: `Pong! 🏓\n⏱️ Latencia: *${latency} ms*`
    });
  }
};
