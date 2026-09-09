const EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a'];
const audioCache = new Map();

export async function preloadDigitAudio() {
  await Promise.all(Array.from({ length: 8 }, (_, index) => resolveAudioSource(index + 1)));
}

export async function playDigit(number, enabled = true) {
  if (!enabled) return false;
  const digit = Number(number);
  if (!Number.isInteger(digit) || digit < 1 || digit > 8) return false;
  const src = await resolveAudioSource(digit);
  if (!src) return false;
  try {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

async function resolveAudioSource(digit) {
  if (audioCache.has(digit)) return audioCache.get(digit);
  for (const ext of EXTENSIONS) {
    const src = `./assets/audio/${digit}.${ext}`;
    if (await canLoad(src)) {
      audioCache.set(digit, src);
      return src;
    }
  }
  audioCache.set(digit, null);
  return null;
}

function canLoad(src) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const clean = () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
    };
    const onReady = () => { clean(); resolve(true); };
    const onError = () => { clean(); resolve(false); };
    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.src = src;
    audio.load();
  });
}
