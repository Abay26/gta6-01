// The crowd: pedestrians who stroll the sidewalks, jog the parks, lounge
// on the beach, and run when things get loud.
import { WALKER_COLORS, WALKER_NAMES } from './tuning.js';
import { onRoad, slideOutOfBuildings } from './atlas.js';

export const WALKER_KINDS = {
  stroller: { speed: 55 }, jogger: { speed: 130 }, beachgoer: { speed: 40 },
};
export function makeWalker(rng, x, y, kind) {
  const k = kind ?? (rng.chance(0.12) ? 'jogger' : 'stroller');
  return {
    x, y, angle: rng.range(0, Math.PI * 2), kind: k,
    speed: WALKER_KINDS[k].speed * rng.range(0.8, 1.2),
    color: rng.pick(WALKER_COLORS), name: rng.pick(WALKER_NAMES),
    health: 100, flee: 0, pause: rng.range(0, 3), walkPhase: rng.range(0, 6),
  };
}
function pickStrollTarget(world, w) {
  const r = world.rng;
  for (let i = 0; i < 8; i += 1) {
    const tx = w.x + r.range(-260, 260);
    const ty = w.y + r.range(-260, 260);
    if (tx > 60 && tx < 3540 && ty > 60 && ty < 3540) return { x: tx, y: ty };
  }
  return { x: w.x + 100, y: w.y };
}
export function frighten(world, x, y, radius) {
  for (const w of world.state.walkers) {
    if (Math.hypot(w.x - x, w.y - y) < radius) w.flee = 2.5;
  }
}
export function stepWalkers(world, dt) {
  const s = world.state;
  const heroPos = s.car ? { x: s.car.x, y: s.car.y } : { x: s.hero.x, y: s.hero.y };
  for (const w of s.walkers) {
    w.walkPhase += dt * 6;
    if (w.flee > 0) {
      w.flee -= dt;
      const a = Math.atan2(w.y - heroPos.y, w.x - heroPos.x);
      w.angle = a;
      w.x += Math.cos(a) * w.speed * 2.4 * dt;
      w.y += Math.sin(a) * w.speed * 2.4 * dt;
    } else if (w.pause > 0) {
      w.pause -= dt;
      if (w.pause <= 0) w.target = pickStrollTarget(world, w);
    } else {
      if (!w.target) w.target = pickStrollTarget(world, w);
      const dx = w.target.x - w.x; const dy = w.target.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) { w.pause = world.rng.range(1, 4); w.target = null; }
      else {
        w.angle = Math.atan2(dy, dx);
        w.x += (dx / d) * w.speed * dt;
        w.y += (dy / d) * w.speed * dt;
      }
    }
    // Keep walkers out of the sea and out of walls; nudge them back on-road.
    if (w.y > 3500) w.y = 3500;
    const fixed = slideOutOfBuildings(world.atlas, w.x, w.y, 10);
    w.x = fixed.x; w.y = fixed.y;
    void onRoad;
  }
  s.walkers = s.walkers.filter((w) => w.health > 0);
}
