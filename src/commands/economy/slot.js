import { db } from '../../database.js';

const SLOTS = ['🍒', '🍋', '🍇', '🔔', '7️⃣', '💎'];

export default {
  name: 'slot',
  aliases: ['tragamonedas', 'apuesta'],
  description: 'Tragamonedas clásico para apostar dinero virtual.',
  usage: '!slot <monto>',
  category: 'economy',
  async execute({ sock, remoteJid, sender, cleanSender, args }) {
    const bet = parseInt(args[0], 10);

    if (!bet || isNaN(bet) || bet <= 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes ingresar un monto válido para apostar.\n*Ejemplo:* `!slot 100`'
      });
      return;
    }

    const user = db.getUser(sender);

    if ((user.wallet || 0) < bet) {
      await sock.sendMessage(remoteJid, {
        text: `❌ No tienes suficiente saldo en mano. Tienes *$${user.wallet || 0}* e intentas apostar *$${bet}*.`
      });
      return;
    }

    // Descontar apuesta
    user.wallet -= bet;

    // Generar 3 slots aleatorios
    const r1 = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const r2 = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const r3 = SLOTS[Math.floor(Math.random() * SLOTS.length)];

    let winMultiplier = 0;
    let winType = '';

    if (r1 === r2 && r2 === r3) {
      if (r1 === '💎' || r1 === '7️⃣') {
        winMultiplier = 10;
        winType = 'JACKPOT ÉPICO (x10)';
      } else {
        winMultiplier = 5;
        winType = 'TRIPLE COINCIDENCIA (x5)';
      }
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      winMultiplier = 2;
      winType = 'DOBLE COINCIDENCIA (x2)';
    }

    const wonAmount = bet * winMultiplier;
    let resultMessage = '';

    if (winMultiplier > 0) {
      user.wallet += wonAmount;
      resultMessage = `🎉 ¡GANASTE! ${winType}\n💵 Premio: *$${wonAmount}* monedas`;
    } else {
      resultMessage = `😿 Mala suerte, perdiste *$${bet}* monedas.`;
    }

    db.saveUsers();

    const text = [
      '🎰 *TRAGAMONEDAS KYOTO* 🎰',
      '━━━━━━━━━━━━━━━━━━',
      `       [ ${r1} ┃ ${r2} ┃ ${r3} ]`,
      '━━━━━━━━━━━━━━━━━━',
      resultMessage,
      `💰 Saldo actual: *$${user.wallet}*`
    ].join('\n');

    await sock.sendMessage(remoteJid, {
      text,
      mentions: [sender]
    });
  }
};
