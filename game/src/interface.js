// The interface: cash and health, wanted stars, the clock and weather,
// the radio station, the objective, toasts, the phone, and the minimap.
import { WORLD_SIZE, VEHICLES, STATIONS } from './tuning.js';
import { clockString, weatherString } from './weather.js';
import { objectiveLine } from './story.js';
import { shopHint } from './shops.js';
import { CONTACTS } from './cell.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export function makeInterface(canvas) {
  const ctx = canvas.getContext('2d');
  const ui = { canvas, ctx };
  function pill(x, y, w, h) {
    ctx.fillStyle = 'rgba(10,12,24,0.62)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
  }
  function drawMinimap(world) {
    const s = world.state;
    const size = 190;
    const x0 = 16; const y0 = canvas.clientHeight - size - 16;
    const k = size / WORLD_SIZE;
    pill(x0 - 6, y0 - 6, size + 12, size + 12);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, size, size); ctx.clip();
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(x0, y0, size, size);
    ctx.fillStyle = '#2e7f9e';
    ctx.fillRect(x0, y0 + 3360 * k, size, size - 3360 * k);
    ctx.fillStyle = '#e9d6a4';
    ctx.fillRect(x0, y0 + 3360 * k, size, (3520 - 3360) * k);
    ctx.strokeStyle = '#454a55'; ctx.lineWidth = 3;
    for (const line of [200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400]) {
      ctx.beginPath(); ctx.moveTo(x0, y0 + line * k); ctx.lineTo(x0 + size, y0 + line * k); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 + line * k, y0); ctx.lineTo(x0 + line * k, y0 + size); ctx.stroke();
    }
    const dot = (x, y, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x0 + x * k, y0 + y * k, r, 0, Math.PI * 2); ctx.fill();
    };
    if (s.fare) dot(s.fare.stage === 'pickup' ? s.fare.x : s.fare.dest.x, s.fare.stage === 'pickup' ? s.fare.y : s.fare.dest.y, '#7ad94e', 4);
    for (const o of s.officers) dot(o.car ? o.car.x : o.x, o.car ? o.car.y : o.y, '#e83a3a', 3);
    const px = s.car ? s.car.x : s.hero.x;
    const py = s.car ? s.car.y : s.hero.y;
    dot(px, py, '#fff', 5);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0 + px * k, y0 + py * k, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = '11px ' + FONT;
    ctx.fillText('SOLMAR BAY', x0, y0 - 10);
  }
  ui.draw = (world) => {
    const s = world.state;
    const W = canvas.clientWidth; const H = canvas.clientHeight;
    ctx.save();
    // Top-left: cash, health, vehicle hull.
    pill(16, 14, 250, 64);
    ctx.fillStyle = '#7ad94e';
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText(`$${s.cash.toLocaleString()}`, 28, 40);
    ctx.fillStyle = '#e83a3a';
    ctx.fillRect(28, 50, 150 * (s.hero.health / 100), 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeRect(28, 50, 150, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '12px ' + FONT;
    ctx.fillText(`HP ${Math.ceil(s.hero.health)}`, 186, 59);
    if (s.car) {
      ctx.fillStyle = '#4a9ab5';
      ctx.fillRect(28, 64, 150 * Math.max(0, s.car.health / s.car.maxHealth), 6);
    }
    // Top-right: wanted stars, clock, weather, radio.
    const stars = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
    pill(W - 266, 14, 250, 64);
    ctx.fillStyle = s.wanted > 0 ? '#e8b73a' : 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 22px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(stars, W - 28, 40);
    ctx.fillStyle = '#fff';
    ctx.font = '13px ' + FONT;
    ctx.fillText(`${clockString(world.sky)} · ${weatherString(world.sky)}`, W - 28, 60);
    ctx.fillText(`Radio: ${STATIONS[s.station].name}`, W - 28, 76 - 4);
    ctx.textAlign = 'left';
    // Objective pill, bottom centre.
    const line = objectiveLine(world);
    ctx.font = '15px ' + FONT;
    const tw = ctx.measureText(line).width + 28;
    pill((W - tw) / 2, H - 56, tw, 34);
    ctx.fillStyle = '#e8d98a';
    ctx.fillText(line, (W - tw) / 2 + 14, H - 33);
    // Shop hint above the objective.
    const hint = shopHint(world);
    if (hint) {
      ctx.font = '14px ' + FONT;
      const hw = ctx.measureText(hint).width + 28;
      pill((W - hw) / 2, H - 100, hw, 30);
      ctx.fillStyle = '#fff';
      ctx.fillText(hint, (W - hw) / 2 + 14, H - 79);
    }
    // Toasts, top centre.
    ctx.font = '14px ' + FONT;
    s.toasts.forEach((t, i) => {
      const w = ctx.measureText(t.text).width + 24;
      pill((W - w) / 2, 92 + i * 36, w, 28);
      ctx.fillStyle = '#fff';
      ctx.fillText(t.text, (W - w) / 2 + 12, 92 + i * 36 + 19);
    });
    // Speed and vehicle, bottom right.
    if (s.car) {
      const spec = VEHICLES[s.car.type];
      pill(W - 216, H - 96, 200, 40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(Math.abs(s.car.speed) * 0.12)} mph`, W - 28, H - 70);
      ctx.font = '12px ' + FONT;
      ctx.fillText(spec.label, W - 28, H - 106 + 36);
      ctx.textAlign = 'left';
    } else if (s.hero.hasPistol) {
      pill(W - 216, H - 96, 200, 40);
      ctx.fillStyle = '#fff';
      ctx.font = '14px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(`Pistol · ${s.hero.ammo} rounds`, W - 28, H - 70);
      ctx.textAlign = 'left';
    }
    // Phone panel.
    if (s.phoneOpen) {
      pill(W - 320, 96, 300, 210);
      ctx.fillStyle = '#e8d98a';
      ctx.font = 'bold 16px ' + FONT;
      ctx.fillText('📱  SOLMAR PHONE', W - 304, 122);
      ctx.fillStyle = '#fff';
      ctx.font = '14px ' + FONT;
      CONTACTS.forEach((c, i) => {
        ctx.fillText(`${i + 1}  ${c.name}`, W - 304, 152 + i * 36);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '12px ' + FONT;
        ctx.fillText(`     ${c.role}`, W - 304, 168 + i * 36);
        ctx.fillStyle = '#fff';
        ctx.font = '14px ' + FONT;
      });
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '12px ' + FONT;
      ctx.fillText('Press 1–4 to call · Q to hang up', W - 304, 152 + CONTACTS.length * 36 + 4);
    }
    // Crosshair when armed on foot.
    if (!s.car && s.hero.hasPistol) {
      const mx = world.mouseX ?? W / 2; const my = world.mouseY ?? H / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx - 14, my); ctx.lineTo(mx - 6, my);
      ctx.moveTo(mx + 6, my); ctx.lineTo(mx + 14, my);
      ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my - 6);
      ctx.moveTo(mx, my + 6); ctx.lineTo(mx, my + 14); ctx.stroke();
    }
    drawMinimap(world);
    ctx.restore();
  };
  return ui;
}
