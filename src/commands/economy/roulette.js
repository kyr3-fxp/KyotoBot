import { db } from '../../database.js';

export default {
  name: 'roulette',
  aliases: ['ruleta'],
  description: 'Juego de ruleta para duplicar o multiplicar apuestas (rojo/negro/verde).',
  usage: '!roulette <rojo|negro|verde> <monto>',
  category: 'economy',
  async execute({ sock, remoteJid, sender, cleanSender, args }) {
    if (args.length < 2) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Formato incorrecto.\n*Uso:* `!roulette <rojo|negro|verde> <monto>`\n*Ejemplo:* `!roulette rojo 200`\n\n📌 *Pagos:* Rojo/Negro pagan x2 | Verde (0) paga x14'
      });
      return;
    }

    const choice = args[0].toLowerCase();
    const validChoices = ['rojo', 'negro', 'verde', 'red', 'black', 'green'];
    if (!validChoices.includes(choice)) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes elegir un color válido: *rojo*, *negro* o *verde*.'
      });
      return;
    }

    const bet = parseInt(args[1], 10);
    if (!bet || isNaN(bet) || bet <= 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Ingresa un monto de apuesta válido.'
      });
      return;
    }

    const user = db.getUser(sender);
    if ((user.wallet || 0) < bet) {
      await sock.sendMessage(remoteJid, {
        text: `❌ Saldo insuficiente en mano ($${user.wallet || 0}).`
      });
      return;
    }

    user.wallet -= bet;

    // Número de ruleta del 0 al 36
    const roll = Math.floor(Math.random() * 37);
    let landedColor = '';

    if (roll === 0) {
      landedColor = 'verde';
    } else if (
      [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(roll)
    ) {
      landedColor = 'rojo';
    } else {
      landedColor = 'negro';
    }

    const normalizedChoice =
      choice === 'red' ? 'rojo' : choice === 'black' ? 'negro' : choice === 'green' ? 'verde' : choice;

    const isWin = normalizedChoice === landedColor;
    let multiplier = 0;

    if (isWin) {
      multiplier = landedColor === 'verde' ? 14 : 2;
    }

    const wonAmount = bet * multiplier;
    let resultMsg = '';

    if (isWin) {
      user.wallet += wonAmount;
      resultMsg = `🎉 ¡ACERTASTE! La bola cayó en *${roll} (${landedColor.toUpperCase()})*!\n💵 Ganancia: *$${wonAmount}* monedas`;
    } else {
      resultMsg = `😿 La bola cayó en *${roll} (${landedColor.toUpperCase()})*.\nPerdiste *$${bet}* monedas.`;
    }

    db.saveUsers();

    const colorEmoji = landedColor === 'rojo' ? '🔴' : landedColor === 'negro' ? '⚫' : '🟢';

    const text = [
      '🎡 *RULETA DE CASINO*',
      '━━━━━━━━━━━━━━━━━━━━',
      `🎲 Resultado: ${colorEmoji} *${roll} (${landedColor})*`,
      '━━━━━━━━━━━━━━━━━━━━',
      resultMsg,
      `💰 Saldo actual: *$${user.wallet}*`
    ].join('\n');

    await sock.sendMessage(remoteJid, {
      text,
      mentions: [sender]
    });
  }
};
