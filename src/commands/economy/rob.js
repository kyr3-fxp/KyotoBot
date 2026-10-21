import { db } from '../../database.js';

const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutos

export default {
  name: 'rob',
  aliases: ['robar'],
  description: 'Intenta robar una parte del saldo de otro miembro (con probabilidad de fallo y multa).',
  usage: '!rob @usuario',
  category: 'economy',
  async execute({ sock, remoteJid, sender, cleanSender, mentions }) {
    if (!mentions || mentions.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes etiquetar a quién deseas robar.\n*Ejemplo:* `!rob @usuario`'
      });
      return;
    }

    const targetJid = mentions[0];
    const cleanTarget = targetJid.split(':')[0].split('@')[0];

    if (cleanTarget === cleanSender) {
      await sock.sendMessage(remoteJid, {
        text: '🤦‍♂️ No puedes robarte a ti mismo.'
      });
      return;
    }

    const robber = db.getUser(sender);
    const victim = db.getUser(targetJid);
    const now = Date.now();

    if (now - (robber.lastRob || 0) < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (now - robber.lastRob);
      const mins = Math.ceil(remainingMs / (60 * 1000));
      await sock.sendMessage(remoteJid, {
        text: `⏳ @${cleanSender}, la policía te sigue buscando. Podrás robar de nuevo en *${mins} minuto(s)*.`,
        mentions: [sender]
      });
      return;
    }

    if ((victim.wallet || 0) < 100) {
      await sock.sendMessage(remoteJid, {
        text: `😿 @${cleanTarget} está en la quiebra (tiene menos de $100). No vale la pena el riesgo.`,
        mentions: [targetJid]
      });
      return;
    }

    robber.lastRob = now;

    // 45% de probabilidad de éxito
    const isSuccess = Math.random() < 0.45;

    if (isSuccess) {
      // Robar entre 10% y 25% de la billetera de la víctima
      const percent = (Math.random() * 0.15) + 0.10;
      const stolen = Math.floor(victim.wallet * percent);

      victim.wallet -= stolen;
      robber.wallet = (robber.wallet || 0) + stolen;
      db.saveUsers();

      await sock.sendMessage(remoteJid, {
        text: `🥷 ¡Atraco exitoso! @${cleanSender} le robó *$${stolen}* monedas a @${cleanTarget}. 💰`,
        mentions: [sender, targetJid]
      });
    } else {
      // Multa por fallo
      const fine = Math.min(robber.wallet || 0, 200);
      robber.wallet = Math.max(0, (robber.wallet || 0) - 200);
      victim.wallet = (victim.wallet || 0) + fine;
      db.saveUsers();

      await sock.sendMessage(remoteJid, {
        text: `👮‍♂️ ¡Te atrapó la policía! @${cleanSender} intentó robar a @${cleanTarget} y tuvo que pagar una multa de *$${fine}* como compensación. 🚨`,
        mentions: [sender, targetJid]
      });
    }
  }
};
