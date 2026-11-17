// Keyboard + mouse input v2. `down` is held, `pressed` fires once per
// physical press (the loop clears the edge set after each frame), so menus
// and actions never double-fire. Q opens the phone, R changes the radio,
// digits 1–3 pick a phone contact. Mouse position is kept in screen pixels.
export const ACTION = {
  UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right',
  RUN: 'run', PUNCH: 'punch', ENTER: 'enter', HORN: 'horn',
  PAUSE: 'pause', MUTE: 'mute', CONFIRM: 'confirm', INTERACT: 'interact',
  PHONE: 'phone', RADIO: 'radio', DIGIT1: 'digit1', DIGIT2: 'digit2', DIGIT3: 'digit3',
};
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run', Space: 'punch', KeyE: 'enter',
  KeyF: 'interact', KeyH: 'horn', KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute', Enter: 'confirm', KeyQ: 'phone', KeyR: 'radio',
  Digit1: 'digit1', Digit2: 'digit2', Digit3: 'digit3',
};
export function createInput(canvas) {
  const held = new Set(); const edge = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  function onKey(event, isDown) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (isDown) { if (!held.has(action)) edge.add(action); held.add(action); }
    else held.delete(action);
  }
  window.addEventListener('keydown', (event) => onKey(event, true));
  window.addEventListener('keyup', (event) => onKey(event, false));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left; mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => { if (event.button === 0) { mouse.down = true; mouse.clicked = true; } });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return {
    mouse,
    down(action) { return held.has(action); },
    pressed(action) { return edge.has(action); },
    press(action) { edge.add(action); held.add(action); },
    release(action) { held.delete(action); },
    endFrame() { edge.clear(); mouse.clicked = false; },
  };
}
