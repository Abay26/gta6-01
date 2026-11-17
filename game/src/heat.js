// The heat: a five-star wanted level, cop cars that chase and ram, foot
// cops that try to bust the player, roadblocks from three stars, and the
// police helicopter from four stars up.
import { ROADS } from './tuning.js';
import { makeVehicle } from './garage.js';
import { nearestRoadPoint } from './atlas.js';
import { frighten } from './crowd.js';

export const MAX_HEAT = 5;
export function heatCopCars(stars) { return Math.min(stars, 5); }
// Clear every cop from the street: their cars leave with them, so no
// frozen interceptor is left behind to witness the next carjacking.
export function purgeCops(world) {
  const s = world.state;
  const copCars = new Set(s.officers.filter((o) => o.car).map((o) => o.car));
  s.vehicles = s.vehicles.filter((v) => !copCars.has(v) && v.driver !== 'cop');
  s.officers = [];
  s.heli = null;
}
export function raiseHeat(world, amount, why) {
  const s = world.state;
  const before = s.wanted;
  s.wanted = Math.min(MAX_HEAT, s.wanted + amount);
  if (s.wanted > before) {
    s.hideTimer = 0;
    world.events.push({ kind: 'toast', text: why ?? `Wanted level ${s.wanted}` });
    if (s.wanted >= 3) world.sound.siren();
  }
}
function spawnCopCar(world) {
  const s = world.state;
  const spot = nearestRoadPoint(s.hero.x + world.rng.range(-700, 700), s.hero.y + world.rng.range(-700, 700));
  const car = makeVehicle(world.rng, spot.x, spot.y, 0, 'police', { driver: 'cop' });
  car.speed = 420;
  s.vehicles.push(car);
  s.officers.push({ kind: 'car', car, bustTimer: 0, health: 120 });
}
function spawnFootCop(world) {
  const s = world.state;
  const spot = nearestRoadPoint(s.hero.x + world.rng.range(-400, 400), s.hero.y + world.rng.range(-400, 400));
  s.officers.push({ kind: 'foot', x: spot.x, y: spot.y, angle: 0, health: 100, bustTimer: 0, stagger: 0 });
}
export function spawnRoadblock(world) {
  const s = world.state;
  const ahead = s.car ? { x: s.car.x + Math.cos(s.car.angle) * 500, y: s.car.y + Math.sin(s.car.angle) * 500 } : { x: s.hero.x + 400, y: s.hero.y };
  const spot = nearestRoadPoint(ahead.x, ahead.y);
  for (const off of [{ x: -40, y: -30 }, { x: 40, y: 30 }]) {
    const car = makeVehicle(world.rng, spot.x + off.x, spot.y + off.y, Math.PI / 2, 'police', { driver: 'cop' });
    car.speed = 0;
    s.vehicles.push(car);
    s.officers.push({ kind: 'block', car, bustTimer: 0, health: 120 });
  }
  world.events.push({ kind: 'toast', text: 'Roadblock ahead!' });
}
function stepCopCar(world, dt, cop) {
  const s = world.state;
  const car = cop.car;
  if (!car || !s.vehicles.includes(car)) { cop.dead = true; return; }
  const target = s.car ?? s.hero;
  const dx = target.x - car.x; const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-3.4 * dt, Math.min(3.4 * dt, diff));
  const chase = s.wanted >= 4 ? 640 : 560;
  car.speed += ((dist > 120 ? chase : 300) - car.speed) * Math.min(1, dt * 1.2);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Ram the player's car; slow and close for a while means a bust.
  if (dist < 52) {
    if (s.car) {
      s.car.health -= 26 * dt;
      if (Math.abs(s.car.speed) < 60) {
        cop.bustTimer += dt;
        if (cop.bustTimer > 2.5) world.events.push({ kind: 'busted' });
      } else cop.bustTimer = 0;
    } else {
      cop.bustTimer += dt;
      if (cop.bustTimer > 2.0) world.events.push({ kind: 'busted' });
    }
  } else cop.bustTimer = 0;
}
function stepFootCop(world, dt, cop) {
  const s = world.state;
  cop.stagger = Math.max(0, (cop.stagger ?? 0) - dt);
  if (cop.stagger > 0) return;
  const target = s.car ? { x: s.car.x, y: s.car.y } : s.hero;
  const dx = target.x - cop.x; const dy = target.y - cop.y;
  const dist = Math.hypot(dx, dy);
  cop.angle = Math.atan2(dy, dx);
  const speed = dist > 300 ? 300 : 210;
  cop.x += Math.cos(cop.angle) * speed * dt;
  cop.y += Math.sin(cop.angle) * speed * dt;
  if (dist < 34 && !s.car) {
    cop.bustTimer += dt;
    if (cop.bustTimer > 2.0) world.events.push({ kind: 'busted' });
  } else cop.bustTimer = 0;
}
export function stepHeat(world, dt) {
  const s = world.state;
  if (s.wanted <= 0) {
    if (s.officers.length > 0 || s.heli) purgeCops(world);
    return;
  }
  // Keep the right number of cop cars on the street.
  s.copTimer -= dt;
  const cars = s.officers.filter((o) => o.kind === 'car').length;
  if (s.copTimer <= 0 && cars < heatCopCars(s.wanted)) { spawnCopCar(world); s.copTimer = 2.2; }
  const feet = s.officers.filter((o) => o.kind === 'foot').length;
  if (s.wanted <= 2 && feet < 2 && s.copTimer <= 0) { spawnFootCop(world); s.copTimer = 2.2; }
  // Roadblocks from three stars.
  s.blockTimer -= dt;
  if (s.wanted >= 3 && s.blockTimer <= 0) { spawnRoadblock(world); s.blockTimer = 22; }
  // The helicopter from four stars.
  if (s.wanted >= 4) {
    if (!s.heli) s.heli = { angle: 0, x: s.hero.x, y: s.hero.y - 200 };
    s.heli.angle += dt * 0.7;
    s.heli.x += (s.hero.x - s.heli.x) * Math.min(1, dt * 1.4);
    s.heli.y += (s.hero.y - 160 - s.heli.y) * Math.min(1, dt * 1.4);
  } else s.heli = null;
  // Lose the heat by staying out of sight.
  const nearest = Math.min(
    ...s.officers.map((o) => (o.car ? Math.hypot(o.car.x - s.hero.x, o.car.y - s.hero.y) : Math.hypot(o.x - s.hero.x, o.y - s.hero.y))),
    9999,
  );
  if (nearest > 520) {
    s.hideTimer += dt;
    if (s.hideTimer > 5) {
      s.wanted -= 1; s.hideTimer = 0;
      world.events.push({ kind: 'heat', stars: s.wanted });
      if (s.wanted === 0) purgeCops(world);
    }
  } else s.hideTimer = 0;
  for (const cop of s.officers) {
    if (cop.kind === 'car') stepCopCar(world, dt, cop);
    else if (cop.kind === 'foot') stepFootCop(world, dt, cop);
  }
  s.officers = s.officers.filter((o) => !o.dead && (o.health ?? 100) > 0 && (!o.car || s.vehicles.includes(o.car)));
  void ROADS;
  void frighten;
}
export function respawnAfter(world, kind) {
  const s = world.state;
  const fine = Math.min(s.cash, 100);
  s.cash -= fine;
  s.wanted = 0;
  purgeCops(world);
  s.car = null;
  s.hero.health = 100;
  world.sound.engine(0, false);
  const home = s.ownsLoft ? world.atlas.spots.loft : world.atlas.spots.hospital;
  s.hero.x = home.x; s.hero.y = home.y + home.h / 2 + 60;
  s.camera.x = s.hero.x; s.camera.y = s.hero.y;
  world.events.push({ kind: 'respawn', how: kind, fine });
}
