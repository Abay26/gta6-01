// Drawing only v2: the world state and the current screen in, pixels out.
// The camera follows the player; the canvas shows about 1280x720 world units.
// Top-down, with a living sky: golden hour, dusk, night lamps, rain, four
// districts with distinct roofs, a marina with piers and boats, beach
// umbrellas, a police helicopter searchlight, and the phone on screen.
import { BEACH_Y, BLOCK, PALETTE, ROAD_LINES, ROAD_W, STORY, WATER_Y, WORLD } from './config.js';
import { missionMarker } from './missions.js';
import { sideJobMarker } from './phone.js';
import { daylight, isNight } from './climate.js';
import { districtAt } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_HELP = 'help';
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { zoom: 1, cx: 0, cy: 0 };
  const fonts = new Map();
  let currentCamera = { x: 1800, y: 1800 };
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.zoom = Math.min(canvas.width / 1280, canvas.height / 720);
    view.cx = canvas.width / 2; view.cy = canvas.height / 2;
  }
  function text(value, x, y, size, color, align = 'left', weight = '') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    ctx.font = fonts.get(key); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }
  function worldToScreen(x, y) { return { x: (x - currentCamera.x) * view.zoom + view.cx, y: (y - currentCamera.y) * view.zoom + view.cy }; }
  function visibleRect() {
    const w = canvas.width / view.zoom; const h = canvas.height / view.zoom;
    return { x: currentCamera.x - w / 2 - 60, y: currentCamera.y - h / 2 - 60, w: w + 120, h: h + 120 };
  }
  function drawGround(city, world) {
    const v = visibleRect();
    const day = daylight(world.climate);
    ctx.fillStyle = day > 0.6 ? '#b8a888' : '#8a7a68';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(v.x, Math.max(v.y, BEACH_Y), v.w, Math.max(0, v.y + v.h - BEACH_Y));
    ctx.fillStyle = isNight(world.climate) ? '#1a4a63' : PALETTE.water;
    ctx.fillRect(v.x, Math.max(v.y, WATER_Y), v.w, Math.max(0, v.y + v.h - WATER_Y));
    ctx.fillStyle = PALETTE.waterDeep;
    for (let x = Math.floor(v.x / 90) * 90; x < v.x + v.w; x += 90) ctx.fillRect(x, WATER_Y + 40 + ((x / 90) % 3) * 14, 46, 3);
    for (const park of city.parks) {
      if (park.x > v.x + v.w || park.x + park.w < v.x || park.y > v.y + v.h || park.y + park.h < v.y) continue;
      ctx.fillStyle = park.lot ? '#565b66' : PALETTE.grass;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      if (!park.lot) {
        ctx.strokeStyle = PALETTE.grassDark; ctx.lineWidth = 4;
        ctx.strokeRect(park.x + 2, park.y + 2, park.w - 4, park.h - 4);
        if (park.name) text(park.name, park.x + park.w / 2, park.y + park.h / 2, 15, '#4a7a35', 'center');
      } else {
        ctx.strokeStyle = '#e8d98a'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i += 1) ctx.strokeRect(park.x + 18 + i * 90, park.y + 24, 64, 100);
      }
    }
    ctx.fillStyle = PALETTE.asphalt;
    for (const line of ROAD_LINES) { ctx.fillRect(line - ROAD_W / 2, v.y, ROAD_W, v.h); ctx.fillRect(v.x, line - ROAD_W / 2, v.w, ROAD_W); }
    ctx.fillStyle = PALETTE.sidewalk;
    for (const line of ROAD_LINES) {
      ctx.fillRect(line - ROAD_W / 2 - 10, v.y, 10, v.h); ctx.fillRect(line + ROAD_W / 2, v.y, 10, v.h);
      ctx.fillRect(v.x, line - ROAD_W / 2 - 10, v.w, 10); ctx.fillRect(v.x, line + ROAD_W / 2, v.w, 10);
    }
    ctx.fillStyle = PALETTE.asphalt;
    for (const line of ROAD_LINES) { ctx.fillRect(line - ROAD_W / 2, v.y, ROAD_W, v.h); ctx.fillRect(v.x, line - ROAD_W / 2, v.w, ROAD_W); }
    ctx.fillStyle = PALETTE.lane;
    for (const line of ROAD_LINES) {
      for (let t = Math.floor(v.y / 48) * 48; t < v.y + v.h; t += 48) ctx.fillRect(line - 2, t, 4, 22);
      for (let t = Math.floor(v.x / 48) * 48; t < v.x + v.w; t += 48) ctx.fillRect(t, line - 2, 22, 4);
    }
    // District name painted on the ground at its centre, faint.
    for (const d of [{ n: 'OLD TOWN', x: 700, y: 1800 }, { n: 'DOWNTOWN', x: 2000, y: 1800 }, { n: 'NORTHGATE HILLS', x: 3100, y: 700 }, { n: 'MARINA', x: 2600, y: 3300 }]) {
      if (d.x > v.x && d.x < v.x + v.w && d.y > v.y && d.y < v.y + v.h) text(d.n, d.x, d.y, 26, 'rgba(255,255,255,0.28)', 'center', 'bold ');
    }
  }
  function drawBuildings(city) {
    const v = visibleRect();
    for (const b of city.buildings) {
      if (b.x > v.x + v.w || b.x + b.w < v.x || b.y > v.y + v.h || b.y + b.h < v.y) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(b.x + 10, b.y + 10, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      const cols = Math.max(1, Math.floor(b.w / 46)); const rows = Math.max(1, Math.floor(b.h / 46));
      for (let i = 0; i < cols; i += 1) for (let j = 0; j < rows; j += 1) {
        if ((i * 7 + j * 3 + b.windows) % 4 === 0) ctx.fillRect(b.x + 10 + i * 46, b.y + 10 + j * 46, 18, 12);
      }
      if (b.landmark) {
        ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4;
        ctx.strokeText(city.landmarks[b.landmark].label, b.x + b.w / 2, b.y + b.h / 2 - 4);
        ctx.fillStyle = '#ffffff'; ctx.fillText(city.landmarks[b.landmark].label, b.x + b.w / 2, b.y + b.h / 2 - 4);
      }
    }
    const d = city.docks;
    ctx.fillStyle = '#8a7a5a'; ctx.fillRect(d.x, d.y, d.w, d.h);
    const containerColors = ['#b8452f', '#2f6fb8', '#e8b73a', '#5a7a4a'];
    for (let i = 0; i < 8; i += 1) { ctx.fillStyle = containerColors[i % 4]; ctx.fillRect(d.x + 10 + (i % 2) * 70, d.y + 14 + Math.floor(i / 2) * 140, 60, 120); }
    text(d.label, d.x + d.w / 2, d.y + d.h + 22, 15, '#5a4632', 'center', 'bold ');
    // Marina piers and umbrellas.
    for (const pier of city.piers) {
      ctx.fillStyle = '#a08e6d'; ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
      ctx.strokeStyle = '#6f5a3a'; ctx.lineWidth = 3; ctx.strokeRect(pier.x, pier.y, pier.w, pier.h);
      text(pier.label, pier.x + pier.w / 2, pier.y + 16, 12, '#5a4632', 'center', 'bold ');
    }
    for (const u of city.umbrellas || []) {
      ctx.fillStyle = u.color; ctx.beginPath(); ctx.arc(u.x, u.y, 16, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(u.x, u.y + 18); ctx.stroke();
    }
  }
  function drawTrees(city) {
    const v = visibleRect();
    for (const t of city.trees) {
      if (t.x < v.x || t.x > v.x + v.w || t.y < v.y || t.y > v.y + v.h) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(t.x + 5, t.y + 6, t.r, t.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.palm ? '#5a9c4a' : '#4a8a3a'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6fbf5a'; ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2); ctx.fill();
    }
    // Street lamps: glow at night.
    for (const lamp of city.lamps) {
      if (lamp.x < v.x || lamp.x > v.x + v.w || lamp.y < v.y || lamp.y > v.y + v.h) continue;
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
    }
  }
  function drawCar(car, time, isPlayer) {
    const spec = car.spec;
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, -spec.length / 2 + 4, -spec.width / 2 + 5, spec.length, spec.width, 8); ctx.fill();
    if (isPlayer) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, spec.length / 2 + 8, 0, Math.PI * 2); ctx.stroke(); }
    if (spec.kind === 'bike') {
      ctx.strokeStyle = car.color; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-spec.length / 2, 0); ctx.lineTo(spec.length / 2, 0); ctx.stroke();
      ctx.fillStyle = '#20242e'; ctx.beginPath(); ctx.arc(-spec.length / 2 + 4, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(spec.length / 2 - 4, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c39a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); return;
    }
    if (spec.kind === 'boat') {
      ctx.fillStyle = car.color; roundRect(ctx, -spec.length / 2, -spec.width / 2, spec.length, spec.width, 10); ctx.fill();
      ctx.fillStyle = '#1e2a33'; roundRect(ctx, -6, -spec.width / 2 + 4, 18, spec.width - 8, 4); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(spec.length / 2 - 2, -4, 3, 8);
      ctx.restore(); return;
    }
    ctx.fillStyle = car.color; roundRect(ctx, -spec.length / 2, -spec.width / 2, spec.length, spec.width, 7); ctx.fill();
    ctx.fillStyle = '#1e2a33';
    roundRect(ctx, spec.length / 2 - 16, -spec.width / 2 + 3, 10, spec.width - 6, 3); ctx.fill();
    roundRect(ctx, -spec.length / 2 + 5, -spec.width / 2 + 3, 8, spec.width - 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(ctx, -6, -spec.width / 2 + 4, 16, spec.width - 8, 4); ctx.fill();
    if (car.type === 'taxi') {
      ctx.fillStyle = '#20242e';
      for (let i = 0; i < 5; i += 1) ctx.fillRect(-spec.length / 2 + 4 + i * 9, -spec.width / 2 + 1, 5, 5);
      text('TAXI', 0, -spec.width / 2 - 4, 9, '#20242e', 'center', 'bold ');
    }
    if (car.type === 'limo') { ctx.fillStyle = '#e8b73a'; ctx.fillRect(-spec.length / 2 + 8, -2, spec.length - 16, 4); }
    if (car.type === 'police') {
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-8, -spec.width / 2, 16, spec.width);
      const flash = Math.floor(time * 4) % 2 === 0;
      ctx.fillStyle = flash ? '#e83a3a' : '#3a6fe8'; ctx.fillRect(-4, -spec.width / 2 - 2, 8, 6);
      ctx.fillStyle = flash ? '#3a6fe8' : '#e83a3a'; ctx.fillRect(-4, spec.width / 2 - 4, 8, 6);
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(spec.length / 2 - 2, -spec.width / 2 + 2, 3, 5); ctx.fillRect(spec.length / 2 - 2, spec.width / 2 - 7, 3, 5);
    ctx.fillStyle = car.brakeLight ? '#ff2a2a' : '#a82a2a';
    ctx.fillRect(-spec.length / 2 - 1, -spec.width / 2 + 2, 3, 5); ctx.fillRect(-spec.length / 2 - 1, spec.width / 2 - 7, 3, 5);
    if (car.health < car.maxHealth * 0.5) {
      ctx.fillStyle = 'rgba(80,80,80,0.5)'; ctx.beginPath(); ctx.arc(-spec.length / 2 + 4, 0, 6 + Math.sin(time * 9 + car.id) * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawPed(ped) {
    const bob = Math.sin(ped.walkPhase) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(ped.x + 3, ped.y + 4, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.color; ctx.beginPath(); ctx.arc(ped.x, ped.y + bob * 0.4, ped.kind === 'beachgoer' ? 8 : 9, 0, Math.PI * 2); ctx.fill();
    if (ped.kind === 'jogger') { ctx.fillStyle = '#ffffff'; ctx.fillRect(ped.x - 6, ped.y - 2, 12, 3); }
    if (ped.kind === 'worker') { ctx.fillStyle = '#e8b73a'; ctx.beginPath(); ctx.arc(ped.x, ped.y - 4, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#e8c39a'; ctx.beginPath(); ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3 + bob * 0.4, 5.5, 0, Math.PI * 2); ctx.fill();
  }
  function drawPlayer(world) {
    const s = world.state; const p = s.player;
    if (!p.onFoot) return;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 5, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    const swing = Math.sin(p.walkPhase) * 4;
    ctx.strokeStyle = '#20242e'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(p.angle) * 6 + swing, p.y - Math.sin(p.angle) * 6);
    ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(p.angle) * 6 - swing, p.y - Math.sin(p.angle) * 6); ctx.stroke();
    ctx.fillStyle = p.jacket || '#e83a3a'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c39a'; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6, 0, Math.PI * 2); ctx.fill();
    if (p.hasPistol) {
      ctx.strokeStyle = '#20242e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.angle) * 8, p.y + Math.sin(p.angle) * 8); ctx.lineTo(p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18); ctx.stroke();
    }
    if (p.hurtFlash > 0) { ctx.fillStyle = 'rgba(232,58,58,0.35)'; ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2); ctx.fill(); }
  }
  function drawMarkers(world, time) {
    const s = world.state;
    const marker = missionMarker(world);
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    const ring = (m, color) => {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(m.x, m.y, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = color + '2e'; ctx.beginPath(); ctx.arc(m.x, m.y, 34 * pulse, 0, Math.PI * 2); ctx.fill();
      const grad = ctx.createLinearGradient(m.x, m.y - 260, m.x, m.y);
      grad.addColorStop(0, 'rgba(255,210,58,0)'); grad.addColorStop(1, 'rgba(255,210,58,0.35)');
      ctx.fillStyle = grad; ctx.fillRect(m.x - 12, m.y - 260, 24, 260);
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(m.x, m.y - 46); ctx.lineTo(m.x - 10, m.y - 26); ctx.lineTo(m.x + 10, m.y - 26); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    if (marker) ring(marker, '#ffd23a');
    const side = sideJobMarker(world);
    if (side) ring(side, side.color || '#4ad9a0');
    if (s.taxi && s.taxi.stage === 'dropoff') {
      ctx.save(); ctx.strokeStyle = '#7ad94e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(s.taxi.dest.x, s.taxi.dest.y, 30 * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (s.taxi && s.taxi.stage === 'pickup') {
      ctx.save(); ctx.fillStyle = '#7ad94e'; ctx.beginPath(); ctx.arc(s.taxi.x, s.taxi.y, 10 + Math.sin(time * 5) * 2, 0, Math.PI * 2); ctx.fill();
      text('$', s.taxi.x, s.taxi.y + 4, 12, '#20242e', 'center', 'bold '); ctx.restore();
    }
  }
  function drawPickups(world, time) {
    for (const pickup of world.state.pickups) {
      if (pickup.respawn > 0) continue;
      ctx.save(); ctx.fillStyle = '#7ad94e'; ctx.beginPath(); ctx.arc(pickup.x, pickup.y, 12 + Math.sin(time * 3 + pickup.x) * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a7a2a'; ctx.lineWidth = 2; ctx.stroke();
      text('$', pickup.x, pickup.y + 5, 14, '#1e4a12', 'center', 'bold '); ctx.restore();
    }
  }
  function drawParticles(world) {
    for (const p of world.particles) {
      if (p.kind === 'spark') { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); ctx.globalAlpha = 1; }
      else if (p.kind === 'skid') { ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.5; ctx.fillStyle = '#20242e'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillRect(-8, -3, 16, 6); ctx.restore(); ctx.globalAlpha = 1; }
      else if (p.kind === 'wake') { ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.4; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      else if (p.kind === 'tracer') { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (p.kind === 'flash') { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    }
  }
  function drawHeli(world) {
    const s = world.state;
    if (!s.heli) return;
    const h = s.heli;
    ctx.save(); ctx.translate(h.x, h.y);
    ctx.fillStyle = 'rgba(255,255,220,0.12)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, 260); ctx.lineTo(40, 260); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#20242e'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a6fe8'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#20242e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.stroke();
    ctx.restore();
    text('PD HELI', h.x, h.y - 26, 12, '#ffffff', 'center', 'bold ');
  }
  function drawWorld(world, time) {
    const s = world.state;
    currentCamera = { x: s.camera.x + (s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0), y: s.camera.y + (s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0) };
    ctx.setTransform(view.zoom, 0, 0, view.zoom, view.cx - currentCamera.x * view.zoom, view.cy - currentCamera.y * view.zoom);
    drawGround(world.city, world);
    drawBuildings(world.city);
    drawTrees(world.city);
    drawPickups(world, time);
    drawMarkers(world, time);
    for (const car of s.cars) if (car.driver === 'parked' && !car.dead) drawCar(car, time, false);
    for (const car of s.cars) if (car.driver === 'traffic' && !car.dead) drawCar(car, time, false);
    for (const cop of s.cops) if ((cop.kind === 'car' || cop.kind === 'roadblock') && !cop.gone) drawCar(cop.car, time, false);
    if (s.playerCar && !s.playerCar.dead) drawCar(s.playerCar, time, true);
    for (const ped of s.peds) if (!ped.dead) drawPed(ped);
    for (const npc of s.npcs) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(npc.x + 3, npc.y + 5, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = npc.color; ctx.beginPath(); ctx.arc(npc.x, npc.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c39a'; ctx.beginPath(); ctx.arc(npc.x, npc.y - 2, 6, 0, Math.PI * 2); ctx.fill();
      text(npc.name, npc.x, npc.y - 18, 12, '#ffffff', 'center', 'bold ');
    }
    for (const cop of s.cops) {
      if (cop.kind !== 'foot' || cop.gone) continue;
      ctx.fillStyle = '#20242e'; ctx.beginPath(); ctx.arc(cop.x, cop.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a6fe8'; ctx.beginPath(); ctx.arc(cop.x, cop.y - 2, 6, 0, Math.PI * 2); ctx.fill();
      text('PD', cop.x, cop.y - 16, 10, '#ffffff', 'center', 'bold ');
    }
    drawPlayer(world);
    drawHeli(world);
    drawParticles(world);
    // Rain streaks in world space.
    if (world.climate.weather === 'rain') {
      ctx.strokeStyle = 'rgba(200,220,255,0.5)'; ctx.lineWidth = 2;
      for (const drop of world.climate.rain) {
        const sp = worldToScreen(drop.x, drop.y);
        void sp;
        ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x - 6, drop.y + 18); ctx.stroke();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Sky tint: dusk warmth, night darkness, rain grey.
    const day = daylight(world.climate);
    if (world.climate.weather === 'rain') { ctx.fillStyle = 'rgba(60,70,90,0.18)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    else if (day < 0.5) { ctx.fillStyle = `rgba(8,12,34,${(0.5 - day) * 0.9})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    else if (day < 1) { ctx.fillStyle = 'rgba(232,120,60,0.10)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    const glare = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(canvas.width, canvas.height) * 0.7);
    glare.addColorStop(0, 'rgba(255,214,140,0.20)'); glare.addColorStop(0.5, 'rgba(255,214,140,0.05)'); glare.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = glare; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vig = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.42, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // District label, bottom centre.
    const d = districtAt(s.player.x, s.player.y);
    text(d.name, canvas.width / 2, canvas.height - 18, 13, 'rgba(255,255,255,0.8)', 'center', 'bold ');
  }
  function drawPhone(world) {
    const s = world.state;
    if (!s.phoneOpen) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = 340; const h = 300; const x = canvas.width - w - 24; const y = 120;
    ctx.fillStyle = 'rgba(12,14,22,0.92)'; roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 14); ctx.stroke();
    text('📱 SOLMAR PHONE', x + 20, y + 34, 16, '#ffd23a', 'left', 'bold ');
    text(`Cash $${s.cash} · Jobs ${s.missionDone.length}/10 · Side jobs ${s.sideJobsDone}`, x + 20, y + 58, 13, '#e8e8e8', 'left');
    text('Call a contact for a side job (press 1–3):', x + 20, y + 84, 13, '#cfcfcf', 'left');
    const contacts = [
      ['1', 'Mara Solis', 'Delivery job — $260'],
      ['2', 'Dante', 'Getaway job — $420'],
      ['3', 'Lena Cruz', 'Taxi shift — $150 bonus'],
    ];
    contacts.forEach((c, i) => {
      text(`${c[0]}  ${c[1]}`, x + 20, y + 116 + i * 44, 15, '#ffffff', 'left', 'bold ');
      text(c[2], x + 20, y + 134 + i * 44, 12, '#9aa0ab', 'left');
    });
    text('Q — close phone', x + 20, y + h - 18, 13, '#ffd23a', 'left');
    void s;
  }
  function drawTitle(world, ui) {
    drawWorld(world, world.time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(10,12,20,0.45)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    text('SOLMAR', cx, canvas.height * 0.2, 64, '#ffd23a', 'center', 'bold ');
    text('B A Y  ·  v2', cx, canvas.height * 0.2 + 44, 22, '#ffffff', 'center', 'bold ');
    text('Ten jobs, four districts, a marina, day and night — one city to take.', cx, canvas.height * 0.2 + 84, 18, '#e8e8e8', 'center');
    const items = ui.saveExists ? ['Continue', 'New Game', 'How to Play'] : ['New Game', 'How to Play'];
    const top = canvas.height * 0.42;
    for (let i = 0; i < items.length; i += 1) {
      const y = top + i * 52; const selected = i === ui.selected;
      if (selected) { ctx.fillStyle = '#ffd23a'; roundRect(ctx, cx - 190, y - 30, 380, 42, 8); ctx.fill(); text(items[i], cx, y, 22, '#20242e', 'center', 'bold '); }
      else text(items[i], cx, y, 22, '#ffffff', 'center');
    }
    text('WASD move · Shift sprint · E enter car/bike/boat · Space punch · Mouse aim, click shoot', cx, canvas.height - 88, 15, '#cfcfcf', 'center');
    text('F talk / shop · Q phone · R radio · H horn · P pause · M mute', cx, canvas.height - 64, 15, '#cfcfcf', 'center');
    text('progress saves automatically', cx, canvas.height - 38, 15, '#cfcfcf', 'center');
  }
  function drawHelp(ui) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#14161f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    text('HOW TO PLAY', cx, 110, 40, '#ffd23a', 'center', 'bold ');
    const lines = [
      'You are Rico Vega, back in Solmar Bay after five years away.',
      'Mara Solis runs the garage and has work for a driver who asks no questions.',
      '',
      'WASD / arrows — walk and drive · Shift — sprint · E — get in / out of a car, bike or boat',
      'Space — punch · Mouse — aim · Click — shoot (buy a pistol at Solmar Arms)',
      'F — talk, buy, repair, repaint, buy a jacket or the Marina Loft · Q — phone for side jobs',
      'R — change radio station · H — horn · P — pause · M — mute',
      '',
      'Steal cars, bikes and boats; take taxi fares; grab the green cash on the streets.',
      'Crimes the police see raise your wanted stars — roadblocks at 3, a helicopter at 4.',
      'A fresh paint job cools the heat. Hide until it fades, or buy the Marina Loft.',
      'Follow the yellow marker: ten jobs, from the garage to the casino and the harbor escape.',
      'Your cash, jobs, jacket and loft save automatically when you finish a job.',
    ];
    for (let i = 0; i < lines.length; i += 1) text(lines[i], cx, 170 + i * 30, 17, '#e8e8e8', 'center');
    text('Press Enter or click to go back', cx, canvas.height - 60, 18, '#ffd23a', 'center');
    void ui;
  }
  function drawPaused() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(10,12,20,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    text('PAUSED', canvas.width / 2, canvas.height / 2 - 20, 52, '#ffffff', 'center', 'bold ');
    text('Press P to resume · progress is saved when you finish a job', canvas.width / 2, canvas.height / 2 + 24, 17, '#cfcfcf', 'center');
  }
  function drawOverlay(world) {
    const s = world.state;
    if (!s.overlay) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = s.overlay === 'busted' ? 'rgba(20,40,120,0.55)' : 'rgba(120,20,20,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    text(s.overlay === 'busted' ? 'BUSTED' : 'WASTED', canvas.width / 2, canvas.height / 2, 72, '#ffffff', 'center', 'bold ');
    text('Solmar General patched you up — the fine came out of your cash.', canvas.width / 2, canvas.height / 2 + 44, 18, '#e8e8e8', 'center');
  }
  function draw(world, screen, ui) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#14161f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (screen === SCREEN_HELP) { drawHelp(ui); return; }
    if (screen === SCREEN_TITLE) { drawTitle(world, ui); return; }
    drawWorld(world, world.time);
    drawPhone(world);
    if (screen === SCREEN_PAUSED) drawPaused();
    drawOverlay(world);
  }
  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    worldPoint(sx, sy) {
      const ratio = window.devicePixelRatio || 1;
      const px = sx * ratio; const py = sy * ratio;
      return { x: (px - view.cx) / view.zoom + currentCamera.x, y: (py - view.cy) / view.zoom + currentCamera.y };
    },
    get canvas() { return canvas; },
  };
}
