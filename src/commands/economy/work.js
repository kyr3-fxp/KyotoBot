import { db } from '../../database.js';

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos

const WORK_MESSAGES = [
  'Trabajaste como desarrollador web y ganaste',
  'Repartiste pedidos en bicicleta y ganaste',
  'Ayudaste a reparar computadoras y cobraste',
  'Hiciste horas extras en la oficina y recibiste',
  'Vendiste postres caseros y recaudaste',
  'Trabajaste de mesero en un restaurante concurrido y recibiste'
];

export default {
  name: 'work',
  aliases: ['trabajar', 'chambear'],
  description: 'Trabaja para ganar monedas del bot y subir de nivel.',
  usage: '!work',
  category: 'economy',
  async execute({ sock, remoteJid, sender, cleanSender }) {
    const user = db.getUser(sender);
    const now = Date.now();

    if (now - user.lastWork < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (now - user.lastWork);
      const mins = Math.ceil(remainingMs / (60 * 1000));
      await sock.sendMessage(remoteJid, {
        text: `⏳ @${cleanSender}, estás cansado. Podrás volver a trabajar en *${mins} minuto(s)*.`,
        mentions: [sender]
      });
      return;
    }

    const earned = Math.floor(Math.random() * 350) + 150; // $150 - $500
    const expEarned = 50;

    user.wallet = (user.wallet || 0) + earned;
    user.exp = (user.exp || 0) + expEarned;
    user.lastWork = now;

    // Subida de nivel cada 300 EXP
    const expForNextLevel = user.level * 300;
    let levelUpMsg = '';
    if (user.exp >= expForNextLevel) {
      user.level += 1;
      user.exp -= expForNextLevel;
      levelUpMsg = `\n🎉 ¡Felicidades! Subiste al *Nivel ${user.level}*!`;
    }

    db.saveUsers();

    const randomMsg = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];

    await sock.sendMessage(remoteJid, {
      text: `💼 ${randomMsg} *$${earned}* monedas (+${expEarned} EXP).${levelUpMsg}\n💰 Saldo actual: *$${user.wallet}*`,
      mentions: [sender]
    });
  }
};
