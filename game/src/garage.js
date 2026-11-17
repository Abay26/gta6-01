// Vehicles: arcade driving for the player's car, bike or boat, waypoint
// traffic on the avenues, and car-vs-car / car-vs-wall crashes.
import { VEHICLES, ROADS, ROAD_W } from './tuning.js';
import { slideOutOfBuildings, clampWorld, inSea, nearestRoadPoint, onRoad } from './atlas.js';
import { frighten } from './crowd.js';

export function makeVehicle(rng, x, y, angle, type, opts = {}) {
  const spec = VEHICLES[type];
  return {
    x, y, angle, speed: 0, type, driver: opts.driver ?? 'parked',
    color: opts.color ?? spec.color ?? '#888888',
    health: opts.health ?? spec.hull, maxHealth: spec.hull,
    target: opts.target ?? null, stuck: 0, honk: 0,
  };
}
export function nearestVehicle(world, x, y, maxDist) {
  let best = null; let bd = maxDist;
  for (const v of world.state.vehicles) {
    if (v.driver === 'cop') continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
function turnToward(v, tx, ty, dt, rate) {
  const want = Math.atan2(ty - v.y, tx - v.x);
  let diff = want - v.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  v.angle += Math.max(-rate * dt, Math.min(rate * dt, diff));
  return Math.abs(diff);
}
function driveForward(v, dt) {
  v.x += Math.cos(v.angle) * v.speed * dt;
  v.y += Math.sin(v.angle) * v.speed * dt;
}
function collideWalls(world, v) {
  const spec = VEHICLES[v.type];
  const r = spec.len / 2;
  const fixed = slideOutOfBuildings(world.atlas, v.x, v.y, r);
  if (fixed.x !== v.x || fixed.y !== v.y) {
    if (Math.abs(v.speed) > 240) {
      world.events.push({ kind: 'crash', x: v.x, y: v.y, big: v.driver === 'player' });
      if (v.driver === 'player') world.state.hero.health -= 4;
    }
    v.x = fixed.x; v.y = fixed.y;
    v.speed *= -0.25;
  }
  const c = clampWorld(v.x, v.y);
  v.x = c.x; v.y = c.y;
  if (v.type === 'boat') {
    if (!inSea(v.x, v.y) && v.y < 3480) { v.y = 3480; v.speed *= 0.4; }
  } else if (inSea(v.x, v.y)) {
    // A road car in the drink stalls out.
    v.speed *= 0.9;
    if (v.driver === 'player') world.state.hero.health -= 2 * 0.016;
  }
}
export function stepPlayerVehicle(world, dt, keys) {
  const s = world.state;
  const v = s.car;
  if (!v) return;
  const spec = VEHICLES[v.type];
  const throttle = keys.isDown('up') ? 1 : keys.isDown('down') ? -0.6 : 0;
  v.speed += throttle * spec.accel * dt;
  // Rolling drag and braking.
  v.speed -= v.speed * 0.55 * dt;
  if (!keys.isDown('up') && !keys.isDown('down')) v.speed -= v.speed * 0.8 * dt;
  v.speed = Math.max(-spec.top * 0.45, Math.min(spec.top, v.speed));
  const steer = (keys.isDown('left') ? -1 : 0) + (keys.isDown('right') ? 1 : 0);
  if (steer !== 0 && Math.abs(v.speed) > 20) {
    v.angle += steer * spec.steer * dt * Math.min(1, Math.abs(v.speed) / 220) * Math.sign(v.speed);
  }
  driveForward(v, dt);
  collideWalls(world, v);
  s.hero.x = v.x; s.hero.y = v.y; s.hero.angle = v.angle;
  world.sound.engine(v.speed, true);
  // Speed scares the crowd off the road.
  if (Math.abs(v.speed) > 300) frighten(world, v.x, v.y, 130);
  // Boat wake.
  if (v.type === 'boat' && Math.abs(v.speed) > 150 && world.rng.chance(0.5)) {
    world.fx.push({ kind: 'wake', x: v.x - Math.cos(v.angle) * 30, y: v.y - Math.sin(v.angle) * 30, vx: 0, vy: 0, life: 0.9, max: 0.9, color: '#cfeef5', size: 6 });
  }
}
export function stepTraffic(world, dt) {
  const s = world.state;
  for (const v of s.vehicles) {
    if (v.driver !== 'traffic') continue;
    const spec = VEHICLES[v.type];
    if (!v.target) v.target = randomJunction(world);
    // Follow the road grid: first along the nearest avenue to the
    // target's street, then down that street to the junction. Cars never
    // cut diagonally across a block.
    const nearestLine = (coord) => ROADS.reduce((best, line) => (Math.abs(line - coord) < Math.abs(best - coord) ? line : best), ROADS[0]);
    const hy = nearestLine(v.y);
    const along = Math.abs(v.x - v.target.x) > 60;
    const goal = along ? { x: v.target.x, y: hy } : v.target;
    const diff = turnToward(v, goal.x, goal.y, dt, 2.2);
    const want = v.type === 'bike' ? 260 : 200;
    v.speed += (want - v.speed) * Math.min(1, dt * 0.8);
    if (diff > 1.2) v.speed *= 0.94;
    driveForward(v, dt);
    collideWalls(world, v);
    if (Math.hypot(v.target.x - v.x, v.target.y - v.y) < 90) v.target = randomJunction(world);
    // Don't let traffic pile up on the player.
    if (s.car && Math.hypot(v.x - s.car.x, v.y - s.car.y) < 70) v.speed *= 0.92;
  }
}
function randomJunction(world) {
  const lx = world.rng.pick(ROADS);
  const ly = world.rng.pick(ROADS);
  return { x: lx + world.rng.range(-20, 20), y: ly + world.rng.range(-20, 20) };
}
export function crashResolve(world) {
  const s = world.state;
  const all = s.vehicles;
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i]; const b = all[j];
      const dx = b.x - a.x; const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = (VEHICLES[a.type].len + VEHICLES[b.type].len) / 2 - 6;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d; const ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const impact = Math.abs(a.speed - b.speed);
        if (impact > 180) {
          a.health -= impact * 0.05; b.health -= impact * 0.05;
          world.events.push({ kind: 'crash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, big: a.driver === 'player' || b.driver === 'player' });
          if (a.driver === 'player' || b.driver === 'player') frighten(world, a.x, a.y, 200);
        }
        const tmp = a.speed; a.speed = b.speed * 0.6; b.speed = tmp * 0.6;
      }
    }
  }
  // Burnt-out wrecks blow up, then vanish.
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const v = all[i];
    if (v.health <= 0) {
      world.events.push({ kind: 'explode', x: v.x, y: v.y });
      if (v.driver === 'player') { s.car = null; s.hero.health -= 30; world.sound.engine(0, false); }
      all.splice(i, 1);
      s.officers = s.officers.filter((o) => o.car !== v);
    }
  }
  void ROAD_W; void onRoad; void nearestRoadPoint;
}
