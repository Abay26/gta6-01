// The screenshot scenes behind ?shot=foot|drive|chase|mission. Each one sets
// the world up from the real rules — the player placed, cars and cops spawned,
// a job running — then steps the simulation forward a fixed number of steps,
// so the frame is what a short game really looks like and the same seed
// always gives the same frame. No scene is faked: every pixel is the game.
import { STEP } from './config.js';
import { makeCar } from './vehicles.js';
import { addWanted } from './police.js';
import { startMission } from './missions.js';
import { SCREEN_PLAY } from './render.js';

// A car the autopilot drives: hold W, steer toward the next road point ahead.
function driveForward(world, dt) {
  const s = world.state;
  const car = s.playerCar;
  if (!car) return;
  // Steer toward a point 400 units ahead on the avenue the car is on.
  const ahead = { x: car.x + Math.cos(car.angle) * 420, y: car.y + Math.sin(car.angle) * 420 };
  const want = Math.atan2(ahead.y - car.y, ahead.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const input = world.shotInput;
  input.release('left');
  input.release('right');
  input.press('up');
  if (diff > 0.06) input.press('right');
  else if (diff < -0.06) input.press('left');
  void dt;
}

function stepWorld(world, seconds, drive) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (drive) driveForward(world, STEP);
    world.step(STEP, world.shotInput, { x: world.state.player.x + 300, y: world.state.player.y });
    world.shotInput.endFrame();
  }
  world.shotInput.release('up');
  world.shotInput.release('left');
  world.shotInput.release('right');
}

// The garage front, on foot, with Mara beside the player and traffic passing.
function stageFoot(world) {
  const s = world.state;
  const garage = world.city.landmarks.garage;
  s.player.x = garage.x + 60;
  s.player.y = garage.y + garage.h / 2 + 130;
  s.player.angle = Math.PI / 2;
  s.camera.x = s.player.x;
  s.camera.y = s.player.y;
  stepWorld(world, 2.5, false);
  return { screen: SCREEN_PLAY };
}

// Driving Mara's sedan down the avenue, traffic all around.
function stageDrive(world) {
  const s = world.state;
  const sedan = s.cars.find((car) => car.driver === 'parked' && car.type === 'sedan');
  if (sedan) {
    sedan.driver = 'player';
    s.playerCar = sedan;
    s.player.onFoot = false;
    sedan.x = 1000;
    sedan.y = 1400;
    sedan.angle = 0;
    sedan.speed = 420;
  }
  // Traffic ahead on the same avenue and crossing it, so the frame reads as
  // a busy street. They drive slower than the player, so he catches them up,
  // and their targets are set far down their own road so they stay on it.
  const ahead = [
    { x: 1900, y: 1379, type: 'taxi', angle: 0, target: { x: 3379, y: 1379, ix: 3400, iy: 1400 } },
    { x: 2500, y: 1421, type: 'sedan', angle: 0, target: { x: 3421, y: 1421, ix: 3400, iy: 1400 } },
    { x: 2621, y: 1050, type: 'van', angle: Math.PI / 2, target: { x: 2621, y: 3379, ix: 2600, iy: 3400 } },
    { x: 2821, y: 1950, type: 'sports', angle: -Math.PI / 2, target: { x: 2821, y: 221, ix: 2800, iy: 200 } },
  ];
  for (const spot of ahead) {
    const car = makeCar(world.rng, spot.x, spot.y, spot.angle, spot.type, { driver: 'traffic' });
    car.speed = 190;
    car.target = spot.target;
    s.cars.push(car);
  }
  s.camera.x = sedan.x;
  s.camera.y = sedan.y;
  stepWorld(world, 2.0, true);
  return { screen: SCREEN_PLAY };
}

// Three stars, two police cars closing in, the mission banner and minimap live.
// The chase runs east along an avenue, so it stays in the city, and the cop
// cars start right behind the player so they are in the frame at once.
function stageChase(world) {
  const s = world.state;
  const sedan = s.cars.find((car) => car.driver === 'parked' && car.type === 'sedan');
  if (sedan) {
    sedan.driver = 'player';
    s.playerCar = sedan;
    s.player.onFoot = false;
    sedan.x = 1000;
    sedan.y = 1800;
    sedan.angle = 0;
    sedan.speed = 520;
  }
  const copSpots = [
    { x: 720, y: 1778 },
    { x: 640, y: 1822 },
  ];
  for (const spot of copSpots) {
    const car = makeCar(world.rng, spot.x, spot.y, 0, 'police', { driver: 'cop' });
    car.speed = 480;
    s.cars.push(car);
    s.cops.push({ kind: 'car', car, bustedTimer: 0 });
  }
  addWanted(world, 3, 'The cops are on you');
  s.copSpawnTimer = 3;
  s.camera.x = sedan.x;
  s.camera.y = sedan.y;
  stepWorld(world, 5, true);
  return { screen: SCREEN_PLAY };
}

// The big score in progress: at the bank vault, four stars, cops closing in.
function stageMission(world) {
  startMission(world, 5);
  const s = world.state;
  const bank = world.city.landmarks.bank;
  s.player.x = bank.x;
  s.player.y = bank.y + bank.h / 2 + 90;
  s.player.angle = -Math.PI / 2;
  s.player.hasPistol = true;
  s.player.ammo = 48;
  s.camera.x = s.player.x;
  s.camera.y = s.player.y;
  // A getaway sports car waiting at the kerb.
  const car = makeCar(world.rng, bank.x + 130, bank.y + bank.h / 2 + 130, Math.PI / 2, 'sports', { driver: 'parked' });
  s.cars.push(car);
  addWanted(world, 4, 'The bank alarm is screaming');
  s.copSpawnTimer = 0;
  stepWorld(world, 5, false);
  return { screen: SCREEN_PLAY };
}

/**
 * Set `world` to the named scene (foot, drive, chase or mission; any other
 * name is foot) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'drive') return stageDrive(world);
  if (name === 'chase') return stageChase(world);
  if (name === 'mission') return stageMission(world);
  return stageFoot(world);
}
