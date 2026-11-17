// The city of Solmar Bay v2: four districts with distinct looks, a marina
// with piers and moored boats, a casino, a stadium, a diner, a clothes shop
// and a paint shop beside the v1 landmarks. Seeded, so one seed rebuilds
// the same city. Roads run along ROAD_LINES; blocks sit between them.
import { BEACH_Y, BLOCK, CAR_TYPES, PALETTE, ROAD_LINES, ROAD_W, STORY, WATER_Y, WORLD } from './config.js';

const ROOF_OLD = ['#b85a3a', '#c98a4a', '#9a7a5a', '#8a6f6a'];
const ROOF_DOWNTOWN = ['#7a9bb5', '#5a7a9a', '#8a9ab5', '#6f8a7a'];
const ROOF_NORTH = ['#d8d0c0', '#b5c8d8', '#c8b8a8', '#a8b8c8'];
const ROOF_MARINA = ['#e8a04c', '#4a9ab5', '#d96f7a', '#e8d6a4'];
const PARK_NAMES = ['Palm Plaza', 'Sunset Park', 'Coral Gardens', 'Northgate Green'];

function blockRect(col, row) {
  const x0 = ROAD_LINES[col] + ROAD_W / 2 + 14;
  const y0 = ROAD_LINES[row] + ROAD_W / 2 + 14;
  const size = BLOCK - ROAD_W - 28;
  return { x: x0, y: y0, w: size, h: size };
}
function districtOf(x, y) {
  if (x >= 2600 && y < 1400) return 'northgate';
  if (y >= 3000) return 'marina';
  if (x >= 1400 && x < 2600 && y >= 800 && y < 3000) return 'downtown';
  return 'oldtown';
}
function roofsFor(d) {
  return d === 'northgate' ? ROOF_NORTH : d === 'downtown' ? ROOF_DOWNTOWN : d === 'marina' ? ROOF_MARINA : ROOF_OLD;
}
function addBuildings(rng, city, rect, count) {
  const d = districtOf(rect.x + rect.w / 2, rect.y + rect.h / 2);
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
        x: rect.x + c * cw + inset, y: rect.y + r * ch + inset, w, h,
        color: rng.pick(roofsFor(d)), height: d === 'northgate' ? rng.int(3, 5) : d === 'downtown' ? rng.int(2, 4) : rng.int(1, 3),
        windows: rng.int(4, 16), landmark: null, district: d,
      });
    }
  }
}
function addPark(rng, city, rect, name) {
  city.parks.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, name });
  const trees = rng.int(5, 9);
  for (let i = 0; i < trees; i += 1) city.trees.push({ x: rect.x + rng.range(20, rect.w - 20), y: rect.y + rng.range(20, rect.h - 20), r: rng.range(9, 15) });
}
function addLandmark(city, rect, kind, label) {
  const colors = { bank: '#c9b06a', hospital: '#e8e8e8', casino: '#d94e8a', stadium: '#4a7a5a', clothes: '#7a5ad9', paint: '#e8b73a', diner: '#e8a04c' };
  const b = {
    x: rect.x + rect.w * 0.12, y: rect.y + rect.h * 0.12, w: rect.w * 0.76, h: rect.h * 0.76,
    color: colors[kind] ?? '#7a9bb5', height: kind === 'stadium' ? 1 : 3, windows: 10, landmark: kind, district: districtOf(rect.x, rect.y),
  };
  city.buildings.push(b);
  city.landmarks[kind] = { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, label };
}

export function generateCity(rng) {
  const city = { buildings: [], parks: [], trees: [], lamps: [], landmarks: {}, parked: [], boats: [], piers: [] };
  const landmarkAt = {
    '1,1': 'garage', '5,1': 'police', '6,2': 'hospital', '4,4': 'bank',
    '7,5': 'gunshop', '2,6': 'motel', '3,7': 'safehouse',
    '7,1': 'casino', '8,3': 'stadium', '1,4': 'clothes', '6,6': 'paint', '2,3': 'diner',
    '5,7': 'safehouse2',
  };
  const landmarkLabel = {
    garage: STORY.garage, police: 'Solmar PD HQ', hospital: STORY.hospital,
    bank: STORY.bank, gunshop: STORY.shop, motel: STORY.motel, safehouse: STORY.safehouse,
    casino: STORY.casino, stadium: STORY.stadium, clothes: STORY.clothes,
    paint: STORY.paint, diner: STORY.diner, safehouse2: 'Marina Loft',
  };
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const rect = blockRect(col, row);
      if (rect.y + rect.h > BEACH_Y - 8) continue;
      const key = `${col},${row}`;
      if (landmarkAt[key]) { addLandmark(city, rect, landmarkAt[key], landmarkLabel[landmarkAt[key]]); continue; }
      const roll = rng.next();
      if (roll < 0.14) addPark(rng, city, rect, rng.pick(PARK_NAMES));
      else if (roll < 0.26) {
        city.parks.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, name: '', lot: true });
        const n = rng.int(3, 6);
        for (let i = 0; i < n; i += 1) city.parked.push({ x: rect.x + 30 + (i % 3) * 90, y: rect.y + 40 + Math.floor(i / 3) * 110, angle: Math.PI / 2, type: rng.pick(['sedan', 'van', 'taxi', 'pickup', 'limo']), color: rng.pick(Object.values(CAR_TYPES)).color });
      } else addBuildings(rng, city, rect, rng.int(2, 4));
    }
  }
  city.docks = { x: 3440, y: 1400, w: 160, h: 600, label: 'Solmar Docks' };
  // Marina: three wooden piers jutting into the sea, boats moored alongside.
  for (let i = 0; i < 3; i += 1) {
    const px = 900 + i * 900;
    city.piers.push({ x: px, y: WATER_Y - 30, w: 90, h: 170, label: i === 0 ? 'Pier A' : i === 1 ? 'Pier B' : 'Pier C' });
    city.boats.push({ x: px + 130, y: WATER_Y + 70, angle: Math.PI / 2, color: ['#e8e8e8', '#2f6fb8', '#d94e8a'][i] });
    city.boats.push({ x: px - 40, y: WATER_Y + 110, angle: Math.PI / 2, color: '#e8b73a' });
  }
  // Bikes parked outside the diner, the marina and the stadium.
  city.bikes = [
    { x: 1050, y: 1250, angle: 0 }, { x: 1800, y: 3450, angle: Math.PI / 2 },
    { x: 3250, y: 1250, angle: -Math.PI / 2 }, { x: 650, y: 2450, angle: 0 },
  ];
  for (let x = 120; x < WORLD; x += 160) city.trees.push({ x, y: BEACH_Y + 46, r: 12, palm: true });
  // Beach umbrellas along the sand.
  city.umbrellas = [];
  for (let x = 300; x < WORLD; x += 420) city.umbrellas.push({ x, y: BEACH_Y + 90, color: rng.pick(['#d94e8a', '#2f6fb8', '#e8b73a', '#4ad9a0']) });
  for (const line of ROAD_LINES) {
    for (let t = 120; t < WORLD; t += 400) {
      city.lamps.push({ x: line + ROAD_W / 2 + 8, y: t });
      city.lamps.push({ x: t, y: line + ROAD_W / 2 + 8 });
    }
  }
  return city;
}
export function resolveCircleBuildings(city, x, y, radius) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx; const dy = y - cy; const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    if (d2 === 0) { x = b.x - radius; continue; }
    const d = Math.sqrt(d2);
    x = cx + (dx / d) * radius; y = cy + (dy / d) * radius;
  }
  return { x, y };
}
export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  return null;
}
export function onRoad(x, y) {
  if (y >= BEACH_Y) return false;
  for (const line of ROAD_LINES) if (Math.abs(x - line) <= ROAD_W / 2 || Math.abs(y - line) <= ROAD_W / 2) return true;
  return false;
}
export function inWater(x, y) { return y >= WATER_Y; }
export function clampToWorld(x, y) { return { x: Math.max(40, Math.min(WORLD - 40, x)), y: Math.max(40, Math.min(WORLD - 40, y)) }; }
export function nearestRoadPoint(x, y) {
  let best = null; let bestD = Infinity;
  for (const lx of ROAD_LINES) for (const ly of ROAD_LINES) {
    const d = (x - lx) * (x - lx) + (y - ly) * (y - ly);
    if (d < bestD) { bestD = d; best = { x: lx, y: ly }; }
  }
  return best;
}
export { BEACH_Y, PALETTE, WATER_Y };
