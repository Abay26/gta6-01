// The wanted system and the Solmar PD v2. Stars rise when the player is seen
// doing something criminal. Police cars chase and ram, foot cops run the
// player down, roadblocks appear at 3 stars and a police helicopter circles
// at 4–5 stars with a searchlight that keeps the heat from cooling. Hide out
// of sight and the heat fades, one star at a time. BUSTED or WASTED wakes the
// player at Solmar General — or at the Marina Loft, if they own it.
import { makeCar } from './vehicles.js';
import { nearestRoadPoint, resolveCircleBuildings } from './city.js';

export const MAX_WANTED = 5;
export function copsForStars(stars) {
  return {
    cars: Math.min(4, Math.ceil(stars)),
    foot: stars >= 2 ? Math.min(3, stars - 1) : 0,
    roadblock: stars >= 3,
    heli: stars >= 4,
  };
}
export function addWanted(world, amount, reason) {
  const s = world.state;
  const before = s.wanted;
  s.wanted = Math.max(0, Math.min(MAX_WANTED, s.wanted + amount));
  if (s.wanted > before) {
    s.toasts.push({ text: reason || 'The police are onto you', ttl: 4 });
    if (s.toasts.length > 3) s.toasts.shift();
    s.hiddenTimer = 0;
  }
}
function spawnCopCar(world) {
  const s = world.state; const p = s.player;
  const spot = nearestRoadPoint(p.x + world.rng.range(-800, 800), p.y + world.rng.range(-800, 800));
  const sx = Math.max(60, Math.min(3540, spot.x + world.rng.range(-160, 160)));
  const sy = Math.max(60, Math.min(3540, spot.y + world.rng.range(-160, 160)));
  const car = makeCar(world.rng, sx, sy, 0, 'police', { driver: 'cop' });
  car.target = { x: spot.x, y: spot.y, ix: spot.x, iy: spot.y };
  s.cars.push(car);
  s.cops.push({ kind: 'car', car, bustedTimer: 0 });
  return car;
}
function spawnFootCop(world) {
  const s = world.state; const p = s.player;
  const angle = world.rng.range(0, Math.PI * 2);
  const cop = { kind: 'foot', x: p.x + Math.cos(angle) * 500, y: p.y + Math.sin(angle) * 500, angle: 0, speed: 0, health: 60, punchCooldown: 0, bustedTimer: 0 };
  s.cops.push(cop);
  return cop;
}
// A roadblock: two police cars parked across the road ahead of the player.
export function spawnRoadblock(world) {
  const s = world.state;
  const p = s.playerCar ?? s.player;
  const ahead = nearestRoadPoint(p.x + Math.cos(p.angle || 0) * 500, p.y + Math.sin(p.angle || 0) * 500);
  for (const off of [-40, 40]) {
    const car = makeCar(world.rng, ahead.x + off, ahead.y, Math.PI / 2, 'police', { driver: 'cop' });
    car.speed = 0;
    s.cars.push(car);
    s.cops.push({ kind: 'roadblock', car, bustedTimer: 0, x: ahead.x + off, y: ahead.y });
  }
  s.roadblockTimer = 25;
  world.events.push({ kind: 'toast', text: 'Roadblock ahead — go around it!' });
}
function updateCopCar(world, dt, cop) {
  const s = world.state; const car = cop.car;
  if (car.dead) { cop.gone = true; return; }
  const p = s.playerCar ?? null;
  const tx = p ? p.x : s.player.x; const ty = p ? p.y : s.player.y;
  const dx = tx - car.x; const dy = ty - car.y;
  const dist = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx) + Math.sin(world.time * 1.3 + cop.car.id) * 0.12;
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const aggression = 0.85 + s.wanted * 0.08;
  car.speed += Math.max(-600 * dt, Math.min(600 * dt, car.spec.topSpeed * aggression - car.speed));
  car.angle += Math.max(-3.4 * dt, Math.min(3.4 * dt, diff * 3.2 * dt * 10));
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = resolveCircleBuildings(world.city, nx, ny, 20);
  if (fixed.x === nx && fixed.y === ny) { car.x = nx; car.y = ny; }
  else { car.speed *= 0.5; car.angle += 0.6; }
  if (p && dist < 46) {
    p.health -= 10 * dt; p.speed *= 0.92;
    if (world.rng.chance(dt * 2)) world.events.push({ kind: 'crash', x: car.x, y: car.y, big: false });
  }
  if (!p && dist < 26) { s.player.health -= 22 * dt; world.events.push({ kind: 'hurt', x: s.player.x, y: s.player.y }); }
  if (car.health <= 0 && !car.dead) { car.dead = true; world.events.push({ kind: 'explode', x: car.x, y: car.y }); cop.gone = true; }
}
function updateFootCop(world, dt, cop) {
  const s = world.state; const p = s.player;
  const dx = p.x - cop.x; const dy = p.y - cop.y;
  const dist = Math.hypot(dx, dy);
  cop.angle = Math.atan2(dy, dx);
  if (s.playerCar) cop.bustedTimer = 0;
  const speed = 235;
  const nx = cop.x + Math.cos(cop.angle) * speed * dt;
  const ny = cop.y + Math.sin(cop.angle) * speed * dt;
  const fixed = resolveCircleBuildings(world.city, nx, ny, 12);
  cop.x = fixed.x; cop.y = fixed.y;
  cop.punchCooldown = Math.max(0, cop.punchCooldown - dt);
  if (!s.playerCar && dist < 24) {
    if (cop.punchCooldown <= 0) { s.player.health -= 9; cop.punchCooldown = 0.7; world.events.push({ kind: 'hurt', x: p.x, y: p.y }); world.audio.thud(); }
    cop.bustedTimer += dt;
    if (cop.bustedTimer > 1.4) { world.events.push({ kind: 'busted' }); cop.bustedTimer = 0; }
  } else cop.bustedTimer = 0;
  if (cop.health <= 0) cop.gone = true;
}
export function updatePolice(world, dt) {
  const s = world.state;
  const want = copsForStars(s.wanted);
  let cars = 0; let foot = 0; let roadblocks = 0;
  for (const cop of s.cops) {
    if (cop.gone) continue;
    if (cop.kind === 'car') cars += 1;
    else if (cop.kind === 'foot') foot += 1;
    else if (cop.kind === 'roadblock') roadblocks += 1;
  }
  s.copSpawnTimer -= dt;
  if (s.copSpawnTimer <= 0) {
    if (cars < want.cars) { spawnCopCar(world); s.copSpawnTimer = 1.5; }
    else if (foot < want.foot) { spawnFootCop(world); s.copSpawnTimer = 1.5; }
  }
  // Roadblock: one at a time, refreshed while the heat stays at 3+.
  s.roadblockTimer = Math.max(0, (s.roadblockTimer || 0) - dt);
  if (want.roadblock && roadblocks === 0 && s.roadblockTimer <= 0) spawnRoadblock(world);
  if (!want.roadblock) {
    for (const cop of s.cops) if (cop.kind === 'roadblock') cop.gone = true;
  }
  // Helicopter: circles the player, its searchlight marking them.
  if (want.heli) {
    if (!s.heli) s.heli = { angle: 0, x: s.player.x, y: s.player.y };
    s.heli.angle += dt * 0.5;
    s.heli.x = s.player.x + Math.cos(s.heli.angle) * 260;
    s.heli.y = s.player.y + Math.sin(s.heli.angle) * 260 - 120;
  } else s.heli = null;
  let nearestCop = Infinity;
  for (const cop of s.cops) {
    if (cop.gone) continue;
    if (cop.kind === 'car') updateCopCar(world, dt, cop);
    else if (cop.kind === 'foot') updateFootCop(world, dt, cop);
    else if (cop.kind === 'roadblock' && cop.car.health <= 0) cop.gone = true;
    const cx = cop.kind === 'car' || cop.kind === 'roadblock' ? cop.car.x : cop.x;
    const cy = cop.kind === 'car' || cop.kind === 'roadblock' ? cop.car.y : cop.y;
    nearestCop = Math.min(nearestCop, Math.hypot(cx - s.player.x, cy - s.player.y));
  }
  s.cops = s.cops.filter((cop) => !cop.gone);
  if (s.wanted > 0) {
    // The helicopter's searchlight keeps the player spotted: heat never
    // cools while it circles overhead.
    if (s.heli) s.hiddenTimer = 0;
    else if (nearestCop > 620) s.hiddenTimer += dt;
    else s.hiddenTimer = 0;
    if (s.hiddenTimer > 9) {
      s.wanted -= 1; s.hiddenTimer = 0;
      world.events.push({ kind: 'heat', stars: s.wanted });
    }
  }
  world.audio.siren(s.cops.length > 0);
}
export function respawnAtHospital(world, kind) {
  const s = world.state;
  const fine = Math.floor(s.cash * (kind === 'busted' ? 0.15 : 0.1));
  s.cash -= fine; s.wanted = 0; s.cops = []; s.heli = null;
  s.player.health = 100; s.player.onFoot = true; s.playerCar = null;
  const home = s.ownsLoft ? world.city.landmarks.safehouse2 : world.city.landmarks.hospital;
  s.player.x = home.x; s.player.y = home.y + home.h / 2 + 60; s.player.angle = Math.PI / 2;
  world.events.push({ kind: 'respawn', fine, how: kind });
  world.audio.busted();
}
