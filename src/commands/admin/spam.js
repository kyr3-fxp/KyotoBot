import { checkGroupAdmin } from '../../utils/permissions.js';

const MAX_REPETITIONS = 50;
const DELAY_MS = 0;

export default {
  name: 'spam',
  aliases: ['repetirhidetag'],
  description: 'Repite un mensaje con hidetag para notificar a todos (solo administradores, máximo 50 veces).',
  usage: '!spam <1-50> <mensaje>',
  category: 'admin',
  async execute({ sock, remoteJid, sender, args, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe, requireBotAdmin: false });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    const repetitions = Number(args?.[0]);
    const message = args?.slice(1).join(' ').trim();
    if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > MAX_REPETITIONS || !message) {
      await sock.sendMessage(remoteJid, {
        text: `⚠️ Uso: !spam <1-${MAX_REPETITIONS}> <mensaje>\nEjemplo: !spam 3 Reunión en 10 minutos.`
      });
      return;
    }

    const mentions = (perm.participants || []).map(participant => participant.id);
    for (let i = 0; i < repetitions; i += 1) {
      await sock.sendMessage(remoteJid, { text: message, mentions });
      if (i < repetitions - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
  }
};
