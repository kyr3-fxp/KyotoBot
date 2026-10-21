import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'delete',
  aliases: ['del', 'd', 'borrar', 'eliminar'],
  description: 'Elimina en silencio un mensaje citado en el grupo.',
  usage: '!delete (respondiendo al mensaje a borrar)',
  category: 'admin',
  async execute({ sock, remoteJid, sender, isFromMe, quotedKey, msg, m }) {
    // 1. Verificación de permisos: Solo administradores o cuenta propia del bot
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error || !perm.isAdmin) {
      // Totalmente sigiloso: sin avisos ni textos de error
      return;
    }

    // 2. Obtener la clave del mensaje citado a eliminar
    const targetKey = m?.quoted?.key || msg?.quoted?.key || quotedKey;
    if (!targetKey || !targetKey.id) {
      // Si no hay mensaje citado, finalizar en silencio sin enviar nada
      return;
    }

    // 3. Eliminar el mensaje citado sin avisos de confirmación
    try {
      await sock.sendMessage(remoteJid, { delete: targetKey });
    } catch (err) {
      console.warn('[Delete Silent Warning]', err?.message || err);
    }
  }
};
