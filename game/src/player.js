// Rico Vega on foot: WASD to walk (Shift to sprint), Space to punch, mouse to
// aim and click to shoot once he owns a pistol, E to get in and out of cars,
// F to talk and to use shops. Fists are always there; the pistol is bought.
import { AMMO_PACK, AMMO_PRICE, PISTOL_PRICE } from './config.js';
import { resolveCircleBuildings } from './city.js';
import { scarePeds } from './pedestrians.js';
import { addWanted } from './police.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: 100, onFoot: true,
    punchCooldown: 0, shootCooldown: 0, hurtFlash: 0,
    hasPistol: false, ammo: 0,
    walkPhase: 0,
  };
}

function nearestCar(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of world.state.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function tryEnterCar(world) {
  const s = world.state;
  const p = s.player;
  const car = nearestCar(world, p.x, p.y, 64);
  if (!car) return false;
  if (car.driver === 'cop') return false;
  if (car.driver === 'traffic') {
    // Stealing a car in sight of the police is a crime they notice.
    const seen = s.cops.some((cop) => {
      const cx = cop.kind === 'car' ? cop.car.x : cop.x;
      const cy = cop.kind === 'car' ? cop.car.y : cop.y;
      return Math.hypot(cx - p.x, cy - p.y) < 520;
    });
    if (seen) addWanted(world, 1, 'You stole a car in front of the cops');
    else world.events.push({ kind: 'toast', text: 'Car stolen — keep it quiet' });
    // The driver bails and runs.
    const ped = { x: car.x - 30, y: car.y - 30, angle: 0, speed: 0, color: '#4e7ad9', name: 'Driver', target: { x: car.x - 400, y: car.y - 400 }, wait: 0, flee: 5, health: 30, dead: false, walkPhase: 0 };
    s.peds.push(ped);
    car.stolen = true;
  }
  car.driver = 'player';
  s.playerCar = car;
  p.onFoot = false;
  world.audio.click();
  return true;
}

function exitCar(world) {
  const s = world.state;
  const car = s.playerCar;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  s.playerCar = null;
  const p = s.player;
  p.onFoot = true;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 36;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 36;
  p.angle = car.angle;
  world.audio.engine(0, false);
}

function punch(world) {
  const s = world.state;
  const p = s.player;
  if (p.punchCooldown > 0) return;
  p.punchCooldown = 0.35;
  world.audio.thud();
  const reach = 42;
  const hx = p.x + Math.cos(p.angle) * reach;
  const hy = p.y + Math.sin(p.angle) * reach;
  // Peds and foot cops in front of the fist take the hit.
  for (const ped of s.peds) {
    if (ped.dead) continue;
    if (Math.hypot(ped.x - hx, ped.y - hy) < 34) {
      ped.health -= 14;
      ped.flee = 4;
      ped.target = { x: ped.x + (ped.x - p.x) * 3, y: ped.y + (ped.y - p.y) * 3 };
      world.events.push({ kind: 'hit', x: ped.x, y: ped.y });
      if (s.cops.length > 0) addWanted(world, 1, 'Assault, witnessed by the police');
    }
  }
  for (const cop of s.cops) {
    if (cop.kind !== 'foot' || cop.gone) continue;
    if (Math.hypot(cop.x - hx, cop.y - hy) < 34) {
      cop.health -= 14;
      cop.x += Math.cos(p.angle) * 26;
      cop.y += Math.sin(p.angle) * 26;
      world.events.push({ kind: 'hit', x: cop.x, y: cop.y });
      addWanted(world, 1, 'You hit a cop');
    }
  }
}

function shoot(world, mouseWorld) {
  const s = world.state;
  const p = s.player;
  if (!p.hasPistol || p.ammo <= 0 || p.shootCooldown > 0) return;
  p.shootCooldown = 0.22;
  p.ammo -= 1;
  world.audio.shot();
  const angle = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);
  p.angle = angle;
  const range = 560;
  const tx = p.x + Math.cos(angle) * range;
  const ty = p.y + Math.sin(angle) * range;
  world.particles.push({ kind: 'tracer', x: p.x, y: p.y, x2: tx, y2: ty, life: 0.08, max: 0.08 });
  world.particles.push({ kind: 'flash', x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22, life: 0.06, max: 0.06 });
  // The nearest thing along the shot line takes the bullet.
  let best = null;
  let bestD = range;
  const targets = [];
  for (const ped of s.peds) if (!ped.dead) targets.push({ x: ped.x, y: ped.y, r: 16, hit: () => { ped.health -= 30; ped.flee = 5; } });
  for (const cop of s.cops) {
    if (cop.kind === 'foot' && !cop.gone) targets.push({ x: cop.x, y: cop.y, r: 16, hit: () => { cop.health -= 30; } });
    if (cop.kind === 'car' && !cop.car.dead) targets.push({ x: cop.car.x, y: cop.car.y, r: 26, hit: () => { cop.car.health -= 30; } });
  }
  for (const car of s.cars) {
    if (car.dead || car.driver === 'player') continue;
    targets.push({ x: car.x, y: car.y, r: 26, hit: () => { car.health -= 30; } });
  }
  for (const t of targets) {
    const dx = t.x - p.x;
    const dy = t.y - p.y;
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

function useShop(world) {
  const s = world.state;
  const p = s.player;
  const shop = world.city.landmarks.gunshop;
  const garage = world.city.landmarks.garage;
  const dShop = Math.hypot(p.x - shop.x, p.y - (shop.y + shop.h / 2 + 70));
  const dGarage = Math.hypot(p.x - garage.x, p.y - (garage.y + garage.h / 2 + 70));
  if (dShop < 90) {
    if (!p.hasPistol && s.cash >= PISTOL_PRICE) {
      s.cash -= PISTOL_PRICE;
      p.hasPistol = true;
      p.ammo = AMMO_PACK;
      world.events.push({ kind: 'toast', text: `Pistol bought — $${PISTOL_PRICE}. Aim with the mouse, click to fire.` });
      world.audio.cash();
    } else if (p.hasPistol && s.cash >= AMMO_PRICE) {
      s.cash -= AMMO_PRICE;
      p.ammo += AMMO_PACK;
      world.events.push({ kind: 'toast', text: `Ammo +${AMMO_PACK} — $${AMMO_PRICE}` });
      world.audio.cash();
    } else {
      world.events.push({ kind: 'toast', text: p.hasPistol ? 'Not enough cash for ammo ($60)' : 'Pistol costs $400 — earn some cash first' });
    }
    return true;
  }
  if (dGarage < 90 && s.playerCar) {
    const car = s.playerCar;
    const cost = Math.ceil((car.maxHealth - car.health) * 0.8);
    if (car.health < car.maxHealth && s.cash >= cost) {
      s.cash -= cost;
      car.health = car.maxHealth;
      world.events.push({ kind: 'toast', text: `Car repaired — $${cost}` });
      world.audio.cash();
    } else if (car.health >= car.maxHealth) {
      world.events.push({ kind: 'toast', text: 'The car is already in perfect shape' });
    } else {
      world.events.push({ kind: 'toast', text: `Repair costs $${cost} — not enough cash` });
    }
    return true;
  }
  return false;
}

export function updatePlayer(world, dt, input, mouseWorld) {
  const s = world.state;
  const p = s.player;
  p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  if (!p.onFoot) return;
  // Aim follows the mouse when armed; otherwise the player faces where he walks.
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
  if (input.pressed('interact')) {
    if (!useShop(world)) {
      // F near an NPC also talks (missions handle their own F prompts).
    }
  }
  // Slow health recovery out of trouble.
  if (s.wanted === 0 && p.health < 100) p.health = Math.min(100, p.health + 3 * dt);
}
