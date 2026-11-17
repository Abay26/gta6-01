// Drawing only: the world state and the current screen in, pixels out. The
// camera follows the player; the canvas shows about 1280x720 world units.
// Top-down, golden hour: long shadows, warm roads, teal sea, and a sun glare
// so the city reads as a sun-soaked coast town at a glance.
import { BEACH_Y, BLOCK, PALETTE, ROAD_LINES, ROAD_W, STORY, WATER_Y, WORLD } from './config.js';
import { missionMarker } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_HELP = 'help';

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

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { zoom: 1, cx: 0, cy: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.zoom = Math.min(canvas.width / 1280, canvas.height / 720);
    view.cx = canvas.width / 2;
    view.cy = canvas.height / 2;
  }

  function text(value, x, y, size, color, align = 'left', weight = '') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function worldToScreen(x, y) {
    const cam = currentCamera;
    return {
      x: (x - cam.x) * view.zoom + view.cx,
      y: (y - cam.y) * view.zoom + view.cy,
    };
  }

  let currentCamera = { x: 1800, y: 1800 };

  function visibleRect() {
    const w = canvas.width / view.zoom;
    const h = canvas.height / view.zoom;
    return {
      x: currentCamera.x - w / 2 - 60, y: currentCamera.y - h / 2 - 60,
      w: w + 120, h: h + 120,
    };
  }

  function drawGround(city) {
    const v = visibleRect();
    // Base: dusty ground, then the beach and the sea along the south edge.
    ctx.fillStyle = '#b8a888';
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(v.x, Math.max(v.y, BEACH_Y), v.w, Math.max(0, v.y + v.h - BEACH_Y));
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(v.x, Math.max(v.y, WATER_Y), v.w, Math.max(0, v.y + v.h - WATER_Y));
    ctx.fillStyle = PALETTE.waterDeep;
    for (let x = Math.floor(v.x / 90) * 90; x < v.x + v.w; x += 90) {
      ctx.fillRect(x, WATER_Y + 40 + ((x / 90) % 3) * 14, 46, 3);
    }
    // Parks: green blocks with a darker edge.
    for (const park of city.parks) {
      if (park.x > v.x + v.w || park.x + park.w < v.x || park.y > v.y + v.h || park.y + park.h < v.y) continue;
      ctx.fillStyle = park.lot ? '#565b66' : PALETTE.grass;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      if (!park.lot) {
        ctx.strokeStyle = PALETTE.grassDark;
        ctx.lineWidth = 4;
        ctx.strokeRect(park.x + 2, park.y + 2, park.w - 4, park.h - 4);
        if (park.name) text(park.name, park.x + park.w / 2, park.y + park.h / 2, 15, '#4a7a35', 'center');
      } else {
        ctx.strokeStyle = '#e8d98a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i += 1) {
          ctx.strokeRect(park.x + 18 + i * 90, park.y + 24, 64, 100);
        }
      }
    }
    // Roads: asphalt bands with a sidewalk border, then dashed centre lines.
    ctx.fillStyle = PALETTE.asphalt;
    for (const line of ROAD_LINES) {
      ctx.fillRect(line - ROAD_W / 2, v.y, ROAD_W, v.h);
      ctx.fillRect(v.x, line - ROAD_W / 2, v.w, ROAD_W);
    }
    ctx.fillStyle = PALETTE.sidewalk;
    for (const line of ROAD_LINES) {
      ctx.fillRect(line - ROAD_W / 2 - 10, v.y, 10, v.h);
      ctx.fillRect(line + ROAD_W / 2, v.y, 10, v.h);
      ctx.fillRect(v.x, line - ROAD_W / 2 - 10, v.w, 10);
      ctx.fillRect(v.x, line + ROAD_W / 2, v.w, 10);
    }
    ctx.fillStyle = PALETTE.asphalt;
    for (const line of ROAD_LINES) {
      ctx.fillRect(line - ROAD_W / 2, v.y, ROAD_W, v.h);
      ctx.fillRect(v.x, line - ROAD_W / 2, v.w, ROAD_W);
    }
    ctx.fillStyle = PALETTE.lane;
    for (const line of ROAD_LINES) {
      for (let t = Math.floor(v.y / 48) * 48; t < v.y + v.h; t += 48) {
        ctx.fillRect(line - 2, t, 4, 22);
      }
      for (let t = Math.floor(v.x / 48) * 48; t < v.x + v.w; t += 48) {
        ctx.fillRect(t, line - 2, 22, 4);
      }
    }
  }

  function drawBuildings(city) {
    const v = visibleRect();
    for (const b of city.buildings) {
      if (b.x > v.x + v.w || b.x + b.w < v.x || b.y > v.y + v.h || b.y + b.h < v.y) continue;
      // Long afternoon shadow to the north-east.
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + 10, b.y + 10, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
      // Roof details: skylights and AC boxes.
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      const cols = Math.max(1, Math.floor(b.w / 46));
      const rows = Math.max(1, Math.floor(b.h / 46));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          if ((i * 7 + j * 3 + b.windows) % 4 === 0) {
            ctx.fillRect(b.x + 10 + i * 46, b.y + 10 + j * 46, 18, 12);
          }
        }
      }
      if (b.landmark) {
        // Dark outline so the label reads on any roof colour.
        ctx.font = 'bold 15px ' + FONT;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 4;
        ctx.strokeText(city.landmarks[b.landmark].label, b.x + b.w / 2, b.y + b.h / 2 - 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(city.landmarks[b.landmark].label, b.x + b.w / 2, b.y + b.h / 2 - 4);
      }
    }
    // Docks: containers in rows.
    const d = city.docks;
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    const containerColors = ['#b8452f', '#2f6fb8', '#e8b73a', '#5a7a4a'];
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = containerColors[i % 4];
      ctx.fillRect(d.x + 10 + (i % 2) * 70, d.y + 14 + Math.floor(i / 2) * 140, 60, 120);
    }
    text(d.label, d.x + d.w / 2, d.y + d.h + 22, 15, '#5a4632', 'center', 'bold ');
  }

  function drawTrees(city) {
    const v = visibleRect();
    for (const t of city.trees) {
      if (t.x < v.x || t.x > v.x + v.w || t.y < v.y || t.y > v.y + v.h) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(t.x + 5, t.y + 6, t.r, t.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.palm ? '#5a9c4a' : '#4a8a3a';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6fbf5a';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCar(car, time, isPlayer) {
    const spec = car.spec;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, -spec.length / 2 + 4, -spec.width / 2 + 5, spec.length, spec.width, 8);
    ctx.fill();
    if (isPlayer) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, spec.length / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = car.color;
    roundRect(ctx, -spec.length / 2, -spec.width / 2, spec.length, spec.width, 7);
    ctx.fill();
    // Windshield and rear window.
    ctx.fillStyle = '#1e2a33';
    roundRect(ctx, spec.length / 2 - 16, -spec.width / 2 + 3, 10, spec.width - 6, 3);
    ctx.fill();
    roundRect(ctx, -spec.length / 2 + 5, -spec.width / 2 + 3, 8, spec.width - 6, 3);
    ctx.fill();
    // Roof.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, -6, -spec.width / 2 + 4, 16, spec.width - 8, 4);
    ctx.fill();
    if (car.type === 'taxi') {
      ctx.fillStyle = '#20242e';
      for (let i = 0; i < 5; i += 1) ctx.fillRect(-spec.length / 2 + 4 + i * 9, -spec.width / 2 + 1, 5, 5);
      text('TAXI', 0, -spec.width / 2 - 4, 9, '#20242e', 'center', 'bold ');
    }
    if (car.type === 'police') {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-8, -spec.width / 2, 16, spec.width);
      const flash = Math.floor(time * 4) % 2 === 0;
      ctx.fillStyle = flash ? '#e83a3a' : '#3a6fe8';
      ctx.fillRect(-4, -spec.width / 2 - 2, 8, 6);
      ctx.fillStyle = flash ? '#3a6fe8' : '#e83a3a';
      ctx.fillRect(-4, spec.width / 2 - 4, 8, 6);
    }
    // Headlights and brake lights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(spec.length / 2 - 2, -spec.width / 2 + 2, 3, 5);
    ctx.fillRect(spec.length / 2 - 2, spec.width / 2 - 7, 3, 5);
    ctx.fillStyle = car.brakeLight ? '#ff2a2a' : '#a82a2a';
    ctx.fillRect(-spec.length / 2 - 1, -spec.width / 2 + 2, 3, 5);
    ctx.fillRect(-spec.length / 2 - 1, spec.width / 2 - 7, 3, 5);
    // Damage smoke.
    if (car.health < car.maxHealth * 0.5) {
      ctx.fillStyle = 'rgba(80,80,80,0.5)';
      ctx.beginPath();
      ctx.arc(-spec.length / 2 + 4, 0, 6 + Math.sin(time * 9 + car.id) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPed(ped, time) {
    const bob = Math.sin(ped.walkPhase) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ped.x + 3, ped.y + 4, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y + bob * 0.4, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3 + bob * 0.4, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer(world, time) {
    const s = world.state;
    const p = s.player;
    if (!p.onFoot) return;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x + 3, p.y + 5, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs swing with the walk cycle.
    const swing = Math.sin(p.walkPhase) * 4;
    ctx.strokeStyle = '#20242e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - Math.cos(p.angle) * 6 + swing, p.y - Math.sin(p.angle) * 6);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - Math.cos(p.angle) * 6 - swing, p.y - Math.sin(p.angle) * 6);
    ctx.stroke();
    ctx.fillStyle = '#e83a3a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6, 0, Math.PI * 2);
    ctx.fill();
    if (p.hasPistol) {
      ctx.strokeStyle = '#20242e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 8, p.y + Math.sin(p.angle) * 8);
      ctx.lineTo(p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18);
      ctx.stroke();
    }
    if (p.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(232,58,58,0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMarkers(world, time) {
    const s = world.state;
    const marker = missionMarker(world);
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    if (marker) {
      ctx.save();
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 34 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,58,0.18)';
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 34 * pulse, 0, Math.PI * 2);
      ctx.fill();
      // A light pillar so the marker is visible from across the city.
      const grad = ctx.createLinearGradient(marker.x, marker.y - 260, marker.x, marker.y);
      grad.addColorStop(0, 'rgba(255,210,58,0)');
      grad.addColorStop(1, 'rgba(255,210,58,0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(marker.x - 12, marker.y - 260, 24, 260);
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(marker.x, marker.y - 46);
      ctx.lineTo(marker.x - 10, marker.y - 26);
      ctx.lineTo(marker.x + 10, marker.y - 26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (s.taxi && s.taxi.stage === 'dropoff') {
      ctx.save();
      ctx.strokeStyle = '#7ad94e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.taxi.dest.x, s.taxi.dest.y, 30 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (s.taxi && s.taxi.stage === 'pickup') {
      ctx.save();
      ctx.fillStyle = '#7ad94e';
      ctx.beginPath();
      ctx.arc(s.taxi.x, s.taxi.y, 10 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20242e';
      text('$', s.taxi.x, s.taxi.y + 4, 12, '#20242e', 'center', 'bold ');
      ctx.restore();
    }
  }

  function drawPickups(world, time) {
    for (const pickup of world.state.pickups) {
      if (pickup.respawn > 0) continue;
      ctx.save();
      ctx.fillStyle = '#7ad94e';
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 12 + Math.sin(time * 3 + pickup.x) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a7a2a';
      ctx.lineWidth = 2;
      ctx.stroke();
      text('$', pickup.x, pickup.y + 5, 14, '#1e4a12', 'center', 'bold ');
      ctx.restore();
    }
  }

  function drawParticles(world) {
    for (const p of world.particles) {
      if (p.kind === 'spark') {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'skid') {
        ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.5;
        ctx.fillStyle = '#20242e';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-8, -3, 16, 6);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (p.kind === 'tracer') {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.strokeStyle = '#ffe9a8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.kind === 'flash') {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawWorld(world, time) {
    const s = world.state;
    currentCamera = {
      x: s.camera.x + (s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0),
      y: s.camera.y + (s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0),
    };
    ctx.setTransform(view.zoom, 0, 0, view.zoom, view.cx - currentCamera.x * view.zoom, view.cy - currentCamera.y * view.zoom);
    drawGround(world.city);
    drawBuildings(world.city);
    drawTrees(world.city);
    drawPickups(world, time);
    drawMarkers(world, time);
    // Parked cars, then traffic, then the player's car, then people.
    for (const car of s.cars) {
      if (car.driver === 'parked' && !car.dead) drawCar(car, time, false);
    }
    for (const car of s.cars) {
      if (car.driver === 'traffic' && !car.dead) drawCar(car, time, false);
    }
    for (const cop of s.cops) {
      if (cop.kind === 'car' && !cop.gone) drawCar(cop.car, time, false);
    }
    if (s.playerCar && !s.playerCar.dead) drawCar(s.playerCar, time, true);
    for (const ped of s.peds) if (!ped.dead) drawPed(ped, time);
    for (const npc of s.npcs) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(npc.x + 3, npc.y + 5, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = npc.color;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath();
      ctx.arc(npc.x, npc.y - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      text(npc.name, npc.x, npc.y - 18, 12, '#ffffff', 'center', 'bold ');
    }
    for (const cop of s.cops) {
      if (cop.kind !== 'foot' || cop.gone) continue;
      ctx.fillStyle = '#20242e';
      ctx.beginPath();
      ctx.arc(cop.x, cop.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a6fe8';
      ctx.beginPath();
      ctx.arc(cop.x, cop.y - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      text('PD', cop.x, cop.y - 16, 10, '#ffffff', 'center', 'bold ');
    }
    drawPlayer(world, time);
    drawParticles(world);
    // Warm sun glare from the top-left and a soft vignette.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const glare = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(canvas.width, canvas.height) * 0.7);
    glare.addColorStop(0, 'rgba(255,214,140,0.20)');
    glare.addColorStop(0.5, 'rgba(255,214,140,0.05)');
    glare.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vig = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.42, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawTitle(world, ui) {
    drawWorld(world, world.time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(10,12,20,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    text(STORY.city.toUpperCase().split(' ')[0], cx, canvas.height * 0.2, 64, '#ffd23a', 'center', 'bold ');
    text('B A Y', cx, canvas.height * 0.2 + 44, 22, '#ffffff', 'center', 'bold ');
    text('An open-world crime story — five years back, one city to take.', cx, canvas.height * 0.2 + 84, 18, '#e8e8e8', 'center');
    const items = ui.saveExists
      ? ['Continue', 'New Game', 'How to Play']
      : ['New Game', 'How to Play'];
    const top = canvas.height * 0.42;
    for (let i = 0; i < items.length; i += 1) {
      const y = top + i * 52;
      const selected = i === ui.selected;
      if (selected) {
        ctx.fillStyle = '#ffd23a';
        roundRect(ctx, cx - 190, y - 30, 380, 42, 8);
        ctx.fill();
        text(items[i], cx, y, 22, '#20242e', 'center', 'bold ');
      } else {
        text(items[i], cx, y, 22, '#ffffff', 'center');
      }
    }
    text('WASD move · Shift sprint · E enter car · Space punch · Mouse aim, click shoot', cx, canvas.height - 64, 15, '#cfcfcf', 'center');
    text('F talk / use shop · H horn · P pause · M mute · progress saves automatically', cx, canvas.height - 38, 15, '#cfcfcf', 'center');
  }

  function drawHelp(ui) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#14161f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    text('HOW TO PLAY', cx, 110, 40, '#ffd23a', 'center', 'bold ');
    const lines = [
      'You are Rico Vega, back in Solmar Bay after five years away.',
      'Mara Solis runs the garage and has work for a driver who asks no questions.',
      '',
      'WASD / arrows — walk and drive · Shift — sprint · E — get in / out of a car',
      'Space — punch · Mouse — aim · Click — shoot (buy a pistol at Solmar Arms)',
      'F — talk to people, buy, repair at the garage · H — horn · P — pause',
      '',
      'Steal cars, take taxi fares, grab the green cash on the streets.',
      'Crimes the police see raise your wanted stars — hide until the heat cools.',
      'Follow the yellow marker: six jobs, then the big score at Bay Trust Bank.',
      'Your cash, jobs and pistol save automatically when you finish a job.',
    ];
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], cx, 170 + i * 30, 17, '#e8e8e8', 'center');
    }
    text('Press Enter or click to go back', cx, canvas.height - 60, 18, '#ffd23a', 'center');
    void ui;
  }

  function drawPaused() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(10,12,20,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    ctx.fillStyle = '#14161f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (screen === SCREEN_HELP) { drawHelp(ui); return; }
    if (screen === SCREEN_TITLE) { drawTitle(world, ui); return; }
    drawWorld(world, world.time);
    if (screen === SCREEN_PAUSED) drawPaused();
    drawOverlay(world);
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    worldPoint(sx, sy) {
      // Screen pixels (CSS pixels, canvas is devicePixelRatio-scaled) to world.
      const ratio = window.devicePixelRatio || 1;
      const px = sx * ratio;
      const py = sy * ratio;
      return {
        x: (px - view.cx) / view.zoom + currentCamera.x,
        y: (py - view.cy) / view.zoom + currentCamera.y,
      };
    },
    get canvas() { return canvas; },
  };
}
