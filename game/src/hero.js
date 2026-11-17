// Rico Vega on foot: walk, sprint, punch, shoot, and board the nearest
// vehicle. Entering a car somebody owns in front of a cop raises the heat.
import { MAX_HEALTH, JACKETS } from './tuning.js';
import { slideOutOfBuildings, clampWorld, inSea } from './atlas.js';
import { nearestVehicle } from './garage.js';
import { raiseHeat } from './heat.js';

export function makeHero(x, y) {
  return {
    x, y, angle: Math.PI / 2, health: MAX_HEALTH,
    hasPistol: false, ammo: 0, jacket: JACKETS[0],
    walkPhase: 0, punchTimer: 0, shootCooldown: 0, hurtFlash: 0,
  };
}
function nearestShopDoor(world) {
  const s = world.state;
  for (const shop of world.shops) {
    const d = Math.hypot(shop.x - s.hero.x, shop.y - s.hero.y);
    if (d < 80) return shop;
  }
  return null;
}
export function boardVehicle(world, veh) {
  const s = world.state;
  if (veh.driver === 'parked' && veh.type !== 'boat') {
    // A parked car taken in sight of a cop is a crime.
    const seen = s.officers.some((o) => {
      const ox = o.car ? o.car.x : o.x;
      const oy = o.car ? o.car.y : o.y;
      return Math.hypot(ox - veh.x, oy - veh.y) < 500;
    }) || s.vehicles.some((v) => v.driver === 'cop' && Math.hypot(v.x - veh.x, v.y - veh.y) < 500);
    if (seen) raiseHeat(world, 1, 'You stole a car in front of the cops');
  }
  veh.driver = 'player';
  s.car = veh; s.hero.x = veh.x; s.hero.y = veh.y;
  world.sound.engine(0, true);
}
export function leaveVehicle(world) {
  const s = world.state;
  const veh = s.car;
  if (!veh) return;
  veh.driver = 'parked'; veh.speed = 0;
  s.car = null;
  const side = veh.angle + Math.PI / 2;
  s.hero.x = veh.x + Math.cos(side) * 30;
  s.hero.y = veh.y + Math.sin(side) * 30;
  const fixed = slideOutOfBuildings(world.atlas, s.hero.x, s.hero.y, 14);
  s.hero.x = fixed.x; s.hero.y = fixed.y;
  world.sound.engine(0, false);
}
function punch(world) {
  const s = world.state;
  const h = s.hero;
  h.punchTimer = 0.25;
  world.sound.click();
  const reach = 46;
  const px = h.x + Math.cos(h.angle) * reach;
  const py = h.y + Math.sin(h.angle) * reach;
  for (const w of s.walkers) {
    if (Math.hypot(w.x - px, w.y - py) < 30) {
      w.flee = 3; w.health -= 40;
      world.events.push({ kind: 'hit', x: w.x, y: w.y });
      if (w.health <= 0) raiseHeat(world, 2, 'A pedestrian went down');
    }
  }
  for (const o of s.officers) {
    if (Math.hypot(o.x - px, o.y - py) < 30) {
      o.health -= 35; o.stagger = 0.6;
      world.events.push({ kind: 'hit', x: o.x, y: o.y });
      raiseHeat(world, 1, 'You hit a cop');
    }
  }
}
function shoot(world, mouseWorld) {
  const s = world.state;
  const h = s.hero;
  if (!h.hasPistol || h.ammo <= 0 || h.shootCooldown > 0) return;
  h.ammo -= 1; h.shootCooldown = 0.28;
  const a = Math.atan2(mouseWorld.y - h.y, mouseWorld.x - h.x);
  h.angle = a;
  world.bullets.push({ x: h.x + Math.cos(a) * 20, y: h.y + Math.sin(a) * 20, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.7, from: 'hero' });
  world.sound.shot();
  world.events.push({ kind: 'shot', x: h.x, y: h.y });
  if (s.officers.some((o) => Math.hypot(o.x - h.x, o.y - h.y) < 700)) raiseHeat(world, 1, 'Shots fired near the police');
}

export function stepHero(world, dt, keys, mouseWorld) {
  const s = world.state;
  const h = s.hero;
  h.shootCooldown = Math.max(0, h.shootCooldown - dt);
  h.punchTimer = Math.max(0, h.punchTimer - dt);
  h.hurtFlash = Math.max(0, h.hurtFlash - dt);
  if (inSea(h.x, h.y)) { h.health -= 12 * dt; if (h.health <= 0) world.events.push({ kind: 'wasted' }); }
  // Aim follows the mouse.
  h.angle = Math.atan2(mouseWorld.y - h.y, mouseWorld.x - h.x);
  let mx = 0; let my = 0;
  if (keys.isDown('up')) my -= 1;
  if (keys.isDown('down')) my += 1;
  if (keys.isDown('left')) mx -= 1;
  if (keys.isDown('right')) mx += 1;
  if (mx || my) {
    const len = Math.hypot(mx, my);
    const speed = keys.isDown('sprint') ? 380 : 250;
    h.x += (mx / len) * speed * dt;
    h.y += (my / len) * speed * dt;
    h.walkPhase += dt * 10;
  }
  const fixed = slideOutOfBuildings(world.atlas, h.x, h.y, 14);
  h.x = fixed.x; h.y = fixed.y;
  const clamped = clampWorld(h.x, h.y);
  h.x = clamped.x; h.y = clamped.y;
  if (keys.pressed('punch')) punch(world);
  if (keys.mouse.clicked) shoot(world, mouseWorld);
  if (keys.pressed('interact')) {
    const veh = nearestVehicle(world, h.x, h.y, 60);
    if (veh) { boardVehicle(world, veh); return; }
    const shop = nearestShopDoor(world);
    if (shop) { world.useShop(shop); return; }
    const npc = s.npcs.find((n) => Math.hypot(n.x - h.x, n.y - h.y) < 60);
    if (npc) world.events.push({ kind: 'talk', npc: npc.id });
  }
}
