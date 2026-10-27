import { normalizeJid } from '../../utils/permissions.js';

export default {
  name: 'getpp',
  aliases: ['perfil', 'pfp', 'foto'],
  description: 'Obtiene y envía la foto de perfil en alta resolución de un usuario citado, mencionado o del remitente.',
  usage: '!getpp [@usuario o respondiendo a un mensaje]',
  category: 'media',
  async execute({ sock, remoteJid, sender, mentions, quotedParticipant, msg }) {
    try {
      // 1. Determinar el usuario objetivo (prioridad: citado -> mencionado -> remitente)
      let target = null;
      if (quotedParticipant) {
        target = quotedParticipant;
      } else if (mentions && mentions.length > 0) {
        target = mentions[0];
      } else {
        target = sender;
      }

      const targetJid = normalizeJid(target);
      if (!targetJid) {
        await sock.sendMessage(remoteJid, {
          text: '⚠️ No se pudo determinar el usuario para obtener la foto de perfil.'
        }, { quoted: msg });
        return;
      }

      const cleanNum = targetJid.split('@')[0];

      // 2. Extraer foto de perfil en alta resolución ('image'), con fallback a preview
      let pfpUrl = null;
      try {
        pfpUrl = await sock.profilePictureUrl(targetJid, 'image');
      } catch (err) {
        try {
          pfpUrl = await sock.profilePictureUrl(targetJid);
        } catch {
          pfpUrl = null;
        }
      }

      if (!pfpUrl) {
        await sock.sendMessage(remoteJid, {
          text: `❌ No se pudo obtener la foto de perfil de @${cleanNum}. El usuario puede tenerla en privado o no tener foto establecida.`,
          mentions: [targetJid]
        }, { quoted: msg });
        return;
      }

      // 3. Enviar la imagen
      await sock.sendMessage(
        remoteJid,
        {
          image: { url: pfpUrl },
          caption: `🖼️ *Foto de perfil de:* @${cleanNum}`,
          mentions: [targetJid]
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error('[GetPP Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error inesperado al intentar obtener la foto de perfil.'
      }, { quoted: msg });
    }
  }
};
