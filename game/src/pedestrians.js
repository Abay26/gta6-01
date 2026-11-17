// Pedestrians: the city's foot traffic. They stroll the sidewalks between
// intersections, pause at corners, and run away from gunshots, crashes and
// speeding cars. A frightened pedestrian may call the police, which is how a
// punch in public turns into a wanted star.
import { ROAD_LINES, ROAD_W } from './config.js';
import { onRoad, resolveCircleBuildings } from './city.js';
import { addWanted } from './police.js';

export function makePed(rng, x, y) {
  return {
    x, y, angle: rng.range(0, Math.PI * 2), speed: 0,
    color: rng.pick ? rng.pick(['#d96f4e', '#4e7ad9', '#e8a04c', '#7a5ad9', '#4ad9a0', '#d94e8a']) : '#d96f4e',
    name: 'Ped',
    target: null, wait: rng.range(0, 2), flee: 0, health: 30, dead: false,
    walkPhase: rng.range(0, Math.PI * 2),
  };
}

function pickSidewalkTarget(world, ped) {
  // Most of the time a pedestrian strolls nearby and stays on this side of
  // the street; only sometimes do they cross to another intersection, so the
  // roads are not full of people wandering into traffic.
  if (world.rng.chance(0.7)) {
    let tx = ped.x + world.rng.range(-180, 180);
    let ty = ped.y + world.rng.range(-180, 180);
    // Nudge the target off the road, onto the sidewalk beside it.
    for (const line of ROAD_LINES) {
      if (Math.abs(tx - line) <= ROAD_W / 2 + 14) tx = line + (tx >= line ? 1 : -1) * (ROAD_W / 2 + 16);
      if (Math.abs(ty - line) <= ROAD_W / 2 + 14) ty = line + (ty >= line ? 1 : -1) * (ROAD_W / 2 + 16);
    }
    ped.target = { x: tx, y: ty };
    return;
  }
  // Walk to a nearby intersection, offset onto the sidewalk beside the road.
  const lines = ROAD_LINES;
  const lx = lines[Math.floor(world.rng.next() * lines.length)];
  const ly = lines[Math.floor(world.rng.next() * lines.length)];
  const side = world.rng.chance(0.5) ? 1 : -1;
  ped.target = {
    x: lx + (world.rng.chance(0.5) ? side * (ROAD_W / 2 + 14) : world.rng.range(-160, 160)),
    y: ly + (world.rng.chance(0.5) ? side * (ROAD_W / 2 + 14) : world.rng.range(-160, 160)),
  };
}

export function scarePeds(world, x, y, radius) {
  for (const ped of world.state.peds) {
    if (ped.dead) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.flee = 3 + world.rng.range(0, 2);
      ped.target = { x: ped.x + (ped.x - x) * 2, y: ped.y + (ped.y - y) * 2 };
    }
  }
}

export function updatePeds(world, dt) {
  const s = world.state;
  for (const ped of s.peds) {
    if (ped.dead) continue;
    ped.walkPhase += dt * 8;
    if (ped.flee > 0) {
      ped.flee -= dt;
      if (!ped.target) pickSidewalkTarget(world, ped);
    } else if (!ped.target) {
      if (ped.wait > 0) { ped.wait -= dt; continue; }
      pickSidewalkTarget(world, ped);
    }
    const dx = ped.target.x - ped.x;
    const dy = ped.target.y - ped.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) {
      ped.target = null;
      ped.wait = world.rng.range(0.5, 3);
      ped.speed = 0;
      continue;
    }
    const want = Math.atan2(dy, dx);
    let diff = want - ped.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ped.angle += Math.max(-4 * dt, Math.min(4 * dt, diff * 6 * dt));
    ped.speed = ped.flee > 0 ? 260 : 62;
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    const fixed = resolveCircleBuildings(world.city, nx, ny, 12);
    ped.x = fixed.x;
    ped.y = fixed.y;
    // A pedestrian in the path of a fast car jumps out of the way — sideways,
    // off the car's line, never straight ahead where the car catches them.
    for (const car of s.cars) {
      if (car.dead || Math.abs(car.speed) < 150) continue;
      const dx = ped.x - car.x;
      const dy = ped.y - car.y;
      const d = Math.hypot(dx, dy);
      if (d > 150 || d === 0) continue;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = dx * -Math.sin(car.angle) + dy * Math.cos(car.angle);
      if (ahead > 0 && Math.abs(side) < 60) {
        const sgn = side >= 0 ? 1 : -1;
        ped.flee = 1.5;
        ped.target = {
          x: ped.x + -Math.sin(car.angle) * sgn * 160,
          y: ped.y + Math.cos(car.angle) * sgn * 160,
        };
      }
    }
    // A pedestrian in the road in front of a speeding car gets hit.
    for (const car of s.cars) {
      if (car.dead || Math.abs(car.speed) < 120) continue;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 30) {
        ped.health = 0;
        ped.dead = true;
        world.events.push({ kind: 'hit', x: ped.x, y: ped.y });
        if (car.driver === 'player') {
          addWanted(world, 1, 'You ran someone over');
        }
        scarePeds(world, ped.x, ped.y, 300);
        break;
      }
    }
    if (ped.health <= 0) ped.dead = true;
  }
  // Keep the sidewalks populated near the player (the car, when driving).
  const px = s.playerCar ? s.playerCar.x : s.player.x;
  const py = s.playerCar ? s.playerCar.y : s.player.y;
  let alive = 0;
  for (const ped of s.peds) if (!ped.dead) alive += 1;
  for (const ped of s.peds) {
    if (!ped.dead && Math.hypot(ped.x - px, ped.y - py) > 1200) {
      ped.x = px + world.rng.range(-500, 500);
      ped.y = py + world.rng.range(-500, 500);
      ped.target = null;
    }
  }
  if (alive < 20) {
    for (const ped of s.peds) {
      if (ped.dead) {
        ped.dead = false;
        ped.health = 30;
        ped.x = px + world.rng.range(-400, 400);
        ped.y = py + world.rng.range(-400, 400);
        if (!onRoad(ped.x, ped.y)) break;
        ped.target = null;
        ped.flee = 0;
        break;
      }
    }
  }
}
