import axios from 'axios';

const pixabaySearchCache = new Map();

async function findPinterestImage(query) {
  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
  if (!accessToken) return null;

  const { data } = await axios.get('https://api.pinterest.com/v5/search/partner/pins', {
    params: { term: query.slice(0, 100), country_code: 'CO', limit: 10, locale: 'es-CO' },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 12000
  });

  const pins = data?.items || [];
  const pin = pins.find(item => item.media?.media_type === 'image' && item.media?.images) || pins[0];
  if (!pin) return null;

  const images = pin.media?.images || {};
  const imageUrl = images['1200x']?.url || images['600x']?.url || images['400x300']?.url || images['150x150']?.url;
  if (!imageUrl) return null;

  const pinUrl = pin.id ? `https://www.pinterest.com/pin/${pin.id}/` : 'https://www.pinterest.com/';
  return {
    url: imageUrl,
    caption: `📌 Resultado de Pinterest para: *${query}*\n${pinUrl}`
  };
}

async function findPixabayImage(query) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return null;

  const cacheKey = `${apiKey}:${query.toLowerCase()}`;
  let hits = pixabaySearchCache.get(cacheKey);
  if (!hits || hits.expiresAt <= Date.now()) {
    const { data } = await axios.get('https://pixabay.com/api/', {
      params: {
        key: apiKey,
        q: query.slice(0, 100),
        lang: 'es',
        image_type: 'photo',
        safesearch: 'true',
        per_page: 10
      },
      timeout: 10000
    });
    hits = data?.hits || [];
    pixabaySearchCache.set(cacheKey, { hits, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  } else {
    hits = hits.hits;
  }

  if (!hits.length) return null;
  const image = hits[0];
  return {
    url: image.largeImageURL || image.webformatURL,
    caption: `🖼️ Resultado para: *${query}*\n📷 Imagen de Pixabay: ${image.pageURL}`
  };
}

async function findCommonsImage(query) {
  const { data } = await axios.get('https://commons.wikimedia.org/w/api.php', {
    params: {
      action: 'query',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: 6,
      gsrlimit: 10,
      prop: 'imageinfo',
      iiprop: 'url|mime',
      iiurlwidth: 1280,
      format: 'json',
      origin: '*'
    },
    headers: { 'User-Agent': 'KyotoBot/1.0 (image search command)' },
    timeout: 10000
  });

  const pages = Object.values(data?.query?.pages || {}).filter(page => {
    const mime = page.imageinfo?.[0]?.mime || '';
    return mime.startsWith('image/') && !['image/svg+xml', 'image/gif'].includes(mime);
  });
  if (!pages.length) return null;

  const page = pages[0];
  const image = page.imageinfo[0];
  const pageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`;
  return {
    url: image.thumburl || image.url,
    caption: `🖼️ Resultado para: *${query}*\n📷 Imagen de Wikimedia Commons: ${pageUrl}`
  };
}

async function generateFallback(query) {
  const seed = Math.floor(Math.random() * 1000000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?seed=${seed}&width=1024&height=1024&nologo=true`;
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    headers: { 'User-Agent': 'KyotoBot/1.0' }
  });
  return {
    buffer: Buffer.from(data),
    caption: `🎨 Imagen generada a partir de: *${query}*`
  };
}

export default {
  name: 'pnt',
  aliases: [],
  description: 'Busca primero en Pinterest y, como respaldo, en otras fuentes o la genera con IA.',
  usage: '!pnt <descripción>',
  category: 'media',
  async execute({ sock, remoteJid, args, msg }) {
    const query = args?.join(' ').trim();
    if (!query) {
      await sock.sendMessage(remoteJid, {
        text: '⚠️ Escribe qué imagen quieres buscar.\n*Ejemplo:* `!pnt salami con tostones`'
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(remoteJid, { react: { text: '🔎', key: msg.key } });

    try {
      let result = null;
      try {
        result = await findPinterestImage(query);
      } catch (err) {
        console.warn('[PNT] Falló la búsqueda en Pinterest:', err.message);
      }

      if (!result) {
        try {
          result = await findPixabayImage(query);
        } catch (err) {
          console.warn('[PNT] Falló la búsqueda en Pixabay:', err.message);
        }
      }

      if (!result) {
        try {
          result = await findCommonsImage(query);
        } catch (err) {
          console.warn('[PNT] Falló la búsqueda en Wikimedia Commons:', err.message);
        }
      }

      if (result?.url) {
        const { data } = await axios.get(result.url, {
          responseType: 'arraybuffer',
          timeout: 20000,
          maxContentLength: 15 * 1024 * 1024
        });
        await sock.sendMessage(remoteJid, {
          image: Buffer.from(data),
          caption: result.caption
        }, { quoted: msg });
      } else {
        const generated = await generateFallback(query);
        await sock.sendMessage(remoteJid, {
          image: generated.buffer,
          caption: generated.caption
        }, { quoted: msg });
      }

      await sock.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      console.error('[PNT Error]', err);
      await sock.sendMessage(remoteJid, {
        text: '❌ No pude obtener una imagen esta vez. Inténtalo de nuevo en un momento.'
      }, { quoted: msg });
    }
  }
};
