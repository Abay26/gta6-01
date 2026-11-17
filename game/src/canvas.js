// The painter: a top-down 2D canvas view of Solmar Bay — roads, blocks,
// parks, the beach and sea, traffic, the crowd, cops and the helicopter,
// plus the title, help and pause screens.
import { ROADS, ROAD_W, WORLD_SIZE, SHORE_Y, SEA_Y, PALETTE, VEHICLES, areaAt } from './tuning.js';
import { skyIsNight, skyIsDusk, daylight } from './weather.js';
import { jobMarker } from './story.js';
import { sideMarker } from './cell.js';

export const VIEW_TITLE = 'title';
export const VIEW_PLAY = 'play';
export const VIEW_PAUSED = 'paused';
export const VIEW_HELP = 'help';
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function makePainter(canvas) {
  const ctx = canvas.getContext('2d');
  const painter = { canvas, ctx, cam: { x: 1800, y: 1800 }, scale: 1.12 };
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    painter.w = w; painter.h = h;
  }
  painter.worldPoint = (sx, sy) => ({
    x: painter.cam.x + (sx - painter.w / 2) / painter.scale,
    y: painter.cam.y + (sy - painter.h / 2) / painter.scale,
  });
  function drawGround(world) {
    const s = world.state;
    const day = daylight(world.sky);
    ctx.fillStyle = day > 0.5 ? PALETTE.lawn : PALETTE.lawnDark;
    ctx.fillRect(painter.cam.x - painter.w, painter.cam.y - painter.h, painter.w * 2, painter.h * 2);
    // Sand and sea along the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(painter.cam.x - painter.w, SHORE_Y, painter.w * 2, SEA_Y - SHORE_Y);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(painter.cam.x - painter.w, SEA_Y, painter.w * 2, WORLD_SIZE - SEA_Y + painter.h);
    ctx.fillStyle = PALETTE.seaDeep;
    ctx.fillRect(painter.cam.x - painter.w, SEA_Y + 120, painter.w * 2, WORLD_SIZE - SEA_Y);
    // Roads: asphalt strips with dashed centre lines.
    ctx.fillStyle = PALETTE.asphalt;
    for (const line of ROADS) {
      ctx.fillRect(0, line - ROAD_W / 2, WORLD_SIZE, ROAD_W);
      ctx.fillRect(line - ROAD_W / 2, 0, ROAD_W, WORLD_SIZE);
    }
    ctx.fillStyle = PALETTE.asphaltDark;
    for (const line of ROADS) {
      ctx.fillRect(0, line - ROAD_W / 2, WORLD_SIZE, 6);
      ctx.fillRect(line - ROAD_W / 2, 0, 6, WORLD_SIZE);
    }
    ctx.fillStyle = PALETTE.laneMark;
    for (const line of ROADS) {
      for (let t = 40; t < WORLD_SIZE; t += 90) {
        ctx.fillRect(t, line - 2, 44, 4);
        ctx.fillRect(line - 2, t, 4, 44);
      }
    }
    // Parks.
    for (const g of world.atlas.greens) {
      ctx.fillStyle = '#6f9c4c';
      roundRect(ctx, g.x, g.y, g.w, g.h, 12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '12px ' + FONT;
      ctx.fillText(g.name, g.x + 10, g.y + 20);
    }
    for (const t of world.atlas.trees) {
      ctx.fillStyle = '#4a7a3a';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6fae4a';
      ctx.beginPath(); ctx.arc(t.x - 2, t.y - 2, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    void s;
  }
  function drawBuildings(world) {
    for (const b of world.atlas.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let wy = b.y + 26; wy < b.y + b.h - 10; wy += 18) {
          for (let wx = b.x + 10; wx < b.x + b.w - 14; wx += 22) ctx.fillRect(wx, wy, 12, 10);
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(b.x, b.y + b.h - 12, b.w, 12);
      }
      if (b.landmark) {
        ctx.fillStyle = '#20242e';
        ctx.font = 'bold 13px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 4);
        ctx.textAlign = 'left';
      }
    }
    // Piers and docks.
    ctx.fillStyle = '#8a6f4a';
    for (const p of world.atlas.piers) ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#7a5f3a';
    ctx.fillRect(world.atlas.docks.x, world.atlas.docks.y, world.atlas.docks.w, world.atlas.docks.h);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '12px ' + FONT;
    ctx.fillText('Solmar Docks', world.atlas.docks.x + 12, world.atlas.docks.y + 24);
  }
  function drawMarker(x, y, color, label, pulse) {
    const r = 14 + Math.sin(pulse * 4) * 3;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(232,217,138,0.18)';
    ctx.beginPath(); ctx.arc(x, y, r + 26, 0, Math.PI * 2); ctx.fill();
    if (label) {
      ctx.fillStyle = '#111';
      ctx.font = 'bold 12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 26);
      ctx.textAlign = 'left';
    }
  }
  function drawWalker(world, w) {
    const bob = Math.sin(w.walkPhase) * 2;
    ctx.fillStyle = w.color;
    ctx.beginPath(); ctx.arc(w.x, w.y + bob * 0.3, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(w.x, w.y - 2 + bob * 0.3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.arc(w.x + Math.cos(w.angle) * 5, w.y + Math.sin(w.angle) * 5, 2, 0, Math.PI * 2); ctx.fill();
  }
  function drawVehicle(world, v) {
    const spec = VEHICLES[v.type];
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);
    if (v.type === 'bike') {
      ctx.fillStyle = v.color;
      roundRect(ctx, -spec.len / 2, -5, spec.len, 10, 4); ctx.fill();
      ctx.fillStyle = '#20242e';
      ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath(); ctx.arc(6, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (v.type === 'boat') {
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(spec.len / 2, 0); ctx.lineTo(spec.len / 4, -spec.wid / 2);
      ctx.lineTo(-spec.len / 2, -spec.wid / 2); ctx.lineTo(-spec.len / 2, spec.wid / 2);
      ctx.lineTo(spec.len / 4, spec.wid / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#20242e';
      roundRect(ctx, -6, -7, 18, 14, 3); ctx.fill();
      ctx.fillStyle = '#7ad9e8';
      roundRect(ctx, -2, -5, 10, 10, 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, -spec.len / 2 + 3, -spec.wid / 2 + 4, spec.len, spec.wid, 6); ctx.fill();
      ctx.fillStyle = v.color;
      roundRect(ctx, -spec.len / 2, -spec.wid / 2, spec.len, spec.wid, 6); ctx.fill();
      ctx.fillStyle = v.type === 'police' ? '#e8e8e8' : 'rgba(20,22,31,0.85)';
      roundRect(ctx, -4, -spec.wid / 2 + 3, 16, spec.wid - 6, 3); ctx.fill();
      ctx.fillStyle = 'rgba(180,220,255,0.8)';
      roundRect(ctx, spec.len / 2 - 12, -spec.wid / 2 + 3, 8, spec.wid - 6, 2); ctx.fill();
      // Headlights.
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.arc(spec.len / 2 - 2, -spec.wid / 2 + 4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(spec.len / 2 - 2, spec.wid / 2 - 4, 2.5, 0, Math.PI * 2); ctx.fill();
      if (v.type === 'police') {
        const flash = Math.floor(world.time * 6) % 2 === 0;
        ctx.fillStyle = flash ? '#e83a3a' : '#2f6fb8';
        ctx.beginPath(); ctx.arc(-2, -spec.wid / 2 + 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = flash ? '#2f6fb8' : '#e83a3a';
        ctx.beginPath(); ctx.arc(-2, spec.wid / 2 - 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#20242e';
        ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center';
        ctx.fillText('PD', 0, 3);
        ctx.textAlign = 'left';
      }
      if (v.type === 'taxi') {
        ctx.fillStyle = '#20242e';
        ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center';
        ctx.fillText('TAXI', 0, 3);
        ctx.textAlign = 'left';
      }
    }
    ctx.restore();
    // Damage smoke.
    if (v.health < v.maxHealth * 0.45) {
      ctx.fillStyle = 'rgba(60,60,60,0.5)';
      ctx.beginPath(); ctx.arc(v.x, v.y - 8, 7 + Math.sin(world.time * 9) * 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawHero(world) {
    const s = world.state;
    const h = s.hero;
    if (s.car) return; // the car carries the hero
    const bob = Math.sin(h.walkPhase) * 2;
    ctx.fillStyle = h.jacket;
    ctx.beginPath(); ctx.arc(h.x, h.y + bob * 0.3, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(h.x + Math.cos(h.angle) * 3, h.y + Math.sin(h.angle) * 3 - 2, 5.5, 0, Math.PI * 2); ctx.fill();
    if (h.hasPistol) {
      ctx.strokeStyle = '#20242e'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(h.x + Math.cos(h.angle) * 8, h.y + Math.sin(h.angle) * 8);
      ctx.lineTo(h.x + Math.cos(h.angle) * 18, h.y + Math.sin(h.angle) * 18);
      ctx.stroke();
    }
    if (h.hurtFlash > 0) {
      ctx.strokeStyle = 'rgba(232,58,58,0.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, 16, 0, Math.PI * 2); ctx.stroke();
    }
  }
  function drawWorldScene(world) {
    const s = world.state;
    resize();
    const shakeX = s.shake > 0 ? (world.rng.next() - 0.5) * s.shake : 0;
    const shakeY = s.shake > 0 ? (world.rng.next() - 0.5) * s.shake : 0;
    painter.cam.x = s.camera.x + shakeX;
    painter.cam.y = s.camera.y + shakeY;
    ctx.save();
    ctx.translate(painter.w / 2, painter.h / 2);
    ctx.scale(painter.scale, painter.scale);
    ctx.translate(-painter.cam.x, -painter.cam.y);
    drawGround(world);
    drawBuildings(world);
    // Cash pickups.
    for (const p of s.pickups) {
      if (p.respawn > 0) continue;
      ctx.fillStyle = '#7ad94e';
      ctx.beginPath(); ctx.arc(p.x, p.y, 9 + Math.sin(world.time * 3 + p.x) * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#20242e';
      ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('$', p.x, p.y + 4);
      ctx.textAlign = 'left';
    }
    // Mission / side / taxi markers.
    const jm = jobMarker(world);
    if (jm) drawMarker(jm.x, jm.y, '#e8d98a', jm.text, world.time);
    const sm = sideMarker(world);
    if (sm) drawMarker(sm.x, sm.y, '#4ad9e8', sm.text, world.time + 2);
    if (s.fare) {
      drawMarker(s.fare.stage === 'pickup' ? s.fare.x : s.fare.dest.x, s.fare.stage === 'pickup' ? s.fare.y : s.fare.dest.y, '#7ad94e', s.fare.stage === 'pickup' ? 'Passenger' : `Dropoff $${s.fare.fare}`, world.time + 4);
    }
    for (const w of s.walkers) drawWalker(world, w);
    for (const n of s.npcs) {
      ctx.fillStyle = n.color;
      ctx.beginPath(); ctx.arc(n.x, n.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath(); ctx.arc(n.x, n.y - 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(n.name, n.x, n.y - 18);
      ctx.textAlign = 'left';
    }
    for (const v of s.vehicles) drawVehicle(world, v);
    for (const o of s.officers) {
      if (o.kind === 'foot') {
        ctx.fillStyle = '#20242e';
        ctx.beginPath(); ctx.arc(o.x, o.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8b73a';
        ctx.beginPath(); ctx.arc(o.x, o.y - 2, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    drawHero(world);
    // Bullets and particles.
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2;
    for (const b of world.bullets) {
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.stroke();
    }
    for (const p of world.fx) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Helicopter: shadow, body, rotor and spotlight.
    if (s.heli) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(s.heli.x + 30, s.heli.y + 40, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#20242e';
      ctx.beginPath(); ctx.ellipse(s.heli.x, s.heli.y, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#20242e'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.heli.x - 26, s.heli.y); ctx.lineTo(s.heli.x + 26, s.heli.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,233,168,0.16)';
      ctx.beginPath(); ctx.arc(s.hero.x, s.hero.y, 120, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8b73a';
      ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('PD HELI', s.heli.x, s.heli.y - 18);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    // Night, dusk and rain in screen space.
    const day = daylight(world.sky);
    if (skyIsNight(world.sky)) {
      ctx.fillStyle = PALETTE.nightTint; ctx.fillRect(0, 0, painter.w, painter.h);
      for (const lamp of world.atlas.lamps) {
        const sx = (lamp.x - painter.cam.x) * painter.scale + painter.w / 2;
        const sy = (lamp.y - painter.cam.y) * painter.scale + painter.h / 2;
        if (sx < -40 || sx > painter.w + 40 || sy < -40 || sy > painter.h + 40) continue;
        ctx.fillStyle = 'rgba(255,233,168,0.5)';
        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
      }
    } else if (skyIsDusk(world.sky)) {
      ctx.fillStyle = PALETTE.duskTint; ctx.fillRect(0, 0, painter.w, painter.h);
    }
    if (world.sky.rain > 0.15) {
      ctx.fillStyle = `rgba(120,140,180,${0.12 * world.sky.rain})`;
      ctx.fillRect(0, 0, painter.w, painter.h);
      ctx.strokeStyle = `rgba(200,220,255,${0.5 * world.sky.rain})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 60; i += 1) {
        const rx = (i * 197 + world.time * 900) % painter.w;
        const ry = (i * 131 + world.time * 1200) % painter.h;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 16); ctx.stroke();
      }
    }
    // Vignette.
    const vg = ctx.createRadialGradient(painter.w / 2, painter.h / 2, Math.min(painter.w, painter.h) * 0.45, painter.w / 2, painter.h / 2, Math.max(painter.w, painter.h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, painter.w, painter.h);
    void day;
  }
  function drawTitle(world, ui) {
    drawWorldScene(world);
    ctx.fillStyle = 'rgba(10,12,24,0.55)';
    ctx.fillRect(0, 0, painter.w, painter.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8d98a';
    ctx.font = 'bold 64px ' + FONT;
    ctx.fillText('SOLMAR BAY', painter.w / 2, painter.h * 0.3);
    ctx.fillStyle = '#fff';
    ctx.font = '20px ' + FONT;
    ctx.fillText('An open-world crime story — ten jobs, four districts, the whole PD after you', painter.w / 2, painter.h * 0.3 + 36);
    const items = ui.saveExists ? ['Continue', 'New Game', 'How to Play'] : ['New Game', 'How to Play'];
    items.forEach((item, i) => {
      const y = painter.h * 0.52 + i * 48;
      if (i === ui.selected) {
        ctx.fillStyle = '#e8d98a';
        roundRect(ctx, painter.w / 2 - 150, y - 30, 300, 40, 8); ctx.fill();
        ctx.fillStyle = '#14161f';
      } else ctx.fillStyle = '#fff';
      ctx.font = (i === ui.selected ? 'bold ' : '') + '20px ' + FONT;
      ctx.fillText(item, painter.w / 2, y);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px ' + FONT;
    ctx.fillText('WASD drive & walk · E enter cars & talk · F punch · Click shoot · Q phone · R radio · P pause', painter.w / 2, painter.h - 40);
    ctx.textAlign = 'left';
  }
  function drawHelp(world) {
    drawWorldScene(world);
    ctx.fillStyle = 'rgba(10,12,24,0.82)';
    ctx.fillRect(0, 0, painter.w, painter.h);
    const lines = [
      ['HOW TO PLAY', ''],
      ['Move / drive', 'WASD or arrow keys — Shift to sprint on foot'],
      ['Enter / exit a car', 'E near a car, bike or speedboat'],
      ['Talk & shop', 'E near a person or a shop door'],
      ['Punch', 'F — knocks people down (the cops notice)'],
      ['Shoot', 'Aim with the mouse, click to fire (needs a pistol from Solmar Arms)'],
      ['Phone', 'Q — call Mara, Lena, Dante or Cab Dispatch for jobs'],
      ['Radio', 'R — cycle Bay Wave 98.2, Solmar Salsa 101, Harbor Rock 94'],
      ['Pause / mute', 'P pauses · M mutes'],
      ['Goal', 'Finish all ten jobs — the Casino Caper, then the Harbor Escape by boat'],
      ['', 'Press Enter to go back'],
    ];
    ctx.textAlign = 'center';
    lines.forEach((l, i) => {
      const y = painter.h * 0.16 + i * 34;
      ctx.fillStyle = i === 0 ? '#e8d98a' : '#fff';
      ctx.font = (i === 0 ? 'bold 26px ' : '16px ') + FONT;
      ctx.fillText(l[0] + (l[1] ? ' — ' + l[1] : ''), painter.w / 2, y);
    });
    ctx.textAlign = 'left';
  }
  function drawPaused(world) {
    drawWorldScene(world);
    ctx.fillStyle = 'rgba(10,12,24,0.6)';
    ctx.fillRect(0, 0, painter.w, painter.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px ' + FONT;
    ctx.fillText('PAUSED', painter.w / 2, painter.h / 2 - 10);
    ctx.font = '18px ' + FONT;
    ctx.fillText('Progress saved — press P or Enter to keep playing', painter.w / 2, painter.h / 2 + 30);
    ctx.textAlign = 'left';
  }
  function drawBanner(world) {
    const s = world.state;
    if (s.banner) {
      ctx.fillStyle = 'rgba(10,12,24,0.75)';
      ctx.fillRect(0, 0, painter.w, painter.h);
      ctx.textAlign = 'center';
      ctx.fillStyle = s.banner === 'BUSTED' ? '#2f6fb8' : '#e83a3a';
      ctx.font = 'bold 72px ' + FONT;
      ctx.fillText(s.banner, painter.w / 2, painter.h / 2);
      ctx.fillStyle = '#fff';
      ctx.font = '18px ' + FONT;
      ctx.fillText(s.banner === 'BUSTED' ? 'The Solmar PD took you in.' : 'You went down in Solmar Bay.', painter.w / 2, painter.h / 2 + 40);
      ctx.textAlign = 'left';
    }
  }
  painter.draw = (world, screen, ui) => {
    resize();
    if (screen === VIEW_TITLE) drawTitle(world, ui);
    else if (screen === VIEW_HELP) drawHelp(world);
    else if (screen === VIEW_PAUSED) drawPaused(world);
    else drawWorldScene(world);
    drawBanner(world);
  };
  return painter;
}
