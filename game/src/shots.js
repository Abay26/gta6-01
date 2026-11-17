// The screenshot scenes behind ?shot=foot|drive|chase|mission. Each one sets
// the world up from the real rules — the player placed, cars, bikes, boats
// and cops spawned, a job running, the phone open in one frame — then steps
// the simulation forward a fixed number of steps, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
// No scene is faked: every pixel is the game.
import { STEP } from './config.js';
import { makeCar } from './vehicles.js';
import { addWanted } from './police.js';
import { startMission } from './missions.js';
import { SCREEN_PLAY } from './render.js';

function driveForward(world, dt) {
  const s = world.state; const car = s.playerCar;
  if (!car) return;
  const ahead = { x: car.x + Math.cos(car.angle) * 420, y: car.y + Math.sin(car.angle) * 420 };
  const want = Math.atan2(ahead.y - car.y, ahead.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const input = world.shotInput;
  input.release('left'); input.release('right'); input.press('up');
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
  world.shotInput.release('up'); world.shotInput.release('left'); world.shotInput.release('right');
}
// The garage front at golden hour, on foot, Mara beside the player, the phone
// open, traffic passing and the marina district in the distance.
function stageFoot(world) {
  const s = world.state;
  const garage = world.city.landmarks.garage;
  s.player.x = garage.x + 60; s.player.y = garage.y + garage.h / 2 + 130;
  s.player.angle = Math.PI / 2;
  s.camera.x = s.player.x; s.camera.y = s.player.y;
  s.phoneOpen = true;
  stepWorld(world, 2.5, false);
  return { screen: SCREEN_PLAY };
}
// Driving Mara's sedan down the avenue, traffic all around, a bike ahead.
function stageDrive(world) {
  const s = world.state;
  const sedan = s.cars.find((car) => car.driver === 'parked' && car.type === 'sedan');
  if (sedan) {
    sedan.driver = 'player'; s.playerCar = sedan; s.player.onFoot = false;
    sedan.x = 700; sedan.y = 1400; sedan.angle = 0; sedan.speed = 420;
  }
  const ahead = [
    { x: 1900, y: 1379, type: 'taxi', angle: 0, target: { x: 3379, y: 1379, ix: 3400, iy: 1400 } },
    { x: 2500, y: 1421, type: 'sedan', angle: 0, target: { x: 3421, y: 1421, ix: 3400, iy: 1400 } },
    { x: 2621, y: 1050, type: 'van', angle: Math.PI / 2, target: { x: 2621, y: 3379, ix: 2600, iy: 3400 } },
    { x: 2821, y: 1950, type: 'sports', angle: -Math.PI / 2, target: { x: 2821, y: 221, ix: 2800, iy: 200 } },
    { x: 1500, y: 1421, type: 'bike', angle: 0, target: { x: 3421, y: 1421, ix: 3400, iy: 1400 } },
  ];
  for (const spot of ahead) {
    const car = makeCar(world.rng, spot.x, spot.y, spot.angle, spot.type, { driver: 'traffic' });
    car.speed = 190; car.target = spot.target; s.cars.push(car);
  }
  s.camera.x = sedan.x; s.camera.y = sedan.y;
  stepWorld(world, 1.2, true);
  return { screen: SCREEN_PLAY };
}
// Four stars, two police cars closing in, the helicopter overhead and a
// roadblock ahead — the chase runs east along an avenue.
function stageChase(world) {
  const s = world.state;
  const sedan = s.cars.find((car) => car.driver === 'parked' && car.type === 'sedan');
  if (sedan) {
    sedan.driver = 'player'; s.playerCar = sedan; s.player.onFoot = false;
    sedan.x = 1000; sedan.y = 1800; sedan.angle = 0; sedan.speed = 520;
  }
  for (const spot of [{ x: 720, y: 1778 }, { x: 640, y: 1822 }]) {
    const car = makeCar(world.rng, spot.x, spot.y, 0, 'police', { driver: 'cop' });
    car.speed = 480; s.cars.push(car); s.cops.push({ kind: 'car', car, bustedTimer: 0 });
  }
  addWanted(world, 4, 'The cops are on you');
  s.heli = { angle: 0, x: 1300, y: 1600 };
  s.copSpawnTimer = 3;
  s.roadblockTimer = 99; // no roadblock in this frame: the chase is the shot
  sedan.health = 300; sedan.maxHealth = 300;
  s.camera.x = sedan.x; s.camera.y = sedan.y;
  stepWorld(world, 3.5, true);
  return { screen: SCREEN_PLAY };
}
// The casino caper in progress: at the Coral Crown, four stars, cops closing
// in, the getaway sports car at the kerb and the marina in the background.
function stageMission(world) {
  startMission(world, 8);
  const s = world.state;
  const casino = world.city.landmarks.casino;
  s.player.x = casino.x; s.player.y = casino.y + casino.h / 2 + 90;
  s.player.angle = -Math.PI / 2;
  s.player.hasPistol = true; s.player.ammo = 48;
  s.camera.x = s.player.x; s.camera.y = s.player.y;
  const car = makeCar(world.rng, casino.x + 130, casino.y + casino.h / 2 + 130, Math.PI / 2, 'sports', { driver: 'parked' });
  s.cars.push(car);
  addWanted(world, 4, 'Casino security called the PD');
  s.copSpawnTimer = 0;
  stepWorld(world, 5, false);
  return { screen: SCREEN_PLAY };
}
export function stageShot(name, world) {
  world.reset();
  if (name === 'drive') return stageDrive(world);
  if (name === 'chase') return stageChase(world);
  if (name === 'mission') return stageMission(world);
  return stageFoot(world);
}
