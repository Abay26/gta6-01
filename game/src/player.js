// Rico Vega on foot v2: walk, sprint, punch, shoot, steal cars, bikes and
// boats, open the phone (Q), change the radio (R), and use every shop with F.
// His jacket colour is the one he bought at Tide & Thread.
import { AMMO_PACK } from './config.js';
import { resolveCircleBuildings } from './city.js';
import { scarePeds } from './pedestrians.js';
import { addWanted } from './police.js';
import { useEconomy } from './economy.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, health: 100, onFoot: true,
    punchCooldown: 0, shootCooldown: 0, hurtFlash: 0,
    hasPistol: false, ammo: 0, walkPhase: 0, jacket: '#e83a3a',
  };
}
function nearestCar(world, x, y, maxDist) {
  let best = null; let bestD = maxDist;
  for (const car of world.state.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
function tryEnterCar(world) {
  const s = world.state; const p = s.player;
  const car = nearestCar(world, p.x, p.y, 64);
  if (!car) return false;
  if (car.driver === 'cop') return false;
  if (car.spec.kind === 'boat' && p.y < 3440) return false; // wade in first
  if (car.driver === 'traffic') {
    const seen = s.cops.some((cop) => {
      const cx = cop.kind === 'car' ? cop.car.x : cop.x;
      const cy = cop.kind === 'car' ? cop.car.y : cop.y;
      return Math.hypot(cx - p.x, cy - p.y) < 520;
    });
    if (seen) addWanted(world, 1, 'You stole a car in front of the cops');
    else world.events.push({ kind: 'toast', text: car.spec.kind === 'boat' ? 'Boat taken — cast off' : 'Car stolen — keep it quiet' });
    const ped = { x: car.x - 30, y: car.y - 30, angle: 0, speed: 0, color: '#4e7ad9', name: 'Driver', target: { x: car.x - 400, y: car.y - 400 }, wait: 0, flee: 5, health: 30, dead: false, walkPhase: 0, kind: 'stroller' };
    s.peds.push(ped);
    car.stolen = true;
  }
  car.driver = 'player'; s.playerCar = car; p.onFoot = false;
  world.audio.click();
  return true;
}
function exitCar(world) {
  const s = world.state; const car = s.playerCar;
  if (!car) return;
  car.driver = 'parked'; car.speed = 0; s.playerCar = null;
  const p = s.player;
  p.onFoot = true;
  if (car.spec.kind === 'boat') { p.x = car.x; p.y = Math.min(car.y - 60, 3500); }
  else {
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 36;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 36;
  }
  p.angle = car.angle;
  world.audio.engine(0, false);
}
function punch(world) {
  const s = world.state; const p = s.player;
  if (p.punchCooldown > 0) return;
  p.punchCooldown = 0.35; world.audio.thud();
  const reach = 42;
  const hx = p.x + Math.cos(p.angle) * reach; const hy = p.y + Math.sin(p.angle) * reach;
  for (const ped of s.peds) {
    if (ped.dead) continue;
    if (Math.hypot(ped.x - hx, ped.y - hy) < 34) {
      ped.health -= 14; ped.flee = 4;
      ped.target = { x: ped.x + (ped.x - p.x) * 3, y: ped.y + (ped.y - p.y) * 3 };
      world.events.push({ kind: 'hit', x: ped.x, y: ped.y });
      if (s.cops.length > 0) addWanted(world, 1, 'Assault, witnessed by the police');
    }
  }
  for (const cop of s.cops) {
    if (cop.kind !== 'foot' || cop.gone) continue;
    if (Math.hypot(cop.x - hx, cop.y - hy) < 34) {
      cop.health -= 14; cop.x += Math.cos(p.angle) * 26; cop.y += Math.sin(p.angle) * 26;
      world.events.push({ kind: 'hit', x: cop.x, y: cop.y });
      addWanted(world, 1, 'You hit a cop');
    }
  }
}
function shoot(world, mouseWorld) {
  const s = world.state; const p = s.player;
  if (!p.hasPistol || p.ammo <= 0 || p.shootCooldown > 0) return;
  p.shootCooldown = 0.22; p.ammo -= 1; world.audio.shot();
  const angle = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);
  p.angle = angle;
  const range = 560;
  const tx = p.x + Math.cos(angle) * range; const ty = p.y + Math.sin(angle) * range;
  world.particles.push({ kind: 'tracer', x: p.x, y: p.y, x2: tx, y2: ty, life: 0.08, max: 0.08 });
  world.particles.push({ kind: 'flash', x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22, life: 0.06, max: 0.06 });
  let best = null; let bestD = range;
  const targets = [];
  for (const ped of s.peds) if (!ped.dead) targets.push({ x: ped.x, y: ped.y, r: 16, hit: () => { ped.health -= 30; ped.flee = 5; } });
  for (const cop of s.cops) {
    if (cop.kind === 'foot' && !cop.gone) targets.push({ x: cop.x, y: cop.y, r: 16, hit: () => { cop.health -= 30; } });
    if ((cop.kind === 'car' || cop.kind === 'roadblock') && !cop.car.dead) targets.push({ x: cop.car.x, y: cop.car.y, r: 26, hit: () => { cop.car.health -= 30; } });
  }
  for (const car of s.cars) {
    if (car.dead || car.driver === 'player') continue;
    targets.push({ x: car.x, y: car.y, r: 26, hit: () => { car.health -= 30; } });
  }
  for (const t of targets) {
    const dx = t.x - p.x; const dy = t.y - p.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (along < 0 || along > bestD) continue;
    const side = Math.abs(dx * -Math.sin(angle) + dy * Math.cos(angle));
    if (side < t.r) { best = t; bestD = along; }
  }
  if (best) {
    best.hit();
    world.events.push({ kind: 'hit', x: best.x, y: best.y });
    world.particles.push({ kind: 'flash', x: best.x, y: best.y, life: 0.1, max: 0.1 });
  }
  scarePeds(world, p.x, p.y, 420);
  addWanted(world, 1, 'Shots fired — the cops are coming');
}
export function updatePlayer(world, dt, input, mouseWorld) {
  const s = world.state; const p = s.player;
  p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  if (!p.onFoot) return;
  if (p.hasPistol) p.angle = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);
  const mx = (input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0);
  const my = (input.down('down') ? 1 : 0) - (input.down('up') ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  const speed = input.down('run') ? 300 : 195;
  if (moving) {
    const len = Math.hypot(mx, my);
    const nx = p.x + (mx / len) * speed * dt;
    const ny = p.y + (my / len) * speed * dt;
    const fixed = resolveCircleBuildings(world.city, nx, ny, 13);
    p.x = Math.max(30, Math.min(3570, fixed.x));
    p.y = Math.max(30, Math.min(3570, fixed.y));
    if (!p.hasPistol) p.angle = Math.atan2(my, mx);
    p.walkPhase += dt * 11;
  }
  if (input.pressed('punch')) punch(world);
  if (input.mouse.down || input.mouse.clicked) shoot(world, mouseWorld);
  if (input.pressed('enter')) tryEnterCar(world);
  if (input.pressed('interact')) useEconomy(world);
  if (s.wanted === 0 && p.health < 100) p.health = Math.min(100, p.health + 3 * dt);
  void AMMO_PACK;
}
export { exitCar };
