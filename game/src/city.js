// The city of Solmar Bay: a 9x9 grid of avenues and streets around square blocks.
// Each block becomes buildings, a park, a parking lot or one of the story's
// landmarks. Generation is seeded, so the same seed rebuilds the same city.
// Roads run along the ROAD_LINES; blocks sit between them.
import { BEACH_Y, BLOCK, CAR_TYPES, PALETTE, ROAD_LINES, ROAD_W, STORY, WATER_Y, WORLD } from './config.js';

const ROOF_COLORS = ['#d96f4e', '#e8a04c', '#7a9bb5', '#b5a48a', '#8a6f8a', '#6f9c7a', '#c96f7a', '#9a8a6f'];
const PARK_NAMES = ['Palm Plaza', 'Sunset Park', 'Coral Gardens'];

function blockRect(col, row) {
  const x0 = ROAD_LINES[col] + ROAD_W / 2 + 14;
  const y0 = ROAD_LINES[row] + ROAD_W / 2 + 14;
  const size = BLOCK - ROAD_W - 28;
  return { x: x0, y: y0, w: size, h: size };
}

function addBuildings(rng, city, rect, count) {
  // Split a block into a small grid of buildings with gaps between them.
  const cols = count === 1 ? 1 : 2;
  const rows = count <= 2 ? 1 : 2;
  const cw = rect.w / cols;
  const ch = rect.h / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (r * cols + c >= count) break;
      const inset = 10 + rng.range(0, 14);
      const w = cw - inset * 2 - rng.range(0, 26);
      const h = ch - inset * 2 - rng.range(0, 26);
      if (w < 40 || h < 40) continue;
      city.buildings.push({
        x: rect.x + c * cw + inset,
        y: rect.y + r * ch + inset,
        w, h,
        color: rng.pick(ROOF_COLORS),
        height: rng.int(1, 3),
        windows: rng.int(4, 14),
        landmark: null,
      });
    }
  }
}

function addPark(rng, city, rect, name) {
  city.parks.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, name });
  const trees = rng.int(5, 9);
  for (let i = 0; i < trees; i += 1) {
    city.trees.push({ x: rect.x + rng.range(20, rect.w - 20), y: rect.y + rng.range(20, rect.h - 20), r: rng.range(9, 15) });
  }
}

function addLandmark(city, rect, kind, label) {
  const b = {
    x: rect.x + rect.w * 0.12, y: rect.y + rect.h * 0.12,
    w: rect.w * 0.76, h: rect.h * 0.76,
    color: kind === 'bank' ? '#c9b06a' : kind === 'hospital' ? '#e8e8e8' : '#7a9bb5',
    height: kind === 'bank' ? 2 : 3, windows: 10, landmark: kind,
  };
  city.buildings.push(b);
  city.landmarks[kind] = { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, label };
}

export function generateCity(rng) {
  const city = { buildings: [], parks: [], trees: [], lamps: [], landmarks: {}, parked: [] };
  // Landmark blocks, by (col, row): garage (1,1), police HQ (5,1), hospital (6,2),
  // bank (4,4), gun shop (7,5), motel (2,6), safehouse (3,7).
  const landmarkAt = {
    '1,1': 'garage', '5,1': 'police', '6,2': 'hospital', '4,4': 'bank',
    '7,5': 'gunshop', '2,6': 'motel', '3,7': 'safehouse',
  };
  const landmarkLabel = {
    garage: STORY.garage, police: 'Solmar PD HQ', hospital: STORY.hospital,
    bank: STORY.bank, gunshop: STORY.shop, motel: STORY.motel, safehouse: STORY.safehouse,
  };
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const rect = blockRect(col, row);
      if (rect.y + rect.h > BEACH_Y - 8) continue; // the beach strip has no blocks
      const key = `${col},${row}`;
      if (landmarkAt[key]) {
        addLandmark(city, rect, landmarkAt[key], landmarkLabel[landmarkAt[key]]);
        continue;
      }
      const roll = rng.next();
      if (roll < 0.14) {
        addPark(rng, city, rect, rng.pick(PARK_NAMES));
      } else if (roll < 0.26) {
        // Parking lot: flat asphalt with a few parked cars.
        city.parks.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, name: '', lot: true });
        const n = rng.int(3, 6);
        for (let i = 0; i < n; i += 1) {
          city.parked.push({
            x: rect.x + 30 + (i % 3) * 90, y: rect.y + 40 + Math.floor(i / 3) * 110,
            angle: Math.PI / 2, type: rng.pick(['sedan', 'van', 'taxi']), color: rng.pick(Object.values(CAR_TYPES)).color,
          });
        }
      } else {
        addBuildings(rng, city, rect, rng.int(2, 4));
      }
    }
  }
  // Docks along the east edge: containers and cranes, no buildings.
  city.docks = { x: 3440, y: 1400, w: 160, h: 600, label: 'Solmar Docks' };
  // Palm trees along the beach and lamps along every avenue.
  for (let x = 120; x < WORLD; x += 160) {
    city.trees.push({ x, y: BEACH_Y + 46, r: 12, palm: true });
  }
  for (const line of ROAD_LINES) {
    for (let t = 120; t < WORLD; t += 400) {
      city.lamps.push({ x: line + ROAD_W / 2 + 8, y: t });
      city.lamps.push({ x: t, y: line + ROAD_W / 2 + 8 });
    }
  }
  return city;
}

// Push a circle out of every building it overlaps. Returns the corrected point.
export function resolveCircleBuildings(city, x, y, radius) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    if (d2 === 0) { x = b.x - radius; continue; }
    const d = Math.sqrt(d2);
    x = cx + (dx / d) * radius;
    y = cy + (dy / d) * radius;
  }
  return { x, y };
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

export function onRoad(x, y) {
  if (y >= BEACH_Y) return false;
  for (const line of ROAD_LINES) {
    if (Math.abs(x - line) <= ROAD_W / 2 || Math.abs(y - line) <= ROAD_W / 2) return true;
  }
  return false;
}

export function clampToWorld(x, y) {
  return {
    x: Math.max(40, Math.min(WORLD - 40, x)),
    y: Math.max(40, Math.min(WORLD - 40, y)),
  };
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const lx of ROAD_LINES) {
    for (const ly of ROAD_LINES) {
      const d = (x - lx) * (x - lx) + (y - ly) * (y - ly);
      if (d < bestD) { bestD = d; best = { x: lx, y: ly }; }
    }
  }
  return best;
}

export { BEACH_Y, PALETTE, WATER_Y };
