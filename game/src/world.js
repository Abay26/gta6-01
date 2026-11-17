// The world v2: everything that exists and one step that moves it all. The
// world owns the state (player, cars, bikes, boats, pedestrians, cops, the
// helicopter, missions, side jobs, cash, pickups, the taxi trade, the phone,
// the climate) and drains a small event queue each step — a crash makes a
// sound and a shake, a crime raises the heat, a busted player wakes up in
// hospital or at the Marina Loft. Rendering and input live elsewhere.
import { AMMO_PACK, CAR_TYPES, PED_COLORS, PED_NAMES, ROAD_LINES, ROAD_W, SAVE_KEY, START_CASH, STEP } from './config.js';
import { generateCity, nearestRoadPoint } from './city.js';
import { makeCar, resolveCarCollisions, updatePlayerCar, updateTraffic } from './vehicles.js';
import { makePed, scarePeds, updatePeds } from './pedestrians.js';
import { addWanted, respawnAtHospital, updatePolice } from './police.js';
import { currentMission, missionList, startMission, updateMission } from './missions.js';
import { exitCar, makePlayer, updatePlayer } from './player.js';
import { createAudio } from './audio.js';
import { climateStep, createClimate } from './climate.js';
import { callContact, closePhone, openPhone, updateSideJob } from './phone.js';

export const EVENT_NONE = 0;
function randomRoadPoint(world) {
  const lx = world.rng.pick(ROAD_LINES);
  const ly = world.rng.pick(ROAD_LINES);
  return { x: lx + world.rng.range(-120, 120), y: ly + world.rng.range(-120, 120) };
}
export function createWorld(rng, audio) {
  const city = generateCity(rng);
  const world = {
    rng, city, audio: audio ?? createAudio(),
    time: 0, climate: createClimate(), events: [], particles: [], state: null,
  };
  Object.defineProperty(world, 'clockMinutes', { get() { return world.climate.minutes; }, set(v) { world.climate.minutes = v; } });
  function freshState() {
    const garage = city.landmarks.garage;
    return {
      player: makePlayer(garage.x, garage.y + garage.h / 2 + 90),
      playerCar: null, cars: [], peds: [], cops: [], heli: null,
      wanted: 0, cash: START_CASH,
      missionIndex: 0, missionStep: 0, missionWait: 0, missionEarned: 0,
      missionActive: true, missionDone: [],
      copSpawnTimer: 0, hiddenTimer: 0, roadblockTimer: 0,
      pickups: [], taxi: null, npcs: [], toasts: [], overlay: null, overlayTimer: 0,
      shake: 0, fareTimer: 0, phoneOpen: false, sideJob: null, sideJobsDone: 0,
      ownsLoft: false, shirtIndex: 0, radioStation: 0, delivery: null,
      camera: { x: garage.x, y: garage.y },
    };
  }
  function spawnTraffic(state, count) {
    const types = ['sedan', 'sedan', 'taxi', 'taxi', 'van', 'sports', 'truck', 'pickup', 'limo'];
    for (let i = 0; i < count; i += 1) {
      const spot = randomRoadPoint(world);
      state.cars.push(makeCar(rng, spot.x, spot.y, rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), rng.pick(types), { driver: 'traffic' }));
    }
  }
  function spawnPeds(state, count) {
    for (let i = 0; i < count; i += 1) {
      const spot = randomRoadPoint(world);
      const kind = world.rng.chance(0.18) ? 'beachgoer' : undefined;
      const ped = makePed(rng, spot.x + rng.range(-140, 140), spot.y + rng.range(-140, 140), kind);
      ped.color = rng.pick(PED_COLORS); ped.name = rng.pick(PED_NAMES);
      state.peds.push(ped);
    }
    // Beachgoers on the sand, joggers in the parks.
    for (let i = 0; i < 6; i += 1) state.peds.push(makePed(rng, rng.range(300, 3300), 3420 + rng.range(0, 80), 'beachgoer'));
    for (let i = 0; i < 4; i += 1) state.peds.push(makePed(rng, rng.range(600, 3000), rng.range(600, 3000), 'jogger'));
  }
  function spawnPickups(state, count) {
    for (let i = 0; i < count; i += 1) {
      const spot = randomRoadPoint(world);
      state.pickups.push({ x: spot.x, y: spot.y, amount: 50, respawn: 0 });
    }
  }
  function reset() {
    world.state = freshState();
    world.time = 0; world.climate = createClimate();
    world.events.length = 0; world.particles.length = 0;
    const s = world.state;
    const garage = city.landmarks.garage;
    const motel = city.landmarks.motel;
    const diner = city.landmarks.diner;
    s.cars.push(makeCar(rng, garage.x + 120, garage.y + garage.h / 2 + 90, 0, 'sedan', { driver: 'parked', color: '#c96f4e' }));
    for (const parked of city.parked) s.cars.push(makeCar(rng, parked.x, parked.y, parked.angle, parked.type, { driver: 'parked', color: parked.color }));
    for (const b of city.bikes) s.cars.push(makeCar(rng, b.x, b.y, b.angle, 'bike', { driver: 'parked' }));
    for (const b of city.boats) s.cars.push(makeCar(rng, b.x, b.y, b.angle, 'boat', { driver: 'parked', color: b.color }));
    spawnTraffic(s, 18);
    spawnPeds(s, 30);
    spawnPickups(s, 12);
    s.npcs = [
      { id: 'mara', name: 'Mara Solis', x: garage.x, y: garage.y + garage.h / 2 + 70, color: '#d94e8a' },
      { id: 'dante', name: 'Dante', x: motel.x, y: motel.y + motel.h / 2 + 70, color: '#4e7ad9' },
      { id: 'lena', name: 'Lena Cruz', x: diner.x, y: diner.y + diner.h / 2 + 70, color: '#4ad9a0' },
    ];
    startMission(world, 0);
  }
  function pushToast(text) {
    world.state.toasts.push({ text, ttl: 4 });
    if (world.state.toasts.length > 3) world.state.toasts.shift();
  }
  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = rng.range(0, Math.PI * 2);
      world.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * speed * rng.range(0.3, 1), vy: Math.sin(a) * speed * rng.range(0.3, 1), life: rng.range(0.3, 0.8), max: 0.8, color, size: rng.range(2, 5) });
    }
  }
  function drainEvents() {
    const s = world.state;
    for (const event of world.events) {
      if (event.kind === 'crash') { world.audio.crash(); if (event.big) { s.shake = Math.max(s.shake, 7); burst(event.x, event.y, '#e8d98a', 10, 160); } }
      else if (event.kind === 'explode') { world.audio.crash(); s.shake = 12; burst(event.x, event.y, '#e8703a', 26, 320); burst(event.x, event.y, '#3a3a3a', 16, 120); scarePeds(world, event.x, event.y, 420); }
      else if (event.kind === 'hit') burst(event.x, event.y, '#e8533a', 8, 140);
      else if (event.kind === 'hurt') { s.player.hurtFlash = 0.3; s.shake = Math.max(s.shake, 3); }
      else if (event.kind === 'busted' || event.kind === 'wasted') {
        if (!s.overlay) { s.overlay = event.kind; s.overlayTimer = 2.6; respawnAtHospital(world, event.kind); }
      }
      else if (event.kind === 'mission') pushToast(`New job: ${event.title} — ${event.giver}`);
      else if (event.kind === 'missionDone') pushToast(`Job done: ${event.title} — +$${event.reward}`);
      else if (event.kind === 'storyDone') pushToast(event.text);
      else if (event.kind === 'talk') {
        const lines = {
          mara: 'Mara: "Rico! You came back. The garage needs a driver — start with my sedan."',
          dante: 'Dante: "About time. Drive — and whatever you do, lose the cops."',
          lena: 'Lena: "Need wheels? I run dispatch. Call me on the phone — Q."',
        };
        pushToast(lines[event.npc] ?? 'They nod at you.');
      }
      else if (event.kind === 'toast') pushToast(event.text);
      else if (event.kind === 'respawn') pushToast(`${event.how === 'busted' ? 'Busted' : 'Wasted'} — hospital bill $${event.fine}. ${s.ownsLoft ? 'The Marina Loft' : 'Solmar General'} patched you up.`);
      else if (event.kind === 'heat') pushToast(event.stars === 0 ? 'You are clean — the heat is off.' : `Heat is cooling — ${event.stars} star${event.stars > 1 ? 's' : ''} left.`);
    }
    world.events.length = 0;
  }
  function updatePickups(dt) {
    const s = world.state;
    const px = s.playerCar ? s.playerCar.x : s.player.x;
    const py = s.playerCar ? s.playerCar.y : s.player.y;
    for (const pickup of s.pickups) {
      if (pickup.respawn > 0) { pickup.respawn -= dt; continue; }
      if (Math.hypot(pickup.x - px, pickup.y - py) < 46) {
        s.cash += pickup.amount; pickup.respawn = 75;
        world.audio.cash(); pushToast(`Cash +$${pickup.amount}`); burst(pickup.x, pickup.y, '#7ad94e', 10, 120);
      }
    }
  }
  // The taxi trade: with no passenger, a fare waits on a sidewalk near the
  // player; drive up to them, take them to the yellow marker, get paid.
  // A delivery side job pays on top when the phone job is a taxi shift.
  function updateTaxi(dt) {
    const s = world.state;
    const car = s.playerCar;
    if (!car || car.type !== 'taxi') { s.taxi = null; return; }
    if (!s.taxi) {
      s.fareTimer -= dt;
      if (s.fareTimer > 0) return;
      const spot = nearestRoadPoint(car.x + 300, car.y);
      const px = spot.x + (world.rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 16);
      const py = spot.y + world.rng.range(-160, 160);
      s.taxi = { stage: 'pickup', x: px, y: py, fare: 0, dest: null };
      return;
    }
    const t = s.taxi;
    if (t.stage === 'pickup') {
      if (Math.hypot(car.x - t.x, car.y - t.y) < 60) {
        const dest = randomRoadPoint(world);
        t.stage = 'dropoff'; t.dest = dest; t.fare = 40 + rng.int(0, 5) * 10;
        pushToast(`Passenger aboard — take them to the marker ($${t.fare})`);
        world.audio.blip();
      }
    } else if (Math.hypot(car.x - t.dest.x, car.y - t.dest.y) < 70) {
      s.cash += t.fare;
      if (currentMission(world)?.id === 'taxi-hustle') s.missionEarned += t.fare;
      if (s.sideJob?.kind === 'taxi') s.sideJob.earned += t.fare;
      world.audio.cash(); pushToast(`Fare paid +$${t.fare}`);
      s.taxi = null; s.fareTimer = 4;
    }
  }
  function updateParticles(dt) {
    for (const p of world.particles) {
      p.life -= dt;
      if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      else if (p.kind === 'wake') { p.life -= dt * 0.4; }
    }
    for (let i = world.particles.length - 1; i >= 0; i -= 1) if (world.particles[i].life <= 0) world.particles.splice(i, 1);
  }
  function step(dt, input, mouseWorld) {
    const s = world.state;
    world.time += dt;
    climateStep(world.climate, dt, world.rng);
    if (s.overlayTimer > 0) { s.overlayTimer -= dt; if (s.overlayTimer <= 0) s.overlay = null; }
    // Phone and radio work on foot and in a car.
    if (input.pressed('phone')) { if (s.phoneOpen) closePhone(world); else openPhone(world); }
    if (s.phoneOpen) {
      if (input.pressed('digit1')) callContact(world, 0);
      else if (input.pressed('digit2')) callContact(world, 1);
      else if (input.pressed('digit3')) callContact(world, 2);
      else if (input.pressed('pause')) closePhone(world);
    }
    if (input.pressed('radio')) {
      const name = world.audio.nextStation();
      s.radioStation = (s.radioStation + 1) % 3;
      pushToast(`Radio: ${name}`);
    }
    if (s.playerCar) {
      if (input.pressed('enter')) exitCar(world);
      else updatePlayerCar(world, dt, input);
    } else updatePlayer(world, dt, input, mouseWorld);
    updateTraffic(world, dt);
    updatePeds(world, dt);
    updatePolice(world, dt);
    updateMission(world, dt, input);
    updateSideJob(world, dt);
    resolveCarCollisions(world);
    updatePickups(dt);
    updateTaxi(dt);
    updateParticles(dt);
    for (const toast of s.toasts) toast.ttl -= dt;
    s.toasts = s.toasts.filter((t) => t.ttl > 0);
    s.shake = Math.max(0, s.shake - dt * 22);
    if (s.player.health <= 0 && !s.overlay) world.events.push({ kind: 'wasted' });
    drainEvents();
    const fx = s.playerCar ? s.playerCar.x : s.player.x;
    const fy = s.playerCar ? s.playerCar.y : s.player.y;
    s.camera.x += (fx - s.camera.x) * Math.min(1, dt * 5);
    s.camera.y += (fy - s.camera.y) * Math.min(1, dt * 5);
  }
  function applySave(data) {
    const s = world.state;
    if (!data) return false;
    s.cash = data.cash ?? START_CASH;
    s.player.hasPistol = !!data.hasPistol;
    s.player.ammo = data.ammo ?? 0;
    s.player.jacket = data.jacket ?? '#e83a3a';
    s.shirtIndex = data.shirtIndex ?? 0;
    s.ownsLoft = !!data.ownsLoft;
    s.sideJobsDone = data.sideJobsDone ?? 0;
    if (data.x !== undefined && data.y !== undefined) { s.player.x = data.x; s.player.y = data.y; s.camera.x = data.x; s.camera.y = data.y; }
    const index = Math.min(data.missionIndex ?? 0, missionList(world).length - 1);
    s.missionDone = data.missionDone ?? [];
    startMission(world, index);
    return true;
  }
  function saveData() {
    const s = world.state;
    return {
      cash: s.cash, missionIndex: s.missionIndex, missionDone: s.missionDone,
      hasPistol: s.player.hasPistol, ammo: s.player.ammo,
      jacket: s.player.jacket, shirtIndex: s.shirtIndex, ownsLoft: s.ownsLoft,
      sideJobsDone: s.sideJobsDone, x: s.player.x, y: s.player.y,
    };
  }
  world.reset = reset; world.step = step; world.applySave = applySave;
  world.saveData = saveData; world.pushToast = pushToast;
  reset();
  return world;
}
export { SAVE_KEY, AMMO_PACK, CAR_TYPES };
