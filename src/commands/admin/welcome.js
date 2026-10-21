import { checkGroupAdmin } from '../../utils/permissions.js';
import { db } from '../../database.js';

export default {
  name: 'welcome',
  aliases: ['bienvenida'],
  description: 'Activa o desactiva los mensajes de bienvenida automáticos para nuevos miembros.',
  usage: '!welcome on | !welcome off',
  category: 'admin',
  async execute({ sock, remoteJid, sender, args, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    if (args.length === 0) {
      const group = db.getGroup(remoteJid);
      await sock.sendMessage(remoteJid, {
        text: `👋 El mensaje de bienvenida está actualmente: *${group.welcome ? 'ACTIVADO (ON)' : 'DESACTIVADO (OFF)'}*\n\n*Uso:* \`!welcome on\` o \`!welcome off\``
      });
      return;
    }

    const state = args[0].toLowerCase();
    const group = db.getGroup(remoteJid);

    if (state === 'on' || state === 'activar') {
      group.welcome = true;
      db.saveGroups();
      await sock.sendMessage(remoteJid, {
        text: '🎉 *Bienvenida Activada*: El bot saludará y mencionará automáticamente a cada nuevo miembro que ingrese al grupo.'
      });
    } else if (state === 'off' || state === 'desactivar') {
      group.welcome = false;
      db.saveGroups();
      await sock.sendMessage(remoteJid, {
        text: '👋 *Bienvenida Desactivada*: No se enviarán mensajes automáticos de entrada.'
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Opción inválida. Usa `!welcome on` o `!welcome off`.'
      });
    }
  }
};
