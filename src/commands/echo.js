export default {
  name: 'echo',
  aliases: ['say', 'repetir'],
  description: 'Repite el mensaje proporcionado por el usuario.',
  usage: '!echo <texto a repetir>',
  category: 'general',
  async execute({ sock, remoteJid, args }) {
    if (!args || args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes ingresar un texto para que lo repita.\n*Ejemplo:* `!echo Hola mundo`'
      });
      return;
    }

    const messageToEcho = args.join(' ');
    await sock.sendMessage(remoteJid, {
      text: `📢 ${messageToEcho}`
    });
  }
};
