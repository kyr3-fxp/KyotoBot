import { checkGroupAdmin } from '../../utils/permissions.js';
import { db } from '../../database.js';

export default {
  name: 'antilink',
  aliases: ['antienlace'],
  description: 'Activa o desactiva la protección automática contra enlaces de otros grupos.',
  usage: '!antilink on | !antilink off',
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
        text: `🛡️ El sistema Antilink está actualmente: *${group.antilink ? 'ACTIVADO (ON)' : 'DESACTIVADO (OFF)'}*\n\n*Uso:* \`!antilink on\` o \`!antilink off\``
      });
      return;
    }

    const state = args[0].toLowerCase();
    const group = db.getGroup(remoteJid);

    if (state === 'on' || state === 'activar') {
      group.antilink = true;
      db.saveGroups();
      await sock.sendMessage(remoteJid, {
        text: '🛡️ *Antilink Activado*: Los mensajes con enlaces de grupos enviados por no-administradores serán eliminados automáticamente.'
      });
    } else if (state === 'off' || state === 'desactivar') {
      group.antilink = false;
      db.saveGroups();
      await sock.sendMessage(remoteJid, {
        text: '🛡️ *Antilink Desactivado*: Los enlaces están permitidos.'
      });
    } else {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Opción inválida. Usa `!antilink on` o `!antilink off`.'
      });
    }
  }
};
