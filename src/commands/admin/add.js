import { checkGroupAdmin } from '../../utils/permissions.js';

export default {
  name: 'add',
  aliases: ['agregar', 'añadir'],
  description: 'Agrega un usuario al grupo mediante su número telefónico internacional.',
  usage: '!add <número con código de país>',
  category: 'admin',
  async execute({ sock, remoteJid, sender, args, msg, m, isFromMe }) {
    const perm = await checkGroupAdmin({ sock, remoteJid, sender, msg, m, isFromMe });
    if (perm.error) {
      await sock.sendMessage(remoteJid, { text: perm.error });
      return;
    }

    if (args.length === 0) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Debes ingresar el número con su código de país (sin espacios ni signos).\n*Ejemplo:* `!add 521234567890` o `!add 573001234567`'
      });
      return;
    }

    const rawNum = args[0].replace(/[^0-9]/g, '');
    if (rawNum.length < 8) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ El número ingresado parece incompleto o inválido.'
      });
      return;
    }

    const targetJid = `${rawNum}@s.whatsapp.net`;

    try {
      const response = await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
      const status = response?.[0]?.status;

      if (status === '403') {
        await sock.sendMessage(remoteJid, {
          text: `⚠️ No se pudo agregar a +${rawNum} debido a sus ajustes de privacidad. El bot le enviará una invitación privada.`
        });
      } else {
        await sock.sendMessage(remoteJid, {
          text: `✅ Usuario +${rawNum} agregado con éxito.`
        });
      }
    } catch (err) {
      console.error('[Add Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No se pudo agregar al número indicado. Comprueba que el número sea correcto.'
      });
    }
  }
};
