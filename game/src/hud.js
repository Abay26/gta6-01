// The HUD v2: cash and health, wanted stars, the mission objective, toasts,
// the speedometer while driving — and the minimap, the little live map of
// Solmar Bay that shows the roads, the player, the cops, the helicopter and
// the job. Plus the clock, weather, radio station and district.
import { BEACH_Y, CAR_TYPES, ROAD_LINES, STORY, WATER_Y, WORLD } from './config.js';
import { missionMarker, objectiveText } from './missions.js';
import { sideJobMarker } from './phone.js';
import { clockText, weatherLabel } from './climate.js';
import { districtAt } from './config.js';
import { shopHint } from './economy.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export function createHud(canvas) {
  const ctx = canvas.getContext('2d');
  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', weight = '') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    ctx.font = fonts.get(key); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }
  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(12,14,22,0.72)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke();
  }
  function drawStars(world) {
    const s = world.state;
    const x = canvas.width - 24; const y = 30;
    for (let i = 0; i < 5; i += 1) {
      ctx.font = 'bold 26px ' + FONT;
      ctx.fillStyle = i < s.wanted ? '#ffd23a' : 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'right'; ctx.fillText('★', x - i * 30, y);
    }
    if (s.wanted > 0) text('WANTED', x - 5 * 30 - 24, y, 13, '#ff6a5a', 'right', 'bold ');
    if (s.heli) text('HELI OVERHEAD', x, y + 22, 12, '#ff6a5a', 'right', 'bold ');
  }
  function drawMinimap(world) {
    const size = 208; const x0 = canvas.width - size - 16; const y0 = canvas.height - size - 16;
    const scale = size / WORLD;
    panel(x0 - 6, y0 - 6, size + 12, size + 12);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, size, size); ctx.clip();
    ctx.fillStyle = '#2e7f9e'; ctx.fillRect(x0, y0 + WATER_Y * scale, size, size - WATER_Y * scale);
    ctx.fillStyle = '#e9d6a4'; ctx.fillRect(x0, y0 + BEACH_Y * scale, size, (WATER_Y - BEACH_Y) * scale);
    ctx.fillStyle = '#3b404b'; ctx.fillRect(x0, y0, size, BEACH_Y * scale);
    ctx.strokeStyle = '#7a7f8a'; ctx.lineWidth = 3;
    for (const line of ROAD_LINES) {
      ctx.beginPath(); ctx.moveTo(x0 + line * scale, y0); ctx.lineTo(x0 + line * scale, y0 + size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y0 + line * scale); ctx.lineTo(x0 + size, y0 + line * scale); ctx.stroke();
    }
    ctx.fillStyle = '#9aa0ab';
    for (const b of world.city.buildings) ctx.fillRect(x0 + b.x * scale, y0 + b.y * scale, Math.max(1.5, b.w * scale), Math.max(1.5, b.h * scale));
    const s = world.state;
    const marker = missionMarker(world);
    if (marker) {
      const pulse = 5 + Math.sin(world.time * 4) * 2;
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath(); ctx.moveTo(x0 + marker.x * scale, y0 + marker.y * scale - pulse - 3);
      ctx.lineTo(x0 + marker.x * scale + pulse + 3, y0 + marker.y * scale);
      ctx.lineTo(x0 + marker.x * scale, y0 + marker.y * scale + pulse + 3);
      ctx.lineTo(x0 + marker.x * scale - pulse - 3, y0 + marker.y * scale); ctx.closePath(); ctx.fill();
    }
    const side = sideJobMarker(world);
    if (side) { ctx.fillStyle = '#4ad9a0'; ctx.beginPath(); ctx.arc(x0 + side.x * scale, y0 + side.y * scale, 4, 0, Math.PI * 2); ctx.fill(); }
    if (s.taxi) {
      const tx = s.taxi.stage === 'pickup' ? s.taxi.x : s.taxi.dest.x;
      const ty = s.taxi.stage === 'pickup' ? s.taxi.y : s.taxi.dest.y;
      ctx.fillStyle = '#7ad94e'; ctx.beginPath(); ctx.arc(x0 + tx * scale, y0 + ty * scale, 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const cop of s.cops) {
      if (cop.gone) continue;
      const cx = cop.kind === 'foot' ? cop.x : cop.car.x;
      const cy = cop.kind === 'foot' ? cop.y : cop.car.y;
      ctx.fillStyle = Math.floor(world.time * 4) % 2 === 0 ? '#3a6fe8' : '#e83a3a';
      ctx.beginPath(); ctx.arc(x0 + cx * scale, y0 + cy * scale, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    if (s.heli) { ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.arc(x0 + s.heli.x * scale, y0 + s.heli.y * scale, 4, 0, Math.PI * 2); ctx.fill(); }
    const p = s.player;
    const px = s.playerCar ? s.playerCar.x : p.x;
    const py = s.playerCar ? s.playerCar.y : p.y;
    const angle = s.playerCar ? s.playerCar.angle : p.angle;
    ctx.save(); ctx.translate(x0 + px * scale, y0 + py * scale); ctx.rotate(angle);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
    text(STORY.city.toUpperCase(), x0 + size, y0 - 10, 11, 'rgba(255,255,255,0.75)', 'right', 'bold ');
    text('N', x0 + 12, y0 + 16, 12, '#ffffff', 'center', 'bold ');
  }
  function drawObjective(world) {
    const line = objectiveText(world);
    ctx.font = '16px ' + FONT;
    const w = Math.min(canvas.width - 32, ctx.measureText(line).width + 32);
    panel((canvas.width - w) / 2, 14, w, 34);
    text(line, canvas.width / 2, 37, 16, '#ffd23a', 'center', 'bold ');
  }
  function drawToasts(world) {
    let y = 96;
    for (const toast of world.state.toasts) {
      ctx.globalAlpha = Math.min(1, toast.ttl);
      ctx.font = '15px ' + FONT;
      const w = Math.min(canvas.width - 32, ctx.measureText(toast.text).width + 28);
      panel((canvas.width - w) / 2, y, w, 30);
      text(toast.text, canvas.width / 2, y + 20, 15, '#ffffff', 'center');
      ctx.globalAlpha = 1; y += 38;
    }
  }
  function drawStatus(world) {
    const s = world.state; const p = s.player;
    panel(16, 14, 210, 96);
    text(`$${s.cash.toLocaleString('en-US')}`, 30, 42, 24, '#7ad94e', 'left', 'bold ');
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(30, 52, 150, 10);
    ctx.fillStyle = p.health > 50 ? '#7ad94e' : p.health > 25 ? '#e8b73a' : '#e83a3a';
    ctx.fillRect(30, 52, 150 * Math.max(0, p.health / 100), 10);
    if (p.hasPistol) text(`PISTOL  ${p.ammo}`, 30, 80, 13, '#e8e8e8', 'left', 'bold ');
    if (s.ownsLoft) text('🏠 MARINA LOFT', 30, 98, 12, '#4ad9a0', 'left', 'bold ');
    text(`${clockText(world.climate)}`, 240, 42, 20, '#ffffff', 'left', 'bold ');
    text(`${weatherLabel(world.climate)} · Day ${world.climate.day}`, 240, 62, 12, '#cfcfcf', 'left');
    text(districtAt(p.x, p.y).name, 240, 80, 12, '#ffd23a', 'left', 'bold ');
    text(`📻 ${world.audio.station.name}`, 240, 98, 12, '#cfcfcf', 'left');
  }
  function drawSpeed(world) {
    const s = world.state;
    if (!s.playerCar) return;
    const car = s.playerCar;
    const kmh = Math.round(Math.abs(car.speed) * 0.32);
    const x = canvas.width - 356; const y = canvas.height - 70;
    panel(x, y, 110, 54);
    text(`${kmh}`, x + 14, y + 34, 28, '#ffffff', 'left', 'bold ');
    text('km/h', x + 66, y + 34, 13, '#cfcfcf', 'left');
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x + 14, y + 42, 82, 6);
    ctx.fillStyle = car.health > 50 ? '#7ad94e' : '#e83a3a';
    ctx.fillRect(x + 14, y + 42, 82 * Math.max(0, car.health / car.maxHealth), 6);
    text(car.spec.name.toUpperCase(), x + 14, y - 8, 11, '#ffffff', 'left', 'bold ');
  }
  function drawHints(world) {
    const s = world.state; const p = s.player;
    let hint = '';
    if (s.phoneOpen) hint = '1/2/3 — call a contact · Q — close phone';
    else if (p.onFoot) {
      const nearCar = s.cars.some((car) => !car.dead && Math.hypot(car.x - p.x, car.y - p.y) < 64);
      if (nearCar) hint = 'E — Get in (car / bike / boat)';
      const sh = shopHint(world);
      if (sh) hint = sh;
    } else hint = 'E — Get out · H — Horn · W/S drive · A/D steer · R — radio';
    if (!hint) return;
    ctx.font = '14px ' + FONT;
    const w = ctx.measureText(hint).width + 28;
    panel(16, canvas.height - 46, w, 30);
    text(hint, 30, canvas.height - 26, 14, '#ffffff', 'left');
  }
  function draw(world) {
    drawStatus(world); drawStars(world); drawObjective(world); drawToasts(world);
    drawSpeed(world); drawMinimap(world); drawHints(world);
    void CAR_TYPES;
  }
  return { draw };
}
