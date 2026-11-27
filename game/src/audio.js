// All sound is synthesised with WebAudio at play time: no audio files, no network, no samples.
// Each effect is a short oscillator envelope (a couple of them for the bigger moments), and the
// context is created lazily on the first real key press or tap, as browsers require.

/**
 * Build the game's sound board. Nothing is created until `unlock()` or the first effect, so a
 * page that is never played makes no audio context at all.
 */
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx !== null) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch (error) {
      ctx = null;
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  /**
   * One shaped note: waveform, start and end frequency, length, peak loudness and a delay.
   * Frequencies glide exponentially, which reads as a chirp rather than a slide whistle.
   */
  function tone(type, from, to, seconds, peak, delay = 0) {
    const audio = ensure();
    if (audio === null || muted) return;
    const start = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + seconds);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + Math.min(0.018, seconds * 0.3));
    amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(amp);
    amp.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  /** A short filtered noise burst, for the thud of a crash and the scuff of a landing. */
  function thud(seconds, peak, cutoff, delay = 0) {
    const audio = ensure();
    if (audio === null || muted) return;
    const frames = Math.max(1, Math.floor(audio.sampleRate * seconds));
    const buffer = audio.createBuffer(1, frames, audio.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x2545f491;
    for (let index = 0; index < frames; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const fade = 1 - index / frames;
      data[index] = ((seed >>> 0) / 2147483648 - 1) * fade * fade;
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const amp = audio.createGain();
    amp.gain.value = peak;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    source.start(audio.currentTime + delay);
  }

  /** Feathery upward chirp for a jump. */
  function playJump() {
    tone('square', 430, 780, 0.11, 0.1);
    tone('triangle', 240, 520, 0.1, 0.09, 0.012);
  }

  /** Bright two-note pluck for corn. */
  function playPickup() {
    tone('triangle', 880, 880, 0.075, 0.16);
    tone('triangle', 1318.5, 1318.5, 0.09, 0.13, 0.06);
  }

  /** A clipping hit: wooden thud plus a flat low note. */
  function playHit() {
    thud(0.26, 0.42, 480);
    tone('sine', 170, 62, 0.24, 0.26);
    tone('square', 120, 90, 0.12, 0.08, 0.02);
  }

  /** Caught by the farmer: three sagging notes and a heavy landing. */
  function playCaught() {
    tone('sawtooth', 392, 300, 0.16, 0.14);
    tone('sawtooth', 300, 220, 0.18, 0.14, 0.16);
    tone('sawtooth', 220, 130, 0.24, 0.14, 0.34);
    tone('sine', 140, 55, 0.7, 0.2, 0.5);
    thud(0.3, 0.32, 320, 0.5);
  }

  /** Into the treeline: a rising five-note fanfare with a held top note. */
  function playEscape() {
    const tune = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    for (let index = 0; index < tune.length; index += 1) {
      tone('triangle', tune[index], tune[index], 0.17, 0.18, index * 0.105);
      tone('sine', tune[index] / 2, tune[index] / 2, 0.2, 0.09, index * 0.105);
    }
    tone('triangle', 1567.98, 1567.98, 0.55, 0.14, 0.58);
    tone('sine', 783.99, 783.99, 0.55, 0.08, 0.58);
  }

  /** Mute on or off; returns the new muted state. */
  function toggleMute() {
    muted = !muted;
    if (master !== null) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(muted ? 0 : 0.5, now, 0.02);
    }
    return muted;
  }

  return {
    playJump,
    playPickup,
    playHit,
    playCaught,
    playEscape,
    toggleMute,
    isMuted() {
      return muted;
    },
    /** Called from the first user gesture so the context is allowed to start. */
    unlock() {
      ensure();
    },
  };
}
