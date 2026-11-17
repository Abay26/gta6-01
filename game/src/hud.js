// The HUD: cash and health, wanted stars, the mission objective, toasts, the
// speedometer while driving — and the minimap, the little live map of Solmar
// Bay in the corner that shows the roads, the player, the cops and the job.
import { BEACH_Y, CAR_TYPES, ROAD_LINES, STORY, WATER_Y, WORLD } from './config.js';
import { missionMarker, objectiveText } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function createHud(canvas) {
  const ctx = canvas.getContext('2d');
  const fonts = new Map();

  function text(value, x, y, size, color, align = 'left', weight = '') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(12,14,22,0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawStars(world) {
    const s = world.state;
    const x = canvas.width - 24;
    const y = 30;
    for (let i = 0; i < 5; i += 1) {
      ctx.font = 'bold 26px ' + FONT;
      ctx.fillStyle = i < s.wanted ? '#ffd23a' : 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'right';
      ctx.fillText('★', x - i * 30, y);
    }
    if (s.wanted > 0) {
      text('WANTED', x - 5 * 30 - 24, y, 13, '#ff6a5a', 'right', 'bold ');
    }
  }

  function drawMinimap(world) {
    const size = 208;
    const x0 = canvas.width - size - 16;
    const y0 = canvas.height - size - 16;
    const scale = size / WORLD;
    panel(x0 - 6, y0 - 6, size + 12, size + 12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, size, size);
    ctx.clip();
    // Sea and sand along the bottom edge.
    ctx.fillStyle = '#2e7f9e';
    ctx.fillRect(x0, y0 + WATER_Y * scale, size, size - WATER_Y * scale);
    ctx.fillStyle = '#e9d6a4';
    ctx.fillRect(x0, y0 + BEACH_Y * scale, size, (WATER_Y - BEACH_Y) * scale);
    ctx.fillStyle = '#3b404b';
    ctx.fillRect(x0, y0, size, BEACH_Y * scale);
    // Roads.
    ctx.strokeStyle = '#7a7f8a';
    ctx.lineWidth = 3;
    for (const line of ROAD_LINES) {
      ctx.beginPath();
      ctx.moveTo(x0 + line * scale, y0);
      ctx.lineTo(x0 + line * scale, y0 + size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0, y0 + line * scale);
      ctx.lineTo(x0 + size, y0 + line * scale);
      ctx.stroke();
    }
    // Buildings as dots.
    ctx.fillStyle = '#9aa0ab';
    for (const b of world.city.buildings) {
      ctx.fillRect(x0 + b.x * scale, y0 + b.y * scale, Math.max(1.5, b.w * scale), Math.max(1.5, b.h * scale));
    }
    const s = world.state;
    // Mission marker: pulsing yellow diamond.
    const marker = missionMarker(world);
    if (marker) {
      const pulse = 5 + Math.sin(world.time * 4) * 2;
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(x0 + marker.x * scale, y0 + marker.y * scale - pulse - 3);
      ctx.lineTo(x0 + marker.x * scale + pulse + 3, y0 + marker.y * scale);
      ctx.lineTo(x0 + marker.x * scale, y0 + marker.y * scale + pulse + 3);
      ctx.lineTo(x0 + marker.x * scale - pulse - 3, y0 + marker.y * scale);
      ctx.closePath();
      ctx.fill();
    }
    // Taxi fare.
    if (s.taxi) {
      const tx = s.taxi.stage === 'pickup' ? s.taxi.x : s.taxi.dest.x;
      const ty = s.taxi.stage === 'pickup' ? s.taxi.y : s.taxi.dest.y;
      ctx.fillStyle = '#7ad94e';
      ctx.beginPath();
      ctx.arc(x0 + tx * scale, y0 + ty * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cops: blue dots, flashing when the heat is on.
    for (const cop of s.cops) {
      if (cop.gone) continue;
      const cx = cop.kind === 'car' ? cop.car.x : cop.x;
      const cy = cop.kind === 'car' ? cop.car.y : cop.y;
      ctx.fillStyle = Math.floor(world.time * 4) % 2 === 0 ? '#3a6fe8' : '#e83a3a';
      ctx.beginPath();
      ctx.arc(x0 + cx * scale, y0 + cy * scale, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player: a white arrow pointing where they face.
    const p = s.player;
    const px = s.playerCar ? s.playerCar.x : p.x;
    const py = s.playerCar ? s.playerCar.y : p.y;
    const angle = s.playerCar ? s.playerCar.angle : p.angle;
    ctx.save();
    ctx.translate(x0 + px * scale, y0 + py * scale);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    text(STORY.city.toUpperCase(), x0 + size, y0 - 10, 11, 'rgba(255,255,255,0.75)', 'right', 'bold ');
    // North arrow.
    text('N', x0 + 12, y0 + 16, 12, '#ffffff', 'center', 'bold ');
  }

  function drawObjective(world) {
    const s = world.state;
    const line = objectiveText(world);
    ctx.font = '16px ' + FONT;
    const w = Math.min(canvas.width - 32, ctx.measureText(line).width + 32);
    panel((canvas.width - w) / 2, 14, w, 34);
    text(line, canvas.width / 2, 37, 16, '#ffd23a', 'center', 'bold ');
  }

  function drawToasts(world) {
    const s = world.state;
    let y = 96; // clear of the objective banner at the top
    for (const toast of s.toasts) {
      ctx.globalAlpha = Math.min(1, toast.ttl);
      ctx.font = '15px ' + FONT;
      const w = Math.min(canvas.width - 32, ctx.measureText(toast.text).width + 28);
      panel((canvas.width - w) / 2, y, w, 30);
      text(toast.text, canvas.width / 2, y + 20, 15, '#ffffff', 'center');
      ctx.globalAlpha = 1;
      y += 38;
    }
  }

  function drawStatus(world) {
    const s = world.state;
    const p = s.player;
    panel(16, 14, 210, 74);
    text(`$${s.cash.toLocaleString('en-US')}`, 30, 42, 24, '#7ad94e', 'left', 'bold ');
    // Health bar.
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(30, 52, 150, 10);
    ctx.fillStyle = p.health > 50 ? '#7ad94e' : p.health > 25 ? '#e8b73a' : '#e83a3a';
    ctx.fillRect(30, 52, 150 * Math.max(0, p.health / 100), 10);
    if (p.hasPistol) {
      text(`PISTOL  ${p.ammo}`, 30, 80, 13, '#e8e8e8', 'left', 'bold ');
    }
    // Clock: the game minute the city is living in, clear of the panel.
    const total = Math.floor(world.clockMinutes) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    text(`${hh}:${mm}`, 240, 42, 20, '#ffffff', 'left', 'bold ');
    text(STORY.city, 240, 62, 12, '#cfcfcf', 'left');
  }

  function drawSpeed(world) {
    const s = world.state;
    if (!s.playerCar) return;
    const car = s.playerCar;
    const kmh = Math.round(Math.abs(car.speed) * 0.32);
    // Tucked left of the minimap so the two never overlap.
    const x = canvas.width - 356;
    const y = canvas.height - 70;
    panel(x, y, 110, 54);
    text(`${kmh}`, x + 14, y + 34, 28, '#ffffff', 'left', 'bold ');
    text('km/h', x + 66, y + 34, 13, '#cfcfcf', 'left');
    // Car health bar.
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 14, y + 42, 82, 6);
    ctx.fillStyle = car.health > 50 ? '#7ad94e' : '#e83a3a';
    ctx.fillRect(x + 14, y + 42, 82 * Math.max(0, car.health / car.maxHealth), 6);
    text(car.spec.name.toUpperCase(), x + 14, y - 8, 11, '#ffffff', 'left', 'bold ');
  }

  function drawHints(world) {
    const s = world.state;
    const p = s.player;
    let hint = '';
    if (p.onFoot) {
      const nearCar = s.cars.some((car) => !car.dead && Math.hypot(car.x - p.x, car.y - p.y) < 64);
      if (nearCar) hint = 'E — Get in the car';
      const shop = world.city.landmarks.gunshop;
      if (Math.hypot(p.x - shop.x, p.y - (shop.y + shop.h / 2 + 70)) < 90) {
        hint = p.hasPistol ? 'F — Buy ammo ($60)' : 'F — Buy a pistol ($400)';
      }
      const garage = world.city.landmarks.garage;
      if (s.playerCar === null && Math.hypot(p.x - garage.x, p.y - (garage.y + garage.h / 2 + 70)) < 90) {
        hint = 'F — Talk to Mara';
      }
    } else {
      hint = 'E — Get out · H — Horn · W/S drive · A/D steer';
    }
    if (!hint) return;
    ctx.font = '14px ' + FONT;
    const w = ctx.measureText(hint).width + 28;
    panel(16, canvas.height - 46, w, 30);
    text(hint, 30, canvas.height - 26, 14, '#ffffff', 'left');
  }

  function draw(world) {
    drawStatus(world);
    drawStars(world);
    drawObjective(world);
    drawToasts(world);
    drawSpeed(world);
    drawMinimap(world);
    drawHints(world);
    void CAR_TYPES;
  }

  return { draw };
}
