// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// painter paints what is there. The game moves between four screens:
// title, play, paused and how-to-play. Progress saves when a job is
// finished and when the game is paused. The phone (Q) and radio (R) are
// handled in the world step, so they work on foot and in a car alike.
//
// ?seed=N fixes the city and the traffic. ?shot=foot|drive|chase|mission
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { STEP } from './tuning.js';
import { makeRng } from './rng.js';
import { makeWorld } from './core.js';
import { makeKeys } from './keys.js';
import { makePainter, VIEW_HELP, VIEW_PAUSED, VIEW_PLAY, VIEW_TITLE } from './canvas.js';
import { makeInterface } from './interface.js';
import { loadVault, saveVault, wipeVault } from './vault.js';
import { poseShot } from './frames.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = makeWorld(makeRng(seed));
const painter = makePainter(canvas);
const hud = makeInterface(canvas);

// Any uncaught error is written into the page so a headless play-test can
// see it without devtools.
window.addEventListener('error', (e) => {
  const el = document.getElementById('errors');
  if (el) el.textContent += `${e.message} @ ${e.filename}:${e.lineno}; `;
});

// A scripted key set for the screenshot scenes: press/release held keys,
// never edge-triggered ones.
function makeShotKeys() {
  const held = new Set();
  return {
    held,
    mouse: { x: 0, y: 0, clicked: false, down: false },
    isDown: (a) => held.has(a),
    pressed: () => false,
    press: (a) => { held.add(a); },
    release: (a) => { held.delete(a); },
    endFrame: () => {},
  };
}
function runShot(name) {
  world.shotKeys = makeShotKeys();
  window.__world = world;
  const scene = poseShot(name, world);
  let painted = 0;
  function paint() {
    painter.draw(world, scene.screen, { selected: 0, saveExists: false });
    hud.draw(world);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}
function runGame() {
  const keys = makeKeys(canvas);
  window.__world = world;
  let screen = VIEW_TITLE;
  let selected = 0;
  let lastJobsDone = 0;
  let accumulator = 0;
  let last = performance.now();
  const save = loadVault();
  const menuItems = () => (loadVault() ? ['Continue', 'New Game', 'How to Play'] : ['New Game', 'How to Play']);
  function announce(message) { status.textContent = message; }
  function menuAction() {
    const items = menuItems();
    const choice = items[selected];
    world.sound.ensure(); world.sound.click();
    if (choice === 'Continue') {
      world.reset(); world.applySave(save); screen = VIEW_PLAY;
      announce('Continuing your game in Solmar Bay.');
    } else if (choice === 'New Game') {
      wipeVault(); world.reset(); screen = VIEW_PLAY;
      announce('New game. Meet Mara at Solis Auto — follow the yellow marker.');
    } else { screen = VIEW_HELP; announce('How to play.'); }
    world.sound.music(0);
  }
  function titleKeys() {
    const items = menuItems();
    if (keys.pressed('up')) selected = (selected - 1 + items.length) % items.length;
    if (keys.pressed('down')) selected = (selected + 1) % items.length;
    if (keys.pressed('confirm') || keys.mouse.clicked) menuAction();
  }
  function step() {
    const mouseWorld = painter.worldPoint(keys.mouse.x, keys.mouse.y);
    world.mouseX = keys.mouse.x; world.mouseY = keys.mouse.y;
    if (screen === VIEW_TITLE) {
      world.step(STEP, keys, mouseWorld);
      const t = world.time * 0.06;
      world.state.camera.x = 1800 + Math.cos(t) * 520;
      world.state.camera.y = 1800 + Math.sin(t) * 520;
      return;
    }
    if (screen === VIEW_HELP) return;
    world.step(STEP, keys, mouseWorld);
    const done = world.state.missionDone.length + world.state.sideJobsDone;
    if (done !== lastJobsDone) { lastJobsDone = done; saveVault(world); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (keys.pressed('mute')) {
      world.sound.setMuted(!world.sound.muted);
      announce(world.sound.muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === VIEW_TITLE) titleKeys();
    else if (screen === VIEW_HELP) {
      if (keys.pressed('confirm') || keys.pressed('pause') || keys.mouse.clicked) screen = VIEW_TITLE;
    } else if (screen === VIEW_PLAY) {
      if (keys.pressed('pause')) {
        screen = VIEW_PAUSED; saveVault(world); world.sound.engine(0, false);
        announce('Paused.');
      }
    } else if (screen === VIEW_PAUSED) {
      if (keys.pressed('pause') || keys.pressed('confirm')) { screen = VIEW_PLAY; announce('Playing.'); }
    }
    if (screen === VIEW_TITLE || screen === VIEW_PLAY) {
      // Consume edge-triggered presses after every step: a frame that runs
      // two steps must not see one keypress twice (board then exit, or
      // phone open then shut).
      while (accumulator >= STEP && (screen === VIEW_TITLE || screen === VIEW_PLAY)) { step(); keys.endFrame(); accumulator -= STEP; }
    } else accumulator = 0;
    const uiState = { selected, saveExists: !!loadVault() };
    painter.draw(world, screen, uiState);
    if (screen === VIEW_PLAY) hud.draw(world);
    keys.endFrame();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === VIEW_PLAY) { screen = VIEW_PAUSED; saveVault(world); announce('Paused.'); }
  });
  announce('Solmar Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}
if (shot) runShot(shot);
else runGame();
