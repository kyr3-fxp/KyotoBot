import { db } from '../../database.js';

export default {
  name: 'bal',
  aliases: ['balance', 'cartera', 'saldo', 'wallet'],
  description: 'Muestra tu saldo actual de monedas, banco y nivel.',
  usage: '!bal [@usuario opcional]',
  category: 'economy',
  async execute({ sock, remoteJid, sender, mentions }) {
    const targetJid = mentions && mentions.length > 0 ? mentions[0] : sender;
    const cleanTarget = targetJid.split(':')[0].split('@')[0];
    const user = db.getUser(targetJid);

    const total = (user.wallet || 0) + (user.bank || 0);
    const expNeeded = user.level * 300;

    const text = [
      `💳 *Cartera de @${cleanTarget}*`,
      '━━━━━━━━━━━━━━━━━━━━',
      `💵 *En mano (Wallet):* $${user.wallet || 0}`,
      `🏦 *En banco:* $${user.bank || 0}`,
      `💰 *Total neto:* $${total}`,
      `⭐ *Nivel:* ${user.level} (${user.exp || 0}/${expNeeded} EXP)`,
      '━━━━━━━━━━━━━━━━━━━━'
    ].join('\n');

    await sock.sendMessage(remoteJid, {
      text,
      mentions: [targetJid]
    });
  }
};
