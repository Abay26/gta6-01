// Solmar Bay v2 — tuning, palette and shared constants.
// Two districts, a marina, day/night and weather, bikes and boats, a phone,
// radio, shops and property. Every name, place and character is original.
export const STEP = 1 / 60;
export const WORLD = 3600;
export const ROAD_LINES = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400];
export const ROAD_W = 84;
export const BLOCK = 400;
export const BEACH_Y = 3360;
export const WATER_Y = 3520;
export const SAVE_KEY = 'solmar-bay-save-v2';
export const START_CASH = 200;
export const PISTOL_PRICE = 400;
export const AMMO_PRICE = 60;
export const AMMO_PACK = 24;
export const PAINT_PRICE = 150;
export const SHIRT_PRICE = 80;
export const SAFEHOUSE2_PRICE = 2000;
export const BOAT_PRICE = 900;

// Districts: Old Town (west, low brick), Downtown (centre, glass towers),
// Northgate Hills (north-east, tall pale towers), Marina (south, low pastel).
export const DISTRICTS = [
  { id: 'oldtown', name: 'Old Town', x0: 0, y0: 0, x1: 1400, y1: 3600, tint: '#b8a888' },
  { id: 'downtown', name: 'Downtown Solmar', x0: 1400, y0: 800, x1: 2600, y1: 3400, tint: '#a8b8c8' },
  { id: 'northgate', name: 'Northgate Hills', x0: 2600, y0: 0, x1: 3600, y1: 1400, tint: '#c8c0b0' },
  { id: 'marina', name: 'Marina District', x0: 1400, y0: 3000, x1: 3600, y1: 3600, tint: '#e9d6a4' },
];
export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  return DISTRICTS[1];
}

export const PALETTE = {
  asphalt: '#454a55', asphaltDark: '#3b404b', lane: '#e8d98a',
  sidewalk: '#c9b797', curb: '#a08e6d', grass: '#7fae5a', grassDark: '#6f9c4c',
  sand: '#e9d6a4', water: '#2e7f9e', waterDeep: '#256b87',
  night: 'rgba(8,12,34,0.55)', dusk: 'rgba(232,120,60,0.18)',
};

export const CAR_TYPES = {
  sedan: { name: 'Sedan', topSpeed: 540, accel: 430, grip: 2.6, color: '#b8452f', length: 46, width: 22, health: 100, kind: 'car' },
  taxi: { name: 'Taxi', topSpeed: 540, accel: 430, grip: 2.6, color: '#e8b73a', length: 46, width: 22, health: 100, kind: 'car' },
  sports: { name: 'Sports', topSpeed: 720, accel: 560, grip: 3.4, color: '#2f6fb8', length: 48, width: 22, health: 80, kind: 'car' },
  van: { name: 'Van', topSpeed: 470, accel: 360, grip: 2.2, color: '#7a8894', length: 56, width: 24, health: 130, kind: 'car' },
  truck: { name: 'Truck', topSpeed: 430, accel: 320, grip: 2.0, color: '#5a7a4a', length: 62, width: 26, health: 160, kind: 'car' },
  limo: { name: 'Limo', topSpeed: 500, accel: 380, grip: 2.4, color: '#20242e', length: 72, width: 24, health: 140, kind: 'car' },
  pickup: { name: 'Pickup', topSpeed: 520, accel: 420, grip: 2.5, color: '#c96f2a', length: 52, width: 24, health: 120, kind: 'car' },
  bike: { name: 'Street Bike', topSpeed: 780, accel: 640, grip: 4.2, color: '#d94e8a', length: 38, width: 12, health: 60, kind: 'bike' },
  boat: { name: 'Speedboat', topSpeed: 620, accel: 480, grip: 2.0, color: '#e8e8e8', length: 56, width: 22, health: 90, kind: 'boat' },
  police: { name: 'Police', topSpeed: 660, accel: 560, grip: 3.2, color: '#20242e', length: 48, width: 22, health: 120, kind: 'car' },
};
export const PAINT_COLORS = ['#b8452f', '#2f6fb8', '#e8b73a', '#5a7a4a', '#d94e8a', '#7a5ad9', '#e8e8e8', '#20242e', '#4ad9a0', '#c96f2a'];
export const PED_COLORS = ['#d96f4e', '#4e7ad9', '#e8a04c', '#7a5ad9', '#4ad9a0', '#d94e8a', '#8a6f4a', '#3a9bb5'];
export const PED_NAMES = ['Ana', 'Bruno', 'Carla', 'Dario', 'Elena', 'Felix', 'Gina', 'Hugo', 'Iris', 'Jorge', 'Kira', 'Leo', 'Marta', 'Nico', 'Olga', 'Pablo', 'Rosa', 'Tomas', 'Lena', 'Vera'];
export const RADIO_STATIONS = [
  { id: 'wave', name: 'Bay Wave 98.2', desc: 'synthwave', tempo: 220 },
  { id: 'salsa', name: 'Solmar Salsa 101', desc: 'latin groove', tempo: 180 },
  { id: 'rock', name: 'Harbor Rock 94', desc: 'guitar drive', tempo: 160 },
];
export const STORY = {
  hero: 'Rico Vega', fixer: 'Mara Solis', garage: 'Solis Auto', bank: 'Bay Trust Bank',
  shop: 'Solmar Arms', motel: 'Palm Court Motel', hospital: 'Solmar General',
  safehouse: 'Vega Apartment', city: 'Solmar Bay',
  casino: 'Coral Crown Casino', marina: 'Solmar Marina', diner: 'Sunset Diner',
  clothes: 'Tide & Thread', paint: 'Luna Paint & Body', stadium: 'Bay Arena',
};
