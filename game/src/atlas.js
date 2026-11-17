// The atlas: Solmar Bay's map, built from a seed. Roads form a grid; every
// block between them holds buildings, a park, or a named landmark. The south
// edge is a beach and the sea, with piers and moored speedboats.
import { ROADS, ROAD_W, SEA_Y, SHORE_Y, WORLD_SIZE, VEHICLES } from './tuning.js';

const ROOF_OLD = ['#b85a3a', '#c98a4a', '#9a7a5a', '#8a6f6a'];
const ROOF_CENTRE = ['#7a9bb5', '#5a7a9a', '#8a9ab5', '#6f8a7a'];
const ROOF_NORTH = ['#d8d0c0', '#b5c8d8', '#c8b8a8', '#a8b8c8'];
const ROOF_MARINA = ['#e8a04c', '#4a9ab5', '#d96f7a', '#e8d6a4'];
const GREEN_NAMES = ['Palm Plaza', 'Sunset Park', 'Coral Gardens', 'Northgate Green'];

function blockRect(col, row) {
  return {
    x: ROADS[col] + ROAD_W / 2 + 14,
    y: ROADS[row] + ROAD_W / 2 + 14,
    w: ROADS[col + 1] - ROADS[col] - ROAD_W - 28,
    h: ROADS[row + 1] - ROADS[row] - ROAD_W - 28,
  };
}
function areaOf(x, y) {
  if (x < 1400) return 'oldtown';
  if (y < 1400 && x >= 2600) return 'northgate';
  if (y >= 3000 && x >= 1400) return 'marina';
  return 'downtown';
}
function roofsFor(area) {
  if (area === 'oldtown') return ROOF_OLD;
  if (area === 'northgate') return ROOF_NORTH;
  if (area === 'marina') return ROOF_MARINA;
  return ROOF_CENTRE;
}
function fillBlock(rng, atlas, rect, count) {
  for (let i = 0; i < count; i += 1) {
    const bw = rng.range(90, 170);
    const bh = rng.range(80, 150);
    const bx = rect.x + rng.range(0, Math.max(1, rect.w - bw));
    const by = rect.y + rng.range(0, Math.max(1, rect.h - bh));
    const area = areaOf(bx + bw / 2, by + bh / 2);
    atlas.buildings.push({
      x: bx, y: by, w: bw, h: bh,
      roof: rng.pick(roofsFor(area)),
      tall: area === 'downtown' || area === 'northgate',
      shade: rng.range(0.85, 1.1),
    });
  }
}
function fillGreen(rng, atlas, rect, name) {
  atlas.greens.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, name });
  for (let i = 0; i < 5; i += 1) {
    atlas.trees.push({ x: rect.x + rng.range(20, rect.w - 20), y: rect.y + rng.range(20, rect.h - 20), r: rng.range(9, 15) });
  }
}
function markLandmark(atlas, rect, kind, label) {
  const b = { x: rect.x + 30, y: rect.y + 24, w: Math.min(220, rect.w - 60), h: Math.min(130, rect.h - 48), label };
  atlas.buildings.push({ x: b.x, y: b.y, w: b.w, h: b.h, roof: '#c98a4a', tall: kind === 'bank' || kind === 'casino', shade: 1, landmark: kind, label });
  atlas.spots[kind] = { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, label };
}

export function buildAtlas(rng) {
  const atlas = { buildings: [], greens: [], trees: [], lamps: [], spots: {}, parkedSpots: [], bikeSpots: [], boatSpots: [], piers: [] };
  // Landmark blocks: (col, row) on the road grid.
  const marks = {
    '0,3': ['garage', 'Solis Auto'], '0,1': ['motel', 'Palm Court Motel'],
    '1,4': ['diner', 'Sunset Diner'], '3,3': ['bank', 'Bay Trust Bank'],
    '5,7': ['casino', 'Coral Crown Casino'], '6,3': ['arena', 'Bay Arena'],
    '2,6': ['paint', 'Luna Paint & Body'], '4,5': ['tailor', 'Tide & Thread'],
    '4,2': ['arms', 'Solmar Arms'], '1,6': ['flat', 'Vega Apartment'],
    '6,7': ['loft', 'Marina Loft'], '2,2': ['hospital', 'Solmar General'],
  };
  for (let col = 0; col < ROADS.length - 1; col += 1) {
    for (let row = 0; row < ROADS.length - 1; row += 1) {
      const rect = blockRect(col, row);
      if (rect.y + rect.h > SHORE_Y) continue; // beach strip, no blocks
      const key = `${col},${row}`;
      if (marks[key]) { markLandmark(atlas, rect, marks[key][0], marks[key][1]); continue; }
      if (rng.chance(0.16)) { fillGreen(rng, atlas, rect, rng.pick(GREEN_NAMES)); continue; }
      const before = atlas.buildings.length;
      fillBlock(rng, atlas, rect, rng.int(1, 3));
      if (rng.chance(0.5)) {
        for (let i = 0; i < rng.int(1, 3); i += 1) {
          const spot = {
            x: rect.x + 30 + (i % 3) * 90, y: rect.y + 40 + Math.floor(i / 3) * 110,
            angle: Math.PI / 2, type: rng.pick(['sedan', 'van', 'taxi', 'pickup', 'limo']),
            color: rng.pick(Object.values(VEHICLES)).color,
          };
          // Never park a car on top of a building.
          const clash = atlas.buildings.slice(before).some((b) => spot.x > b.x - 40 && spot.x < b.x + b.w + 40 && spot.y > b.y - 40 && spot.y < b.y + b.h + 40);
          if (!clash) atlas.parkedSpots.push(spot);
        }
      }
    }
  }
  // Street lamps along the avenues.
  for (const line of ROADS) {
    for (let t = 300; t < WORLD_SIZE - 200; t += 500) {
      atlas.lamps.push({ x: line + ROAD_W / 2 + 8, y: t });
      atlas.lamps.push({ x: t, y: line + ROAD_W / 2 + 8 });
    }
  }
  // The docks on the east edge, and the marina: three wooden piers jutting
  // into the sea with speedboats moored alongside.
  atlas.docks = { x: 3440, y: 1400, w: 160, h: 600, label: 'Solmar Docks' };
  for (let i = 0; i < 3; i += 1) {
    const px = 1700 + i * 700;
    atlas.piers.push({ x: px, y: SHORE_Y + 10, w: 60, h: SEA_Y - SHORE_Y + 90 });
    atlas.boatSpots.push({ x: px + 130, y: SEA_Y + 70, angle: Math.PI / 2, color: ['#e8e8e8', '#2f6fb8', '#d94e8a'][i] });
    atlas.boatSpots.push({ x: px - 40, y: SEA_Y + 110, angle: Math.PI / 2, color: '#e8b73a' });
  }
  // Street bikes parked outside the diner, the marina and the arena.
  atlas.bikeSpots = [
    { x: atlas.spots.diner.x - 90, y: atlas.spots.diner.y + 110, angle: 0 },
    { x: atlas.spots.diner.x - 40, y: atlas.spots.diner.y + 110, angle: 0 },
    { x: 1900, y: 3300, angle: Math.PI / 2 },
    { x: atlas.spots.arena.x + 130, y: atlas.spots.arena.y + 100, angle: 0 },
  ];
  return atlas;
}

// Circle-vs-buildings push-out: returns a corrected position.
export function slideOutOfBuildings(atlas, x, y, radius) {
  let px = x; let py = y;
  for (const b of atlas.buildings) {
    const cx = Math.max(b.x, Math.min(px, b.x + b.w));
    const cy = Math.max(b.y, Math.min(py, b.y + b.h));
    const dx = px - cx; const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) { py = b.y - radius; continue; }
      const d = Math.sqrt(d2);
      px = cx + (dx / d) * radius;
      py = cy + (dy / d) * radius;
    }
  }
  return { x: px, y: py };
}
export function insideBuilding(atlas, x, y) {
  for (const b of atlas.buildings) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  return false;
}
export function onRoad(x, y) {
  for (const line of ROADS) {
    if (Math.abs(x - line) < ROAD_W / 2 || Math.abs(y - line) < ROAD_W / 2) return true;
  }
  return false;
}
export function inSea(x, y) { return y >= SEA_Y; }
export function clampWorld(x, y) {
  return { x: Math.max(40, Math.min(WORLD_SIZE - 40, x)), y: Math.max(40, Math.min(WORLD_SIZE - 40, y)) };
}
export function nearestRoadPoint(x, y) {
  let best = null; let bd = Infinity;
  for (const lx of ROADS) for (const ly of ROADS) {
    const d = Math.hypot(lx - x, ly - y);
    if (d < bd) { bd = d; best = { x: lx, y: ly }; }
  }
  return best;
}
