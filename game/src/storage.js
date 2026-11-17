// Best score and settings, kept in localStorage. Everything here is
// best-effort: a browser that blocks storage just plays without memory.

const BEST_KEY = 'lanternkeep.best';
const MUTED_KEY = 'lanternkeep.muted';

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: play on without remembering.
  }
}

export function loadBest() {
  const value = read(BEST_KEY, 0);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function saveBest(score) {
  const best = Math.max(loadBest(), score);
  write(BEST_KEY, best);
  return best;
}

export function loadMuted() {
  return read(MUTED_KEY, false) === true;
}

export function saveMuted(muted) {
  write(MUTED_KEY, muted === true);
}
