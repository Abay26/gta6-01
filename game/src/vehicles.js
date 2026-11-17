// Vehicles v2: arcade driving for cars, bikes and boats, plus city traffic.
// Cars and bikes drive the road grid; boats drive on the sea and are slow on
// land (they should not be). Traffic follows the roads manhattan-style in the
// right-hand lane, slowing for the car ahead. Rain makes every vehicle slide.
import { CAR_TYPES, ROAD_LINES, ROAD_W } from './config.js';
import { inWater, nearestRoadPoint, onRoad, resolveCircleBuildings } from './city.js';

let nextCarId = 1;
export function makeCar(rng, x, y, angle, type, opts = {}) {
  const spec = CAR_TYPES[type];
  const car = {
    id: nextCarId, type, spec, x, y, angle, speed: 0,
    color: opts.color ?? spec.color, health: spec.health, maxHealth: spec.health,
    driver: opts.driver ?? 'traffic', target: null, stuck: 0, smoke: 0,
    dead: false, stolen: false, honk: 0, brakeLight: false, paintIndex: 0,
  };
  nextCarId += 1;
  return car;
}
function carRadius(car) { return Math.max(car.spec.length, car.spec.width) / 2; }
function integrate(world, car, dt) {
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (car.spec.kind === 'boat') {
    car.x = Math.max(30, Math.min(3570, nx));
    car.y = Math.max(3400, Math.min(3590, ny));
    return;
  }
  const fixed = resolveCircleBuildings(world.city, nx, ny, carRadius(car) * 0.8);
  if ((fixed.x !== nx || fixed.y !== ny) && Math.abs(car.speed) > 120) {
    car.health -= Math.abs(car.speed) * 0.02;
    car.speed *= 0.4;
    world.events.push({ kind: 'crash', x: car.x, y: car.y, big: true });
  }
  car.x = Math.max(30, Math.min(3570, fixed.x));
  car.y = Math.max(30, Math.min(3570, fixed.y));
}
export function updatePlayerCar(world, dt, input) {
  const car = world.state.playerCar;
  if (!car) return;
  const spec = car.spec;
  const wet = world.climate.weather === 'rain';
  const fwd = input.down('up') ? 1 : input.down('down') ? -0.6 : 0;
  const steer = (input.down('left') ? -1 : 0) + (input.down('right') ? 1 : 0);
  const isBoat = spec.kind === 'boat';
  const offroad = !isBoat && !onRoad(car.x, car.y);
  const maxSpeed = spec.topSpeed * (isBoat ? 1 : offroad ? 0.55 : 1);
  car.speed += fwd * spec.accel * dt;
  car.speed -= car.speed * (offroad ? 1.4 : wet ? 0.35 : 0.55) * dt;
  car.speed = Math.max(-spec.topSpeed * 0.35, Math.min(maxSpeed, car.speed));
  if (Math.abs(car.speed) > 8) {
    const grip = spec.grip * (wet ? 1.35 : 1) * (spec.kind === 'bike' ? 1.25 : 1);
    car.angle += steer * grip * (car.speed / spec.topSpeed) * dt * (car.speed < 0 ? -1 : 1);
  }
  car.brakeLight = input.down('down');
  if (input.pressed('horn')) { world.audio.horn(); car.honk = 0.4; }
  car.honk = Math.max(0, car.honk - dt);
  integrate(world, car, dt);
  world.audio.engine(Math.abs(car.speed) / spec.topSpeed, true);
  if (Math.abs(steer) > 0 && Math.abs(car.speed) > 320) {
    world.particles.push({ kind: 'skid', x: car.x, y: car.y, angle: car.angle, life: 2.5, max: 2.5 });
  }
  if (isBoat && Math.abs(car.speed) > 200) {
    world.particles.push({ kind: 'wake', x: car.x - Math.cos(car.angle) * 26, y: car.y - Math.sin(car.angle) * 26, angle: car.angle, life: 0.9, max: 0.9 });
  }
  if (car.health <= 0 && !car.dead) {
    car.dead = true;
    world.events.push({ kind: 'explode', x: car.x, y: car.y });
    ejectDriver(world, car);
  }
}
export function ejectDriver(world, car) {
  const s = world.state;
  if (s.playerCar === car) {
    s.playerCar = null; s.player.onFoot = true;
    s.player.x = car.x + 40; s.player.y = car.y + 40;
    s.player.health = Math.max(10, s.player.health - 25);
    world.audio.crash();
  }
}
function pickNextIntersection(world, car) {
  const lines = ROAD_LINES;
  const cur = car.target ? { x: car.target.ix, y: car.target.iy } : nearestRoadPoint(car.x, car.y);
  const options = [];
  for (const line of lines) {
    if (line !== cur.x) options.push({ x: line, y: cur.y });
    if (line !== cur.y) options.push({ x: cur.x, y: line });
  }
  const next = options[Math.floor(world.rng.next() * options.length)];
  const dx = next.x - cur.x; const dy = next.y - cur.y;
  const lane = ROAD_W / 4;
  car.target = {
    x: next.x + (dy !== 0 ? (dy > 0 ? lane : -lane) : 0),
    y: next.y + (dx !== 0 ? (dx > 0 ? -lane : lane) : 0),
    ix: next.x, iy: next.y,
  };
}
function carAhead(world, car, look) {
  const fx = Math.cos(car.angle); const fy = Math.sin(car.angle);
  for (const other of world.state.cars) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x; const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(dx * -fy + dy * fx);
    if (along > 0 && along < look && side < 30) return other;
  }
  return null;
}
export function updateTraffic(world, dt) {
  const s = world.state;
  for (const car of s.cars) {
    if (car.driver !== 'traffic' || car.dead) continue;
    if (!car.target) pickNextIntersection(world, car);
    const dx = car.target.x - car.x; const dy = car.target.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 26) { pickNextIntersection(world, car); continue; }
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const ahead = carAhead(world, car, 90);
    const baseSpeed = ahead ? Math.max(0, ahead.speed - 40) : car.spec.topSpeed * 0.42;
    const turnCap = Math.abs(diff) > 0.7 ? 120 : Math.abs(diff) > 0.35 ? 180 : baseSpeed;
    const targetSpeed = Math.min(baseSpeed, turnCap);
    car.speed += Math.max(-300 * dt, Math.min(300 * dt, targetSpeed - car.speed));
    car.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff * 2.4 * dt * 10));
    integrate(world, car, dt);
    if (car.health <= 0 && !car.dead) { car.dead = true; world.events.push({ kind: 'explode', x: car.x, y: car.y }); }
  }
  const px = s.playerCar ? s.playerCar.x : s.player.x;
  const py = s.playerCar ? s.playerCar.y : s.player.y;
  for (const car of s.cars) {
    if (car.driver === 'traffic' && Math.hypot(car.x - px, car.y - py) > 1100) {
      const line = ROAD_LINES[Math.floor(world.rng.next() * ROAD_LINES.length)];
      const along = world.rng.range(140, 3460);
      const lane = world.rng.chance(0.5) ? ROAD_W / 4 : -ROAD_W / 4;
      if (world.rng.chance(0.5)) { car.x = along; car.y = line + lane; car.angle = lane > 0 ? 0 : Math.PI; }
      else { car.x = line + lane; car.y = along; car.angle = lane > 0 ? Math.PI / 2 : -Math.PI / 2; }
      car.target = null; car.speed = 0;
    }
  }
  // Boats drift slowly along the marina when nobody drives them.
  for (const car of s.cars) {
    if (car.spec.kind === 'boat' && car.driver === 'parked' && !car.dead) {
      car.y += Math.sin(world.time * 0.5 + car.id) * 2 * dt;
    }
  }
  void inWater;
}
export function resolveCarCollisions(world) {
  const cars = world.state.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i]; const b = cars[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const min = (a.spec.length + b.spec.length) / 2 - 6;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / 2;
      const nx = dx / d; const ny = dy / d;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
      const hit = Math.abs(a.speed - b.speed);
      if (hit > 140) {
        a.health -= hit * 0.03; b.health -= hit * 0.03;
        world.events.push({ kind: 'crash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, big: hit > 320 });
      }
      const tmp = a.speed; a.speed = b.speed * 0.6; b.speed = tmp * 0.6;
    }
  }
}
