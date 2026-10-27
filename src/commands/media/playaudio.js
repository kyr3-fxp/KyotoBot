import yts from 'yt-search';
import ytScraper from '@vreden/youtube_scraper';
import axios from 'axios';

export default {
  name: 'playaudio',
  aliases: ['playmp3', 'musicaaudio', 'ytaudio'],
  description: 'Busca una canción y envía su carátula/descripción corta seguida directamente del audio MP3 con portada adjunta.',
  usage: '!playaudio <nombre de la canción o enlace>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    if (!args || args.length === 0) {
      await sock.sendMessage(
        remoteJid,
        {
          text: '⚠️ Debes ingresar el nombre de la canción.\n*Ejemplo:* `!playaudio Mi kilito - ROA`'
        },
        { quoted: msg }
      );
      return;
    }

    const query = args.join(' ');

    try {
      // 1. Buscar la canción con yt-search
      const search = await yts(query);
      const video = search?.videos?.[0];

      if (!video) {
        await sock.sendMessage(
          remoteJid,
          { text: `❌ No se encontraron resultados para "*${query}*".` },
          { quoted: msg }
        );
        return;
      }

      // Límite de duración de seguridad (máximo 20 minutos)
      if (video.seconds > 1200) {
        await sock.sendMessage(
          remoteJid,
          { text: '⚠️ La canción o audio supera el límite permitido de 20 minutos.' },
          { quoted: msg }
        );
        return;
      }

      const thumbUrl = video.thumbnail || video.image || null;

      // Descargar buffer del thumbnail para metadatos y carátula del reproductor
      let thumbBuffer = null;
      if (thumbUrl) {
        try {
          const tRes = await axios.get(thumbUrl, {
            responseType: 'arraybuffer',
            timeout: 8000
          });
          thumbBuffer = Buffer.from(tRes.data);
        } catch {
          thumbBuffer = null;
        }
      }

      // --- MENSAJE 1: Descripción corta y miniatura/portada ---
      const infoText = `🎵 *Nombre:* ${video.title}\n⏱️ *Duración:* ${video.timestamp}\n👤 *Canal:* ${video.author?.name || 'Desconocido'}`;
      if (thumbBuffer) {
        try {
          await sock.sendMessage(
            remoteJid,
            {
              image: thumbBuffer,
              caption: infoText
            },
            { quoted: msg }
          );
        } catch {
          await sock.sendMessage(remoteJid, { text: infoText }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(remoteJid, { text: infoText }, { quoted: msg });
      }

      // 2. Extraer el enlace de descarga MP3
      let downloadUrl = null;
      try {
        let ytRes = await ytScraper.ytmp3(video.url, 128);
        if (!ytRes?.download?.url) {
          // Reintento con calidad 92 si el CDN está ocupado
          ytRes = await ytScraper.ytmp3(video.url, 92);
        }
        if (ytRes && ytRes.status && ytRes.download?.url) {
          downloadUrl = ytRes.download.url;
        }
      } catch (scrapeErr) {
        console.error('[PlayAudio Scraper Error]', scrapeErr);
      }

      if (!downloadUrl) {
        await sock.sendMessage(
          remoteJid,
          { text: '❌ No se pudo obtener el enlace de descarga para este audio.' },
          { quoted: msg }
        );
        return;
      }

      // 3. Descargar el buffer de audio
      const audioResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const audioBuffer = Buffer.from(audioResponse.data);
      const cleanTitle = video.title.replace(/[\\/:*?"<>|]/g, '').trim();

      // Metadatos de carátula para el reproductor de WhatsApp
      const contextInfo = {
        externalAdReply: {
          title: video.title,
          body: video.author?.name || 'Kyoto Music',
          mediaType: 2,
          mediaUrl: video.url,
          sourceUrl: video.url,
          thumbnail: thumbBuffer || undefined,
          thumbnailUrl: thumbUrl || undefined,
          renderLargerThumbnail: true
        }
      };

      // --- MENSAJE 2: Archivo de audio MP3 con carátula incrustada ---
      await sock.sendMessage(
        remoteJid,
        {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          fileName: `${cleanTitle || 'audio'}.mp3`,
          ptt: false,
          contextInfo
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error('[PlayAudio Error]', err);
      await sock.sendMessage(
        remoteJid,
        { text: '❌ Ocurrió un error al procesar y descargar la canción.' },
        { quoted: msg }
      );
    }
  }
};
