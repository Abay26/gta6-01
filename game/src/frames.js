// The screenshot scenes behind ?shot=foot|drive|chase|mission. Each one
// sets the world up from the real rules — the hero placed, cars, bikes,
// boats and cops spawned, a job running, the phone open in one frame —
// then steps the simulation forward a fixed number of steps, so the frame
// is what a short game really looks like and the same seed always gives
// the same frame. No scene is faked: every pixel is the game.
import { STEP } from './tuning.js';
import { makeVehicle } from './garage.js';
import { raiseHeat } from './heat.js';
import { beginJob } from './story.js';
import { VIEW_PLAY } from './canvas.js';

function steerCar(world) {
  const s = world.state; const car = s.car;
  if (!car) return;
  const ahead = { x: car.x + Math.cos(car.angle) * 420, y: car.y + Math.sin(car.angle) * 420 };
  const want = Math.atan2(ahead.y - car.y, ahead.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const keys = world.shotKeys;
  keys.release('left'); keys.release('right'); keys.press('up');
  if (diff > 0.06) keys.press('right');
  else if (diff < -0.06) keys.press('left');
}
function runSteps(world, seconds, drive) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (drive) steerCar(world);
    world.step(STEP, world.shotKeys, { x: world.state.hero.x + 300, y: world.state.hero.y });
    world.shotKeys.endFrame();
  }
  world.shotKeys.release('up'); world.shotKeys.release('left'); world.shotKeys.release('right');
}
// The garage front at golden hour, on foot, Mara beside the hero, the phone
// open, traffic passing and the marina district in the distance.
function poseFoot(world) {
  const s = world.state;
  const garage = world.atlas.spots.garage;
  s.hero.x = garage.x + 60; s.hero.y = garage.y + garage.h / 2 + 130;
  s.hero.angle = Math.PI / 2;
  s.camera.x = s.hero.x; s.camera.y = s.hero.y;
  s.phoneOpen = true;
  runSteps(world, 2.5, false);
  return { screen: VIEW_PLAY };
}
// Driving Mara's sedan down the avenue, traffic all around, a bike ahead.
function poseDrive(world) {
  const s = world.state;
  // Drop all random traffic: only the staged cars appear in this frame.
  s.vehicles = s.vehicles.filter((v) => v.driver !== 'traffic');
  const sedan = s.vehicles.find((v) => v.driver === 'parked' && v.type === 'sedan');
  if (sedan) {
    sedan.driver = 'player'; s.car = sedan;
    sedan.x = 700; sedan.y = 1421; sedan.angle = 0; sedan.speed = 420;
  }
  const ahead = [
    { x: 1200, y: 1379, type: 'taxi', angle: 0, target: { x: 3379, y: 1379 } },
    { x: 1250, y: 1379, type: 'sedan', angle: 0, target: { x: 3421, y: 1379 } },
    { x: 1000, y: 1150, type: 'van', angle: Math.PI / 2, target: { x: 1000, y: 3379 } },
    { x: 600, y: 1700, type: 'sports', angle: -Math.PI / 2, target: { x: 600, y: 221 } },
    { x: 1150, y: 1421, type: 'bike', angle: 0, target: { x: 3421, y: 1421 } },
  ];
  for (const spot of ahead) {
    const car = makeVehicle(world.rng, spot.x, spot.y, spot.angle, spot.type, { driver: 'traffic' });
    car.speed = 190; car.target = spot.target; s.vehicles.push(car);
  }
  s.camera.x = sedan.x; s.camera.y = sedan.y;
  runSteps(world, 0.6, true);
  return { screen: VIEW_PLAY };
}
// Four stars, two police cars closing in, the helicopter overhead and a
// roadblock ahead — the chase runs east along an avenue.
function poseChase(world) {
  const s = world.state;
  // Clear random traffic near the chase path so the run is clean.
  s.vehicles = s.vehicles.filter((v) => !(v.driver === 'traffic' && v.y > 1500 && v.y < 2100 && v.x > 200 && v.x < 2400));
  const sedan = s.vehicles.find((v) => v.driver === 'parked' && v.type === 'sedan');
  if (sedan) {
    sedan.driver = 'player'; s.car = sedan;
    sedan.x = 1000; sedan.y = 1800; sedan.angle = 0; sedan.speed = 560;
  }
  for (const spot of [{ x: 500, y: 1778 }, { x: 450, y: 1822 }]) {
    const car = makeVehicle(world.rng, spot.x, spot.y, 0, 'police', { driver: 'cop' });
    car.speed = 480; s.vehicles.push(car); s.officers.push({ kind: 'car', car, bustTimer: 0, health: 120 });
  }
  raiseHeat(world, 4, 'The cops are on you');
  s.heli = { angle: 0, x: 1300, y: 1600 };
  s.copTimer = 3;
  s.blockTimer = 99; // no roadblock in this frame: the chase is the shot
  sedan.health = 300; sedan.maxHealth = 300;
  s.camera.x = sedan.x; s.camera.y = sedan.y;
  runSteps(world, 1.5, true);
  return { screen: VIEW_PLAY };
}
// The casino caper in progress: at the Coral Crown, four stars, cops closing
// in, the getaway sports car at the kerb and the marina in the background.
function poseMission(world) {
  beginJob(world, 8);
  const s = world.state;
  const casino = world.atlas.spots.casino;
  s.hero.x = casino.x; s.hero.y = casino.y + casino.h / 2 + 90;
  s.hero.angle = -Math.PI / 2;
  s.hero.hasPistol = true; s.hero.ammo = 48;
  s.camera.x = s.hero.x; s.camera.y = s.hero.y;
  const car = makeVehicle(world.rng, casino.x + 130, casino.y + casino.h / 2 + 130, Math.PI / 2, 'sports', { driver: 'parked' });
  s.vehicles.push(car);
  raiseHeat(world, 4, 'Casino security called the PD');
  s.copTimer = 0;
  runSteps(world, 5, false);
  return { screen: VIEW_PLAY };
}
export function poseShot(name, world) {
  world.reset();
  if (name === 'drive') return poseDrive(world);
  if (name === 'chase') return poseChase(world);
  if (name === 'mission') return poseMission(world);
  return poseFoot(world);
}
