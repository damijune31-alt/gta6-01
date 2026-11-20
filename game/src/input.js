// Keyboard + mouse input for SOLMAR HEAT.
// Held keys steer; one-shot presses (start, pause, enter car, shoot) are queued as
// bit flags and taken once by the loop, so a press between two frames is never lost
// and never counted twice. Mouse drag orbits the camera; click fires the pistol.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_SHOOT = 8;
export const ACTION_INTERACT = 16;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE']);
const SHOOT_KEY = new Set(['KeyF']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dragX = 0;
  let dragging = false;
  let lastX = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER_CAR.has(event.code)) actions |= ACTION_ENTER_CAR | ACTION_INTERACT;
    else if (SHOOT_KEY.has(event.code)) actions |= ACTION_SHOOT;
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    if (event.button === 0) actions |= ACTION_SHOOT;
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragX += event.clientX - lastX;
    lastX = event.clientX;
  });
  window.addEventListener('pointerup', () => { dragging = false; });

  const held = (set) => {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  };

  return {
    forward() { return held(FORWARD) ? 1 : 0; },
    back() { return held(BACK) ? 1 : 0; },
    left() { return held(LEFT) ? 1 : 0; },
    right() { return held(RIGHT) ? 1 : 0; },
    run() { return held(RUN); },
    /** Camera orbit accumulated since the last call, in pixels of drag. */
    takeDrag() { const d = dragX; dragX = 0; return d; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
