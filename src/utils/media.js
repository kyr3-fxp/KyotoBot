import sharp from 'sharp';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Descarga contenido multimedia (imagen, gif, video) y devuelve un Buffer seguro
 */
export async function downloadMediaBuffer(url, timeout = 5000) {
  if (!url) throw new Error('URL vacía para descarga de multimedia');
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KyotoBot/1.0',
      Accept: '*/*'
    }
  });
  return Buffer.from(res.data);
}

/**
 * Convierte un GIF animado a video MP4 optimizado para WhatsApp (gifPlayback: true)
 */
export async function gifToMp4(gifBuffer) {
  const tmpId = randomBytes(6).toString('hex');
  const inputPath = path.join(os.tmpdir(), `kyoto_gif_${tmpId}.gif`);
  const outputPath = path.join(os.tmpdir(), `kyoto_mp4_${tmpId}.mp4`);

  fs.writeFileSync(inputPath, gifBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-movflags faststart',
        '-pix_fmt yuv420p',
        '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2'
      ])
      .toFormat('mp4')
      .save(outputPath)
      .on('end', () => {
        try {
          const result = fs.readFileSync(outputPath);
          try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
          resolve(result);
        } catch (e) {
          reject(e);
        }
      })
      .on('error', (err) => {
        try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
        reject(err);
      });
  });
}

/**
 * Convierte un buffer de imagen a sticker WebP optimizado (512x512)
 */
export async function imageToWebp(imageBuffer) {
  return await sharp(imageBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Convierte un buffer WebP a imagen PNG
 */
export async function webpToPng(webpBuffer) {
  return await sharp(webpBuffer)
    .png()
    .toBuffer();
}

/**
 * Convierte un video/GIF corto a sticker WebP animado
 */
export async function videoToWebp(videoBuffer) {
  const tmpId = randomBytes(6).toString('hex');
  const inputPath = path.join(os.tmpdir(), `kyoto_in_${tmpId}.mp4`);
  const outputPath = path.join(os.tmpdir(), `kyoto_out_${tmpId}.webp`);

  fs.writeFileSync(inputPath, videoBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputFormat('mp4')
      .outputOptions([
        '-vcodec libwebp',
        '-vf scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse',
        '-loop 0',
        '-ss 00:00:00',
        '-t 00:00:06',
        '-preset default',
        '-an',
        '-vsync 0'
      ])
      .toFormat('webp')
      .save(outputPath)
      .on('end', () => {
        const result = fs.readFileSync(outputPath);
        try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
        resolve(result);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
        reject(err);
      });
  });
}

/**
 * Convierte un sticker animado WebP a video MP4
 */
export async function webpToVideo(webpBuffer) {
  const tmpId = randomBytes(6).toString('hex');
  const inputPath = path.join(os.tmpdir(), `kyoto_in_${tmpId}.webp`);
  const outputPath = path.join(os.tmpdir(), `kyoto_out_${tmpId}.mp4`);

  fs.writeFileSync(inputPath, webpBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-movflags faststart',
        '-pix_fmt yuv420p',
        '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2'
      ])
      .toFormat('mp4')
      .save(outputPath)
      .on('end', () => {
        const result = fs.readFileSync(outputPath);
        try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
        resolve(result);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch {}
        reject(err);
      });
  });
}
