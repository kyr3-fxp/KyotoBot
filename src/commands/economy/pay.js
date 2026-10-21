import { db } from '../../database.js';

export default {
  name: 'pay',
  aliases: ['pagar', 'transferir', 'transfer'],
  description: 'Transfiere monedas de tu cartera a otro miembro.',
  usage: '!pay @usuario monto',
  category: 'economy',
  async execute({ sock, remoteJid, sender, cleanSender, mentions, args }) {
    if (!mentions || mentions.length === 0 || args.length < 2) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Formato incorrecto.\n*Uso:* `!pay @usuario <monto>`\n*Ejemplo:* `!pay @usuario 250`'
      });
      return;
    }

    const targetJid = mentions[0];
    const cleanTarget = targetJid.split(':')[0].split('@')[0];

    if (cleanTarget === cleanSender) {
      await sock.sendMessage(remoteJid, {
        text: '🤦‍♂️ No puedes transferirte dinero a ti mismo.'
      });
      return;
    }

    // El monto puede estar en args[0] o args[1]
    const rawAmount = args.find(a => !a.includes('@') && !isNaN(parseInt(a, 10)));
    const amount = parseInt(rawAmount, 10);

    if (!amount || isNaN(amount) || amount <= 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes ingresar un monto válido mayor a 0.'
      });
      return;
    }

    const payer = db.getUser(sender);
    const receiver = db.getUser(targetJid);

    if ((payer.wallet || 0) < amount) {
      await sock.sendMessage(remoteJid, {
        text: `❌ Saldo insuficiente. Tienes *$${payer.wallet || 0}* en mano e intentas enviar *$${amount}*.`
      });
      return;
    }

    payer.wallet -= amount;
    receiver.wallet = (receiver.wallet || 0) + amount;
    db.saveUsers();

    await sock.sendMessage(remoteJid, {
      text: `💸 ¡Transferencia exitosa!\n@${cleanSender} le envió *$${amount}* monedas a @${cleanTarget}.`,
      mentions: [sender, targetJid]
    });
  }
};
