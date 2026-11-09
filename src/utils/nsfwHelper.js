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

// Categorías NSFW de PurrBot que coinciden con una acción del bot.
const PURRBOT_NSFW_MAP = {
  fuck: 'fuck',
  suck: 'blowjob',
  cum: 'cum',
  lick: 'pussylick'
};

// Yande.re no tiene GIFs para varias acciones, así que se usan búsquedas por etiquetas
// relacionadas; si el proveedor no devuelve esa etiqueta, el resultado se descarta.
const YANDE_ROLEPLAY_TAGS = {
  bed: 'sex',
  bondage: 'bondage',
  grind: 'tribadism',
  grope: 'ass_grab',
  slapnsfw: 'ass_grab',
  spank: 'ass_grab',
  strip: 'undressing',
  touch: 'breast_grab'
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

  // --- 2. Acciones NSFW con categoría propia en PurrBot ---
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

  // Acciones sin GIF dedicado: buscar por etiquetas específicas en vez de usar "fuck".
  const roleplayTag = YANDE_ROLEPLAY_TAGS[cleanAction];
  if (roleplayTag) {
    return await getRandomYandePost(`rating:explicit+${roleplayTag}`);
  }

  return null;
}

/**
 * Obtiene una publicación aleatoria de Yande.re con imagen ligera (sample_url) y timeout
 */
export async function getRandomYandePost(tag = 'rating:explicit') {
  try {
    const requestedTags = tag.split(/[+\s]+/).filter(Boolean);
    const encodedTags = requestedTags
      .map(part => encodeURIComponent(part))
      .join('%20');
    const url = `https://yande.re/post.json?limit=40&page=1&tags=${encodedTags}`;
    const res = await client.get(url);
    const posts = Array.isArray(res.data) ? res.data : (res.data?.posts || []);
    const requiredTags = requestedTags.filter(t => !t.startsWith('rating:'));
    const matchingPosts = posts.filter(post => {
      const postTags = new Set((post.tags || '').split(/\s+/));
      const requestedRating = requestedTags.find(t => t.startsWith('rating:'));
      const ratingMatches = !requestedRating ||
        (requestedRating === 'rating:explicit' && post.rating === 'e') ||
        (requestedRating === 'rating:questionable' && post.rating === 'q') ||
        (requestedRating === 'rating:safe' && post.rating === 's');
      return ratingMatches && requiredTags.every(t => postTags.has(t));
    });

    if (matchingPosts.length > 0) {
      const item = matchingPosts[Math.floor(Math.random() * matchingPosts.length)];
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
