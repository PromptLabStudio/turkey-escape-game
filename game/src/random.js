// Seeded randomness: mulberry32, a small fast 32-bit generator. The same seed always produces the
// same course, which keeps the ?shot= scenes and any replay honest.

/** Fold any seed (number or string) down to a 32-bit integer. */
function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Make a generator from a seed: `next()` plus the helpers the world and the art both use.
 */
export function makeRng(seed) {
  let state = hashSeed(seed);

  /** Uniform float in [0, 1). */
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  function range(min, max) {
    return min + (max - min) * next();
  }

  /** Integer in [min, max], both ends included. */
  function int(min, max) {
    if (max <= min) return Math.floor(min);
    return Math.floor(min + (max - min + 1) * next());
  }

  /** One element of a non-empty array. */
  function pick(list) {
    return list[Math.min(list.length - 1, Math.floor(next() * list.length))];
  }

  /** True with probability `p` (0..1). */
  function chance(p) {
    return next() < p;
  }

  /** A shuffled copy of the list. */
  function shuffle(list) {
    const out = list.slice();
    for (let index = out.length - 1; index > 0; index -= 1) {
      const other = Math.floor(next() * (index + 1));
      const held = out[index];
      out[index] = out[other];
      out[other] = held;
    }
    return out;
  }

  /** An independent generator derived from this stream, for a sub-system such as scenery. */
  function fork() {
    return makeRng(Math.floor(next() * 4294967296));
  }

  return { next, range, int, pick, chance, shuffle, fork };
}
