import axios from 'axios';

/**
 * Helper para obtener recursos de rol animado desde proveedores con timeout y respaldos.
 */

const AXIOS_TIMEOUT = 3500; // Tiempo por proveedor; deja margen para probar alternativas
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KyotoBot/1.0';
const PURRBOT_API = 'https://api.purrbot.site/v2';

const client = axios.create({
  timeout: AXIOS_TIMEOUT,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*'
  }
});

// Categorías disponibles en la API actual de PurrBot.
const PURRBOT_SFW = new Set([
  'bite', 'cuddle', 'dance', 'hug', 'kiss', 'lick', 'pat', 'poke', 'slap', 'smile', 'tickle'
]);

// Mapeo a categorías NSFW válidas de PurrBot. Algunas acciones no tienen GIF dedicado.
const PURRBOT_NSFW_MAP = {
  fuck: 'fuck',
  penetrate: 'fuck',
  bed: 'fuck',
  suck: 'blowjob',
  oral: 'blowjob',
  cum: 'cum',
  spank: null,
  slapnsfw: null,
  anal: 'anal',
  grind: 'anal',
  touch: 'fuck',
  grope: 'fuck',
  strip: 'fuck',
  bondage: 'fuck',
  lick: 'pussylick'
};

// Acciones SFW soportadas por nekos.best
const NEKOS_BEST_SFW = [
  'hug', 'kiss', 'slap', 'bite', 'pat', 'poke', 'cuddle',
  'smile', 'smug', 'dance', 'highfive', 'wave', 'wink', 'handhold', 'nom', 'tickle'
];

/**
 * Obtiene un GIF animado de interacción o rol consultando proveedores alternativos
 */
export async function getRoleplayGif(action = 'hug') {
  const cleanAction = (action || '').toLowerCase().trim();

  // --- 1. Si es una acción SFW estándar (hug, kiss, slap, bite, pat, etc.) ---
  if (NEKOS_BEST_SFW.includes(cleanAction)) {
    // Intento A: PurrBot API v2. Evita el dominio antiguo y prioriza categorías confirmadas.
    if (PURRBOT_SFW.has(cleanAction)) {
      try {
        const res = await client.get(`${PURRBOT_API}/img/sfw/${cleanAction}/gif`);
        if (res.data?.link && !res.data?.error) return res.data.link;
      } catch (err) {
        console.warn(`[Roleplay] PurrBot v2 SFW falló para "${cleanAction}":`, err.message);
      }
    }

    // Intento B: Nekos.best
    try {
      const res = await client.get(`https://nekos.best/api/v2/${cleanAction}`);
      const gifUrl = res.data?.results?.[0]?.url;
      if (gifUrl) return gifUrl;
    } catch (err) {
      console.warn(`[Roleplay] Nekos.best falló para "${cleanAction}":`, err.message);
    }

    // Intento C: Nekos.life
    try {
      const res = await client.get(`https://nekos.life/api/v2/img/${cleanAction}`);
      if (res.data?.url) return res.data.url;
    } catch (err) {
      console.warn(`[Roleplay] Nekos.life falló para "${cleanAction}":`, err.message);
    }

    // Intento D: OtakuGIFs
    try {
      const res = await client.get(`https://api.otakugifs.xyz/gif?reaction=${cleanAction}`);
      if (res.data?.url) return res.data.url;
    } catch (err) {
      console.warn(`[Roleplay] OtakuGIFs falló para "${cleanAction}":`, err.message);
    }

    // Nunca convertir una acción SFW en una búsqueda o respuesta NSFW.
    return null;
  }

  // --- 2. Si es una acción NSFW o de rol adulto (fuck, suck, cum, spank, etc.) ---
  const purrAction = PURRBOT_NSFW_MAP[cleanAction];

  // Intento A: PurrBot API v2 solo recibe categorías existentes.
  if (purrAction) {
    try {
      const res = await client.get(`${PURRBOT_API}/img/nsfw/${purrAction}/gif`);
      if (res.data?.link && !res.data?.error) return res.data.link;
    } catch (err) {
      console.warn(`[Roleplay] PurrBot v2 NSFW falló para "${cleanAction}":`, err.message);
    }
  }

  // Intento B: contenido explícito etiquetado para azotes, cuando esa acción no tiene endpoint GIF.
  if (cleanAction === 'spank' || cleanAction === 'slapnsfw') {
    try {
      const spankingUrl = await getRandomYandePost('rating:explicit+spanking');
      if (spankingUrl) return spankingUrl;
    } catch (err) {
      console.warn(`[Roleplay] Búsqueda explícita de azotes falló:`, err.message);
    }
  }

  // Intento C: GIF NSFW genérico válido como último recurso si no hay categoría específica.
  try {
    const res = await client.get(`${PURRBOT_API}/img/nsfw/fuck/gif`);
    if (res.data?.link && !res.data?.error) return res.data.link;
  } catch (err) {
    console.warn(`[Roleplay] PurrBot v2 NSFW de respaldo falló para "${cleanAction}":`, err.message);
  }

  // Intento D: Yande.re post optimizado (sample_url)
  return await getRandomYandePost('rating:explicit');
}

/**
 * Obtiene una publicación aleatoria de Yande.re con imagen ligera (sample_url) y timeout
 */
export async function getRandomYandePost(tag = 'rating:explicit') {
  try {
    const randomPage = Math.floor(Math.random() * 15) + 1;
    const url = `https://yande.re/post.json?limit=15&page=${randomPage}&tags=order:random+${encodeURIComponent(tag)}`;
    const res = await client.get(url);
    if (Array.isArray(res.data) && res.data.length > 0) {
      const item = res.data[Math.floor(Math.random() * res.data.length)];
      // Preferir sample_url o jpeg_url para evitar descargas pesadas de más de 5MB
      return item.sample_url || item.jpeg_url || item.file_url;
    }
  } catch (err) {
    console.warn('[NSFW Helper] Yande.re falló o agotó tiempo:', err.message);
  }
  return null;
}

/**
 * Búsqueda en booru con timeout protegido
 */
export async function searchBooru(query, explicit = true) {
  const baseTag = explicit ? 'rating:explicit' : 'rating:questionable';
  const tag = query ? `${baseTag}+${query}` : baseTag;
  return await getRandomYandePost(tag);
}
