import { checkGroupAdmin } from '../../utils/permissions.js';
import { db } from '../../database.js';

export default {
  name: 'nsfw',
  aliases: ['nsfwmode', '+18'],
  description: 'Activa o desactiva la categoría de comandos para adultos (+18) en el grupo.',
  usage: '!nsfw on | !nsfw off',
  category: 'admin',
  async execute({ sock, remoteJid, sender, isGroup, args, msg, m, isFromMe }) {
    if (!isGroup) {
      await sock.sendMessage(remoteJid, {
        text: 'ℹ️ Los comandos NSFW están disponibles por defecto en chats privados.'
      });
      return;
    }

    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    if (args.length === 0) {
      const group = db.getGroup(remoteJid);
      await sock.sendMessage(remoteJid, {
        text: `🔞 La categoría NSFW está actualmente: *${group.nsfw ? 'ACTIVADA (ON)' : 'DESACTIVADA (OFF)'}*\n\n*Uso:* \`!nsfw on\` o \`!nsfw off\``
      });
      return;
    }

    const state = args[0].toLowerCase();
    const group = db.getGroup(remoteJid);

    if (state === 'on' || state === 'activar') {
      group.nsfw = true;
      db.saveGroups();
      await sock.sendMessage(remoteJid, {
        text: '🔞 *Modo NSFW Activado*: Los comandos +18 y de interacción explícita ahora pueden ser utilizados en este grupo.'
      });
    } else if (state === 'off' || state === 'desactivar') {
      group.nsfw = false;
      db.saveGroups();
      await sock.sendMessage(remoteJid, {
        text: '🛡️ *Modo NSFW Desactivado*: Los comandos +18 han sido bloqueados en este grupo.'
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Opción inválida. Usa `!nsfw on` o `!nsfw off`.'
      });
    }
  }
};
