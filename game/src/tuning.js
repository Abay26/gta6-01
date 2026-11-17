// Solmar Bay — tuning, palette and shared constants.
// An original sun-soaked coastal city: four districts, a marina, day and
// night, rain and sun. Every name, place and character is invented here.
export const STEP = 1 / 60;
export const WORLD_SIZE = 3600;
export const ROADS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400];
export const ROAD_W = 84;
export const SHORE_Y = 3360;
export const SEA_Y = 3520;
export const SAVE_KEY = 'solmar-bay-save-v3';
export const START_CASH = 200;
export const PRICE_PISTOL = 400;
export const PRICE_AMMO = 60;
export const AMMO_PACK = 24;
export const PRICE_PAINT = 150;
export const PRICE_JACKET = 80;
export const PRICE_LOFT = 2000;
export const MAX_HEALTH = 100;

// Four districts: Old Town (west, low brick), Downtown (centre, glass),
// Northgate Hills (north-east, pale towers), Marina (south, pastel low-rise).
export const AREAS = [
  { id: 'oldtown', name: 'Old Town', x0: 0, y0: 0, x1: 1400, y1: 3600, tint: '#b8a888' },
  { id: 'downtown', name: 'Downtown Solmar', x0: 1400, y0: 800, x1: 2600, y1: 3400, tint: '#a8b8c8' },
  { id: 'northgate', name: 'Northgate Hills', x0: 2600, y0: 0, x1: 3600, y1: 1400, tint: '#c8c0b0' },
  { id: 'marina', name: 'Marina District', x0: 1400, y0: 3000, x1: 3600, y1: 3600, tint: '#e9d6a4' },
];
export function areaAt(x, y) {
  for (const a of AREAS) if (x >= a.x0 && x < a.x1 && y >= a.y0 && y < a.y1) return a;
  return AREAS[1];
}

export const PALETTE = {
  asphalt: '#454a55', asphaltDark: '#3b404b', laneMark: '#e8d98a',
  pavement: '#c9b797', kerb: '#a08e6d', lawn: '#7fae5a', lawnDark: '#6f9c4c',
  sand: '#e9d6a4', sea: '#2e7f9e', seaDeep: '#256b87',
  nightTint: 'rgba(8,12,34,0.55)', duskTint: 'rgba(232,120,60,0.18)',
};

// Vehicle specs: top speed, acceleration, steering grip, size, hull, class.
export const VEHICLES = {
  sedan: { label: 'Sedan', top: 540, accel: 430, steer: 2.6, len: 46, wid: 22, hull: 100, cls: 'car' },
  taxi: { label: 'Taxi', top: 540, accel: 430, steer: 2.6, len: 46, wid: 22, hull: 100, cls: 'car' },
  sports: { label: 'Sports', top: 720, accel: 560, steer: 3.4, len: 48, wid: 22, hull: 80, cls: 'car' },
  van: { label: 'Van', top: 470, accel: 360, steer: 2.2, len: 56, wid: 24, hull: 130, cls: 'car' },
  truck: { label: 'Truck', top: 430, accel: 320, steer: 2.0, len: 62, wid: 26, hull: 160, cls: 'car' },
  limo: { label: 'Limo', top: 500, accel: 380, steer: 2.4, len: 72, wid: 24, hull: 140, cls: 'car' },
  pickup: { label: 'Pickup', top: 520, accel: 420, steer: 2.5, len: 52, wid: 24, hull: 120, cls: 'car' },
  bike: { label: 'Street Bike', top: 780, accel: 640, steer: 4.2, len: 38, wid: 12, hull: 60, cls: 'bike' },
  boat: { label: 'Speedboat', top: 620, accel: 480, steer: 2.0, len: 56, wid: 22, hull: 90, cls: 'boat' },
  police: { label: 'Police Interceptor', top: 660, accel: 560, steer: 3.2, len: 48, wid: 22, hull: 120, cls: 'car' },
};
export const PAINTS = ['#b8452f', '#2f6fb8', '#e8b73a', '#5a7a4a', '#d94e8a', '#7a5ad9', '#e8e8e8', '#20242e', '#4ad9a0', '#c96f2a'];
export const WALKER_COLORS = ['#d96f4e', '#4e7ad9', '#e8a04c', '#7a5ad9', '#4ad9a0', '#d94e8a', '#8a6f4a', '#3a9bb5'];
export const WALKER_NAMES = ['Ana', 'Bruno', 'Carla', 'Dario', 'Elena', 'Felix', 'Gina', 'Hugo', 'Iris', 'Jorge', 'Kira', 'Leo', 'Marta', 'Nico', 'Olga', 'Pablo', 'Rosa', 'Tomas', 'Lena', 'Vera'];
export const STATIONS = [
  { id: 'wave', name: 'Bay Wave 98.2', style: 'synthwave', bpm: 220 },
  { id: 'salsa', name: 'Solmar Salsa 101', style: 'latin groove', bpm: 180 },
  { id: 'rock', name: 'Harbor Rock 94', style: 'guitar drive', bpm: 160 },
];
export const PEOPLE = {
  hero: 'Rico Vega', fixer: 'Mara Solis', garage: 'Solis Auto', bank: 'Bay Trust Bank',
  arms: 'Solmar Arms', motel: 'Palm Court Motel', hospital: 'Solmar General',
  flat: 'Vega Apartment', city: 'Solmar Bay', casino: 'Coral Crown Casino',
  marina: 'Solmar Marina', diner: 'Sunset Diner', tailor: 'Tide & Thread',
  paint: 'Luna Paint & Body', arena: 'Bay Arena',
};
export const JACKETS = ['#e83a3a', '#2f6fb8', '#e8b73a', '#4ad9a0', '#7a5ad9', '#20242e'];
