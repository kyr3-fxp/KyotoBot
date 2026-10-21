import { getRoleplayGif } from './nsfwHelper.js';
import { downloadMediaBuffer, gifToMp4 } from './media.js';

// Imagen de respaldo de alta disponibilidad si la API externa falla o tarda más de 5 segundos
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=512&auto=format&fit=crop';

/**
 * Creador robusto de comandos de rol e interacción
 * Maneja timeouts de 5s, conversión de GIF a MP4 compatible y fallback garantizado.
 */
export function createRoleplayCommand({
  name,
  aliases = [],
  actionKey,
  description,
  actionText,
  emoji = '🔥',
  isNsfw = true
}) {
  return {
    name,
    aliases,
    description,
    usage: `!${name} @usuario (o respondiendo a su mensaje)`,
    category: isNsfw ? 'roleplay' : 'interaction',
    async execute({ sock, remoteJid, sender, cleanSender, mentions, quotedParticipant, msg }) {
      const target = quotedParticipant || (mentions && mentions.length > 0 ? mentions[0] : null);

      if (!target) {
        await sock.sendMessage(remoteJid, {
          text: `⚠️ Debes mencionar o responder al mensaje del usuario para esta acción.\n*Ejemplo:* \`!${name} @usuario\``
        });
        return;
      }

      const cleanTarget = target.split(':')[0].split('@')[0];

      if (cleanTarget === cleanSender) {
        await sock.sendMessage(remoteJid, {
          text: `🤦‍♂️ No puedes realizar esta acción contigo mismo/a.`
        });
        return;
      }

      // Reacción inmediata para confirmar recepción del comando
      try {
        await sock.sendMessage(remoteJid, { react: { text: emoji, key: msg.key } });
      } catch (e) {}

      const caption = `${emoji} @${cleanSender} ${actionText} a @${cleanTarget} ${emoji}`;

      try {
        // Envoltura con timeout estricto de 5 segundos
        const gifPromise = getRoleplayGif(actionKey || name);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 5000)
        );

        const mediaUrl = await Promise.race([gifPromise, timeoutPromise]);

        if (mediaUrl) {
          try {
            // Descargar el buffer multimedia directamente con timeout
            const buffer = await downloadMediaBuffer(mediaUrl, 4000);
            const isGif = buffer.length > 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // Formato GIF87a / GIF89a
            const isImage = !isGif && /\.(jpg|jpeg|png|webp)($|\?)/i.test(mediaUrl);

            if (isGif) {
              // Convertir GIF a MP4 (WhatsApp requiere MP4 H.264 para reproducir bucles animados sin quedarse cargando)
              let videoPayload = buffer;
              try {
                videoPayload = await gifToMp4(buffer);
              } catch (convErr) {
                console.warn('[Roleplay] Conversión a MP4 falló, enviando payload original:', convErr.message);
              }

              await sock.sendMessage(
                remoteJid,
                {
                  video: videoPayload,
                  gifPlayback: true,
                  caption,
                  mentions: [sender, target]
                },
                { quoted: msg }
              );
            } else if (isImage) {
              await sock.sendMessage(
                remoteJid,
                {
                  image: buffer,
                  caption,
                  mentions: [sender, target]
                },
                { quoted: msg }
              );
            } else {
              await sock.sendMessage(
                remoteJid,
                {
                  video: buffer,
                  gifPlayback: true,
                  caption,
                  mentions: [sender, target]
                },
                { quoted: msg }
              );
            }

            try {
              await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
            } catch (e) {}
            return;
          } catch (downloadSendErr) {
            console.warn(`[Roleplay ${name}] Envío con buffer falló, probando fallback:`, downloadSendErr?.message);
          }
        }

        // Si no se obtuvo URL válida o falló el envío, lanzar error para fallback
        throw new Error('NO_MEDIA_URL');
      } catch (err) {
        console.warn(`[Roleplay ${name}] Falló o agotó tiempo (${err.message}). Enviando respaldo.`);

        // Mensaje de respaldo (fallback): texto de interacción + mención + imagen predeterminada
        try {
          const fallbackBuffer = await downloadMediaBuffer(FALLBACK_IMAGE_URL, 3000);
          await sock.sendMessage(
            remoteJid,
            {
              image: fallbackBuffer,
              caption,
              mentions: [sender, target]
            },
            { quoted: msg }
          );
        } catch (mediaFallbackErr) {
          // Último recurso infalible: mensaje de texto con mención garantizado
          await sock.sendMessage(
            remoteJid,
            {
              text: caption,
              mentions: [sender, target]
            },
            { quoted: msg }
          );
        }

        try {
          await sock.sendMessage(remoteJid, { react: { text: '✨', key: msg.key } });
        } catch (e) {}
      }
    }
  };
}
