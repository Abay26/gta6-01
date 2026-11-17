// The core: everything that exists and one step that moves it all. The
// world owns the state (hero, vehicles, walkers, cops, the helicopter,
// jobs, cash, pickups, the taxi trade, the phone, the sky) and drains a
// small event queue each step — a crash makes a sound and a shake, a crime
// raises the heat, a busted player wakes up in hospital or at the Marina
// Loft. Rendering and input live elsewhere.
import { START_CASH, ROAD_W, VEHICLES } from './tuning.js';
import { buildAtlas, nearestRoadPoint } from './atlas.js';
import { makeSky, tickSky } from './weather.js';
import { makeSynth } from './synth.js';
import { makeHero, stepHero, leaveVehicle } from './hero.js';
import { makeWalker, stepWalkers, frighten } from './crowd.js';
import { makeVehicle, stepPlayerVehicle, stepTraffic, crashResolve } from './garage.js';
import { raiseHeat, stepHeat, respawnAfter } from './heat.js';
import { storyJobs, beginJob, jobNow, stepStory } from './story.js';
import { openCell, closeCell, ringContact, stepSideJob } from './cell.js';
import { buildShops, useShop } from './shops.js';

function randomRoadSpot(world) {
  const lx = world.rng.pick([200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400]);
  const ly = world.rng.pick([200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400]);
  return { x: lx + world.rng.range(-30, 30), y: ly + world.rng.range(-30, 30) };
}
export function makeWorld(rng, synth) {
  const atlas = buildAtlas(rng);
  const world = {
    rng, atlas, sound: synth ?? makeSynth(),
    sky: makeSky(), time: 0, events: [], fx: [], bullets: [],
    state: null, shops: [], mouseX: 0, mouseY: 0,
  };
  function freshState() {
    const garage = atlas.spots.garage;
    return {
      hero: makeHero(garage.x, garage.y + garage.h / 2 + 90),
      car: null, vehicles: [], walkers: [], officers: [], heli: null,
      wanted: 0, cash: START_CASH,
      missionIdx: 0, missionStep: 0, missionWait: 0, missionEarned: 0,
      missionActive: true, missionDone: [],
      copTimer: 0, hideTimer: 0, blockTimer: 0,
      pickups: [], fare: null, fareCooldown: 0,
      npcs: [], toasts: [], banner: null, bannerTimer: 0,
      shake: 0, phoneOpen: false, sideJob: null, sideJobsDone: 0,
      ownsLoft: false, jacketIdx: 0, station: 0,
      camera: { x: garage.x, y: garage.y },
    };
  }
  function spawnTraffic(state, count) {
    const types = ['sedan', 'sedan', 'taxi', 'taxi', 'van', 'sports', 'truck', 'pickup', 'limo'];
    for (let i = 0; i < count; i += 1) {
      const spot = randomRoadSpot(world);
      state.vehicles.push(makeVehicle(rng, spot.x, spot.y, rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), rng.pick(types), { driver: 'traffic' }));
    }
  }
  function spawnWalkers(state, count) {
    for (let i = 0; i < count; i += 1) {
      const spot = randomRoadSpot(world);
      const kind = world.rng.chance(0.18) ? 'beachgoer' : undefined;
      state.walkers.push(makeWalker(rng, spot.x + rng.range(-140, 140), spot.y + rng.range(-140, 140), kind));
    }
    for (let i = 0; i < 6; i += 1) state.walkers.push(makeWalker(rng, rng.range(300, 3300), 3420 + rng.range(0, 80), 'beachgoer'));
    for (let i = 0; i < 4; i += 1) state.walkers.push(makeWalker(rng, rng.range(600, 3000), rng.range(600, 3000), 'jogger'));
  }
  function spawnPickups(state, count) {
    for (let i = 0; i < count; i += 1) {
      const spot = randomRoadSpot(world);
      state.pickups.push({ x: spot.x, y: spot.y, amount: 50, respawn: 0 });
    }
  }
  function reset() {
    world.state = freshState();
    world.time = 0; world.sky = makeSky();
    world.events.length = 0; world.fx.length = 0; world.bullets.length = 0;
    const s = world.state;
    const garage = atlas.spots.garage;
    const motel = atlas.spots.motel;
    const diner = atlas.spots.diner;
    world.shops = buildShops(world);
    // Mara's sedan waits on the avenue south of the garage, facing east
    // down the road — ready to drive, not parked against a wall.
    s.vehicles.push(makeVehicle(rng, garage.x, 1800, 0, 'sedan', { driver: 'parked', color: '#c96f4e' }));
    for (const parked of atlas.parkedSpots) s.vehicles.push(makeVehicle(rng, parked.x, parked.y, parked.angle, parked.type, { driver: 'parked', color: parked.color }));
    for (const b of atlas.bikeSpots) s.vehicles.push(makeVehicle(rng, b.x, b.y, b.angle, 'bike', { driver: 'parked' }));
    for (const b of atlas.boatSpots) s.vehicles.push(makeVehicle(rng, b.x, b.y, b.angle, 'boat', { driver: 'parked', color: b.color }));
    spawnTraffic(s, 18);
    spawnWalkers(s, 30);
    spawnPickups(s, 12);
    s.npcs = [
      { id: 'mara', name: 'Mara Solis', x: garage.x, y: garage.y + garage.h / 2 + 70, color: '#d94e8a' },
      { id: 'dante', name: 'Dante', x: motel.x, y: motel.y + motel.h / 2 + 70, color: '#4e7ad9' },
      { id: 'lena', name: 'Lena Cruz', x: diner.x, y: diner.y + diner.h / 2 + 70, color: '#4ad9a0' },
    ];
    beginJob(world, 0);
  }
  function toast(text) {
    world.state.toasts.push({ text, ttl: 4 });
    if (world.state.toasts.length > 3) world.state.toasts.shift();
  }
  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = rng.range(0, Math.PI * 2);
      world.fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * speed * rng.range(0.3, 1), vy: Math.sin(a) * speed * rng.range(0.3, 1), life: rng.range(0.3, 0.8), max: 0.8, color, size: rng.range(2, 5) });
    }
  }
  function drainEvents() {
    const s = world.state;
    for (const event of world.events) {
      if (event.kind === 'crash') { world.sound.crash(); if (event.big) { s.shake = Math.max(s.shake, 7); burst(event.x, event.y, '#e8d98a', 10, 160); } }
      else if (event.kind === 'explode') { world.sound.crash(); s.shake = 12; burst(event.x, event.y, '#e8703a', 26, 320); burst(event.x, event.y, '#3a3a3a', 16, 120); frighten(world, event.x, event.y, 420); }
      else if (event.kind === 'hit') burst(event.x, event.y, '#e8533a', 8, 140);
      else if (event.kind === 'hurt') { s.hero.hurtFlash = 0.3; s.shake = Math.max(s.shake, 3); }
      else if (event.kind === 'busted' || event.kind === 'wasted') {
        if (!s.banner) { s.banner = event.kind === 'busted' ? 'BUSTED' : 'WASTED'; s.bannerTimer = 2.6; respawnAfter(world, event.kind); }
      } else if (event.kind === 'job') toast(`New job: ${event.title} — ${event.giver}`);
      else if (event.kind === 'jobDone') toast(`Job done: ${event.title} — +$${event.reward}`);
      else if (event.kind === 'storyDone') toast(event.text);
      else if (event.kind === 'talk') {
        const lines = {
          mara: 'Mara: "Rico! You came back. The garage needs a driver — start with my sedan."',
          dante: 'Dante: "About time. Drive — and whatever you do, lose the cops."',
          lena: 'Lena: "Need wheels? I run dispatch. Call me on the phone — Q."',
        };
        toast(lines[event.npc] ?? 'They nod at you.');
      }
      else if (event.kind === 'toast') toast(event.text);
      else if (event.kind === 'respawn') toast(`${event.how === 'busted' ? 'Busted' : 'Wasted'} — hospital bill $${event.fine}. ${s.ownsLoft ? 'The Marina Loft' : 'Solmar General'} patched you up.`);
      else if (event.kind === 'heat') toast(event.stars === 0 ? 'You are clean — the heat is off.' : `Heat is cooling — ${event.stars} star${event.stars > 1 ? 's' : ''} left.`);
      else if (event.kind === 'shot') { /* the sound already fired */ }
    }
    world.events.length = 0;
  }
  function updateBullets(dt) {
    const s = world.state;
    for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
      const b = world.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let dead = b.life <= 0;
      if (!dead) {
        // Walls stop bullets.
        const hitWall = world.atlas.buildings.some((bd) => b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= bd.y && b.y <= bd.y + bd.h);
        if (hitWall) { burst(b.x, b.y, '#e8d98a', 4, 100); dead = true; }
      }
      if (!dead) {
        for (const o of s.officers) {
          const ox = o.car ? o.car.x : o.x; const oy = o.car ? o.car.y : o.y;
          if (Math.hypot(b.x - ox, b.y - oy) < 26) {
            if (o.car) { o.car.health -= 34; burst(b.x, b.y, '#e8533a', 6, 120); }
            else { o.health -= 34; o.stagger = 0.6; burst(b.x, b.y, '#e8533a', 6, 120); if (o.health <= 0) raiseHeat(world, 2, 'A cop went down'); }
            dead = true; break;
          }
        }
      }
      if (!dead) {
        for (const v of s.vehicles) {
          if (v.driver === 'player') continue;
          if (Math.hypot(b.x - v.x, b.y - v.y) < 24) { v.health -= 20; burst(b.x, b.y, '#e8533a', 5, 120); dead = true; break; }
        }
      }
      if (dead) world.bullets.splice(i, 1);
    }
  }
  function updatePickups(dt) {
    const s = world.state;
    const px = s.car ? s.car.x : s.hero.x;
    const py = s.car ? s.car.y : s.hero.y;
    for (const pickup of s.pickups) {
      if (pickup.respawn > 0) { pickup.respawn -= dt; continue; }
      if (Math.hypot(pickup.x - px, pickup.y - py) < 46) {
        s.cash += pickup.amount; pickup.respawn = 75;
        world.sound.cash(); toast(`Cash +$${pickup.amount}`); burst(pickup.x, pickup.y, '#7ad94e', 10, 120);
      }
    }
  }
  // The taxi trade: with no passenger, a fare waits on a sidewalk near the
  // player; drive up to them, take them to the yellow marker, get paid.
  function updateTaxi(dt) {
    const s = world.state;
    const car = s.car;
    if (!car || car.type !== 'taxi') { s.fare = null; return; }
    if (!s.fare) {
      s.fareCooldown -= dt;
      if (s.fareCooldown > 0) return;
      const spot = nearestRoadPoint(car.x + 300, car.y);
      const px = spot.x + (world.rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 16);
      const py = spot.y + world.rng.range(-160, 160);
      s.fare = { stage: 'pickup', x: px, y: py, fare: 0, dest: null };
      return;
    }
    const t = s.fare;
    if (t.stage === 'pickup') {
      if (Math.hypot(car.x - t.x, car.y - t.y) < 60) {
        const dest = randomRoadSpot(world);
        t.stage = 'dropoff'; t.dest = dest; t.fare = 40 + rng.int(0, 5) * 10;
        toast(`Passenger aboard — take them to the marker ($${t.fare})`);
        world.sound.blip();
      }
    } else if (Math.hypot(car.x - t.dest.x, car.y - t.dest.y) < 70) {
      s.cash += t.fare;
      if (jobNow(world)?.id === 'taxi-hustle') s.missionEarned += t.fare;
      if (s.sideJob?.kind === 'taxi') s.sideJob.earned += t.fare;
      world.sound.cash(); toast(`Fare paid +$${t.fare}`);
      s.fare = null; s.fareCooldown = 4;
    }
  }
  function updateFx(dt) {
    for (const p of world.fx) {
      p.life -= dt;
      if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
      else if (p.kind === 'wake') { p.life -= dt * 0.4; }
    }
    for (let i = world.fx.length - 1; i >= 0; i -= 1) if (world.fx[i].life <= 0) world.fx.splice(i, 1);
  }
  function step(dt, keys, mouseWorld) {
    const s = world.state;
    world.time += dt;
    tickSky(world.sky, dt, world.rng);
    world.sound.music(dt);
    if (s.bannerTimer > 0) { s.bannerTimer -= dt; if (s.bannerTimer <= 0) s.banner = null; }
    // Phone and radio work on foot and in a car.
    if (keys.pressed('phone')) { if (s.phoneOpen) closeCell(world); else openCell(world); }
    if (s.phoneOpen) {
      if (keys.pressed('digit1')) ringContact(world, 0);
      else if (keys.pressed('digit2')) ringContact(world, 1);
      else if (keys.pressed('digit3')) ringContact(world, 2);
      else if (keys.pressed('digit4')) ringContact(world, 3);
      else if (keys.pressed('pause')) closeCell(world);
    }
    if (keys.pressed('radio')) {
      const name = world.sound.nextStation();
      s.station = (s.station + 1) % 3;
      toast(`Radio: ${name}`);
    }
    if (s.car) {
      if (keys.pressed('interact')) leaveVehicle(world);
      else stepPlayerVehicle(world, dt, keys);
    } else stepHero(world, dt, keys, mouseWorld);
    stepTraffic(world, dt);
    stepWalkers(world, dt);
    stepHeat(world, dt);
    stepStory(world, dt, keys);
    stepSideJob(world, dt);
    updateBullets(dt);
    crashResolve(world);
    updatePickups(dt);
    updateTaxi(dt);
    updateFx(dt);
    for (const t of s.toasts) t.ttl -= dt;
    s.toasts = s.toasts.filter((t) => t.ttl > 0);
    s.shake = Math.max(0, s.shake - dt * 22);
    if (s.hero.health <= 0 && !s.banner) world.events.push({ kind: 'wasted' });
    drainEvents();
    const fx = s.car ? s.car.x : s.hero.x;
    const fy = s.car ? s.car.y : s.hero.y;
    s.camera.x += (fx - s.camera.x) * Math.min(1, dt * 5);
    s.camera.y += (fy - s.camera.y) * Math.min(1, dt * 5);
  }
  function applySave(data) {
    const s = world.state;
    if (!data) return false;
    s.cash = data.cash ?? START_CASH;
    s.hero.hasPistol = !!data.hasPistol;
    s.hero.ammo = data.ammo ?? 0;
    s.hero.jacket = data.jacket ?? '#e83a3a';
    s.jacketIdx = data.jacketIdx ?? 0;
    s.ownsLoft = !!data.ownsLoft;
    s.sideJobsDone = data.sideJobsDone ?? 0;
    if (data.x !== undefined && data.y !== undefined) { s.hero.x = data.x; s.hero.y = data.y; s.camera.x = data.x; s.camera.y = data.y; }
    const index = Math.min(data.missionIdx ?? 0, storyJobs(world).length - 1);
    s.missionDone = data.missionDone ?? [];
    beginJob(world, index);
    return true;
  }
  function saveData() {
    const s = world.state;
    return {
      cash: s.cash, missionIdx: s.missionIdx, missionDone: s.missionDone,
      hasPistol: s.hero.hasPistol, ammo: s.hero.ammo,
      jacket: s.hero.jacket, jacketIdx: s.jacketIdx, ownsLoft: s.ownsLoft,
      sideJobsDone: s.sideJobsDone, x: s.hero.x, y: s.hero.y,
    };
  }
  world.reset = reset; world.step = step; world.applySave = applySave;
  world.saveData = saveData; world.toast = toast;
  world.useShop = (shop) => useShop(world, shop);
  reset();
  return world;
}
export { VEHICLES };
