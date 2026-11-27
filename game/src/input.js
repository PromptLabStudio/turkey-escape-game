// Keyboard and pointer input folded into the few intents the loop asks for once a frame.
// Jump, pause, restart, mute and confirm are queued edge presses, so a fast tap is never lost
// between frames; sliding is both an edge (a tap gives a full slide) and a held state.

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const SLIDE_KEYS = new Set(['ArrowDown', 'KeyS']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const RESTART_KEYS = new Set(['KeyR']);
const MUTE_KEYS = new Set(['KeyM']);
const CONFIRM_KEYS = new Set(['Enter', 'NumpadEnter']);

/** Game keys the browser must not also act on (page scroll, quick-find, space scrolling). */
const HANDLED = new Set([
  ...JUMP_KEYS, ...SLIDE_KEYS, ...PAUSE_KEYS, ...RESTART_KEYS, ...MUTE_KEYS, ...CONFIRM_KEYS,
]);

/**
 * Attach listeners to `canvas` (and the window for keys).
 * `onGesture` runs on the first real press or tap, which is when audio may start.
 * Returns intent readers the game loop calls; each `consume*` clears what it returns.
 */
export function createInput(canvas, onGesture) {
  let jumps = 0;
  let confirms = 0;
  let pauses = 0;
  let restarts = 0;
  let mutes = 0;
  let slideHeld = false;
  let slidePressed = false;
  let gestured = false;

  function gesture() {
    if (gestured) return;
    gestured = true;
    if (typeof onGesture === 'function') onGesture();
  }

  function onKeyDown(event) {
    const code = event.code;
    if (!HANDLED.has(code)) return;
    // Keep Space from scrolling, arrows from moving focus, Escape from leaving fullscreen.
    event.preventDefault();
    if (event.repeat) return;
    gesture();

    if (JUMP_KEYS.has(code)) {
      jumps += 1;
      confirms += 1;
    } else if (SLIDE_KEYS.has(code)) {
      slideHeld = true;
      slidePressed = true;
    } else if (PAUSE_KEYS.has(code)) {
      pauses += 1;
    } else if (RESTART_KEYS.has(code)) {
      restarts += 1;
    } else if (MUTE_KEYS.has(code)) {
      mutes += 1;
    } else if (CONFIRM_KEYS.has(code)) {
      confirms += 1;
    }
  }

  function onKeyUp(event) {
    if (SLIDE_KEYS.has(event.code)) slideHeld = false;
  }

  /** A click or a touch anywhere on the canvas jumps, and confirms on the title and end screens. */
  function onPointerDown(event) {
    if (event.button !== undefined && event.button > 0) return;
    event.preventDefault();
    gesture();
    jumps += 1;
    confirms += 1;
    slideHeld = false;
    // Focus the canvas so keyboard play works after a mouse-only start.
    if (typeof canvas.focus === 'function') canvas.focus();
  }

  /** Losing the window mid-slide must not leave the turkey stuck on its belly. */
  function onBlur() {
    slideHeld = false;
  }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** True once (then cleared) if a jump was pressed since the last call. */
    consumeJump() {
      if (jumps === 0) return false;
      jumps -= 1;
      return true;
    },
    /** True once (then cleared) if a slide key was pressed since the last call. */
    consumeSlidePress() {
      if (!slidePressed) return false;
      slidePressed = false;
      return true;
    },
    /** True while a slide key is physically held. */
    isSliding() {
      return slideHeld;
    },
    /** True once (then cleared) if the player asked to pause or resume. */
    consumePause() {
      if (pauses === 0) return false;
      pauses -= 1;
      return true;
    },
    /** True once (then cleared) if R was pressed. */
    consumeRestart() {
      if (restarts === 0) return false;
      restarts -= 1;
      return true;
    },
    /** True once (then cleared) if M was pressed. */
    consumeMute() {
      if (mutes === 0) return false;
      mutes -= 1;
      return true;
    },
    /** Enter, Space or a tap: start the run, or run again from the end screen. */
    consumeConfirm() {
      if (confirms === 0) return false;
      confirms -= 1;
      return true;
    },
    /** Drop every queued press, for a clean start of a new run. */
    clear() {
      jumps = 0;
      confirms = 0;
      pauses = 0;
      restarts = 0;
      mutes = 0;
      slidePressed = false;
    },
    /** Remove every listener, for a page that tears the game down. */
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
