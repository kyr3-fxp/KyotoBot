import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'group',
  aliases: ['grupo'],
  description: 'Abre o cierra el grupo (en cerrado solo los administradores pueden enviar mensajes).',
  usage: '!group <open|close>',
  category: 'admin',
  async execute({ sock, remoteJid, sender, args, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes especificar si deseas abrir o cerrar el grupo.\n*Uso:* `!group open` o `!group close`'
      });
      return;
    }

    const action = args[0].toLowerCase();

    try {
      if (action === 'close' || action === 'cerrar') {
        await sock.groupSettingUpdate(remoteJid, 'announcement');
        await sock.sendMessage(remoteJid, {
          text: '🔒 *Grupo Cerrado*: A partir de ahora solo los administradores pueden enviar mensajes.'
        });
      } else if (action === 'open' || action === 'abrir') {
        await sock.groupSettingUpdate(remoteJid, 'not_announcement');
        await sock.sendMessage(remoteJid, {
          text: '🔓 *Grupo Abierto*: Todos los miembros pueden enviar mensajes libremente.'
        });
      } else {
        await sock.sendMessage(remoteJid, {
          text: '⚠️ Opción no válida. Usa `!group open` o `!group close`.'
        });
      }
    } catch (err) {
      console.error('[Group Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo cambiar el ajuste del grupo. Verifica los permisos del bot.'
      });
    }
  }
};
