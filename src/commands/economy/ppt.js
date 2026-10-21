import { db } from '../../database.js';

const CHOICES = ['piedra', 'papel', 'tijera'];
const EMOJIS = {
  piedra: '🪨 Piedra',
  papel: '📄 Papel',
  tijera: '✂️ Tijera'
};

export default {
  name: 'ppt',
  aliases: ['rps'],
  description: 'Juega a Piedra, Papel o Tijera contra el bot (con apuesta opcional).',
  usage: '!ppt <piedra|papel|tijera> [monto apuesta]',
  category: 'economy',
  async execute({ sock, remoteJid, sender, cleanSender, args }) {
    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes elegir tu jugada.\n*Uso:* `!ppt <piedra|papel|tijera> [monto]`\n*Ejemplo:* `!ppt piedra 100`'
      });
      return;
    }

    const userChoice = args[0].toLowerCase();
    if (!CHOICES.includes(userChoice)) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Opción inválida. Elige: *piedra*, *papel* o *tijera*.'
      });
      return;
    }

    const bet = args[1] ? parseInt(args[1], 10) : 0;
    const user = db.getUser(sender);

    if (bet > 0 && (user.wallet || 0) < bet) {
      await sock.sendMessage(remoteJid, {
        text: `❌ Saldo insuficiente en mano ($${user.wallet || 0}).`
      });
      return;
    }

    const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];

    let result = ''; // 'win', 'lose', 'draw'
    if (userChoice === botChoice) {
      result = 'draw';
    } else if (
      (userChoice === 'piedra' && botChoice === 'tijera') ||
      (userChoice === 'papel' && botChoice === 'piedra') ||
      (userChoice === 'tijera' && botChoice === 'papel')
    ) {
      result = 'win';
    } else {
      result = 'lose';
    }

    let betMsg = '';
    if (bet > 0) {
      if (result === 'win') {
        user.wallet += bet;
        betMsg = `\n💵 ¡Ganaste *$${bet}* monedas!`;
      } else if (result === 'lose') {
        user.wallet -= bet;
        betMsg = `\n💸 Perdiste *$${bet}* monedas.`;
      } else {
        betMsg = '\n🤝 Empate: Tu apuesta te fue devuelta.';
      }
      db.saveUsers();
    }

    const outcomeText =
      result === 'win'
        ? '🎉 *¡Ganaste!*'
        : result === 'lose'
        ? '🤖 *¡El bot gana!*'
        : '🤝 *¡Empate!*';

    const text = [
      '🎮 *PIEDRA, PAPEL O TIJERA*',
      '━━━━━━━━━━━━━━━━━━━━',
      `👤 Tu elección: ${EMOJIS[userChoice]}`,
      `🤖 Elección del Bot: ${EMOJIS[botChoice]}`,
      '━━━━━━━━━━━━━━━━━━━━',
      `${outcomeText}${betMsg}`
    ].join('\n');

    await sock.sendMessage(remoteJid, {
      text,
      mentions: [sender]
    });
  }
};
