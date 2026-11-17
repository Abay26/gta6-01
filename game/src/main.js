// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and how-to-play. Progress saves when a job is finished and when the
// game is paused.
//
// ?seed=N fixes the city and the traffic. ?shot=foot|drive|chase|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_HELP, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createHud } from './hud.js';
import { clearSave, readSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const hud = createHud(canvas);

function runShot(name) {
  const input = createInput(canvas);
  world.shotInput = input;
  window.__world = world; // debug handle: lets a play-test read the live state
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, { selected: 0, saveExists: false });
    hud.draw(world);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let selected = 0;
  let lastJobsDone = 0;
  let accumulator = 0;
  let last = performance.now();
  const save = readSave();
  const menuItems = () => (readSave() ? ['Continue', 'New Game', 'How to Play'] : ['New Game', 'How to Play']);

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function menuAction() {
    const items = menuItems();
    const choice = items[selected];
    world.audio.ensure();
    world.audio.click();
    if (choice === 'Continue') {
      world.reset();
      world.applySave(save);
      screen = SCREEN_PLAY;
      announce('Continuing your game in Solmar Bay.');
    } else if (choice === 'New Game') {
      clearSave();
      world.reset();
      screen = SCREEN_PLAY;
      announce('New game. Meet Mara at Solis Auto — follow the yellow marker.');
    } else {
      screen = SCREEN_HELP;
      announce('How to play.');
    }
    world.audio.startMusic();
  }

  function titleKeys() {
    const items = menuItems();
    if (input.pressed('up')) selected = (selected - 1 + items.length) % items.length;
    if (input.pressed('down')) selected = (selected + 1) % items.length;
    if (input.pressed('confirm') || input.mouse.clicked) menuAction();
  }

  function step() {
    const mouseWorld = renderer.worldPoint(input.mouse.x, input.mouse.y);
    if (screen === SCREEN_TITLE) {
      world.step(STEP, input, mouseWorld);
      // Slow orbit around downtown behind the menu, so the title feels alive.
      const t = world.time * 0.06;
      world.state.camera.x = 1800 + Math.cos(t) * 520;
      world.state.camera.y = 1800 + Math.sin(t) * 520;
      return;
    }
    if (screen === SCREEN_HELP) return;
    world.step(STEP, input, mouseWorld);
    // A finished job saves the game.
    if (world.state.missionDone.length !== lastJobsDone) {
      lastJobsDone = world.state.missionDone.length;
      writeSave(world);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (input.pressed('mute')) {
      world.audio.setMuted(!world.audio.muted);
      announce(world.audio.muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      titleKeys();
    } else if (screen === SCREEN_HELP) {
      if (input.pressed('confirm') || input.pressed('pause') || input.mouse.clicked) screen = SCREEN_TITLE;
    } else if (screen === SCREEN_PLAY) {
      if (input.pressed('pause')) {
        screen = SCREEN_PAUSED;
        writeSave(world);
        world.audio.engine(0, false);
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.pressed('pause') || input.pressed('confirm')) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const ui = { selected, saveExists: !!readSave() };
    renderer.draw(world, screen, ui);
    if (screen === SCREEN_PLAY) hud.draw(world);
    input.endFrame();
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      writeSave(world);
      announce('Paused.');
    }
  });

  announce('Solmar Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
