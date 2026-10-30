import { antiDeleteTracker, extractText } from "../../utils/antiDelete.js";

export default {
  name: "undel",
  aliases: ["undelete", "recuperar", "revivir", "verborrado", "antidel"],
  description:
    "Muestra el contenido de un mensaje borrado (citándolo o recuperando el último eliminado del chat).",
  usage:
    "!undel (respondiendo a un mensaje borrado o sin citar para el último)",
  category: "media",
  async execute({ sock, remoteJid, quotedKey, contextInfo, msg }) {
    const targetId = quotedKey?.id || contextInfo?.stanzaId || null;
    const deleted = antiDeleteTracker.getDeletedMessage(remoteJid, targetId);

    if (!deleted) {
      await sock.sendMessage(
        remoteJid,
        {
          text: "⚠️ No se encontró ningún mensaje borrado en la memoria para este chat.\n*Tip:* Puedes citar directamente el mensaje que fue eliminado o usar `!undel` justo después de que lo borren.",
        },
        { quoted: msg },
      );
      return;
    }

    const senderJid = deleted.sender;
    const cleanNum = senderJid
      ? senderJid.split("@")[0]
      : deleted.pushName || "usuario";
    const mentions = senderJid ? [senderJid] : [];

    try {
      // 1. Mensaje con archivo multimedia recuperado
      if (deleted.mediaType && deleted.mediaBuffer) {
        const captionText = deleted.caption
          ? `Mensaje borrado de @${cleanNum}.\n-${deleted.caption}-`
          : `Mensaje borrado de @${cleanNum}.`;

        if (deleted.mediaType === "image") {
          await sock.sendMessage(
            remoteJid,
            {
              image: deleted.mediaBuffer,
              caption: captionText,
              mentions,
            },
            { quoted: msg },
          );
          return;
        }

        if (deleted.mediaType === "video") {
          await sock.sendMessage(
            remoteJid,
            {
              video: deleted.mediaBuffer,
              caption: captionText,
              mentions,
            },
            { quoted: msg },
          );
          return;
        }

        if (deleted.mediaType === "sticker") {
          await sock.sendMessage(
            remoteJid,
            {
              text: `Mensaje borrado de @${cleanNum}.\n-[Sticker]-`,
              mentions,
            },
            { quoted: msg },
          );
          await sock.sendMessage(remoteJid, {
            sticker: deleted.mediaBuffer,
          });
          return;
        }

        if (deleted.mediaType === "audio") {
          await sock.sendMessage(
            remoteJid,
            {
              text: `Mensaje borrado de @${cleanNum}.\n-[Audio / Nota de voz]-`,
              mentions,
            },
            { quoted: msg },
          );
          await sock.sendMessage(remoteJid, {
            audio: deleted.mediaBuffer,
            mimetype: "audio/mp4",
            ptt: Boolean(deleted.mediaNode?.ptt),
          });
          return;
        }

        if (deleted.mediaType === "document") {
          await sock.sendMessage(
            remoteJid,
            {
              document: deleted.mediaBuffer,
              mimetype:
                deleted.mediaNode?.mimetype || "application/octet-stream",
              fileName: deleted.mediaNode?.fileName || "documento",
              caption: captionText,
              mentions,
            },
            { quoted: msg },
          );
          return;
        }
      }

      // 2. Mensaje de texto recuperado
      const originalText = extractText(deleted.message);
      const textOutput = `Mensaje borrado de @${cleanNum}.\n\`${originalText || "Mensaje de texto vacío"}\``;

      await sock.sendMessage(
        remoteJid,
        {
          text: textOutput,
          mentions,
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error("[Undel Command Error]", err);
      await sock.sendMessage(
        remoteJid,
        {
          text: "❌ Ocurrió un error al intentar mostrar el mensaje eliminado.",
        },
        { quoted: msg },
      );
    }
  },
};
