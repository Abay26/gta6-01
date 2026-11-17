// Keyboard and mouse: WASD/arrows to move and drive, E to enter cars and
// talk, F to punch, mouse to aim, click to shoot, Q phone, R radio.
export const ACTION = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE'], punch: ['KeyF'], phone: ['KeyQ'], radio: ['KeyR'],
  mute: ['KeyM'], pause: ['KeyP', 'Escape'], confirm: ['Enter', 'Space'],
  digit1: ['Digit1'], digit2: ['Digit2'], digit3: ['Digit3'], digit4: ['Digit4'],
  sprint: ['ShiftLeft', 'ShiftRight'],
};
const KEYMAP = {};
for (const [action, codes] of Object.entries(ACTION)) for (const code of codes) KEYMAP[code] = action;

export function makeKeys(canvas) {
  const keys = {
    held: new Set(), hit: new Set(),
    mouse: { x: 0, y: 0, clicked: false, down: false },
  };
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) keys.hit.add(KEYMAP[e.code] ?? e.code);
    keys.held.add(KEYMAP[e.code] ?? e.code);
  });
  window.addEventListener('keyup', (e) => { keys.held.delete(KEYMAP[e.code] ?? e.code); });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    keys.mouse.x = e.clientX - r.left; keys.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { keys.mouse.clicked = true; keys.mouse.down = true; }
  });
  window.addEventListener('mouseup', () => { keys.mouse.down = false; });
  keys.isDown = (action) => keys.held.has(action);
  keys.pressed = (action) => keys.hit.has(action);
  keys.endFrame = () => { keys.hit.clear(); keys.mouse.clicked = false; };
  return keys;
}
