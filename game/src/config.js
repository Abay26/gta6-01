// Solmar Bay — tuning, palette and shared constants for the whole game.
// Everything here is ours: an original sun-soaked coastal city, its own names,
// its own people. Nothing is borrowed from any commercial game.
export const STEP = 1 / 60;
export const WORLD = 3600; // the city is WORLD x WORLD world units
export const ROAD_LINES = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400];
export const ROAD_W = 84;
export const BLOCK = 400;
export const BEACH_Y = 3360; // sand starts here
export const WATER_Y = 3520; // sea starts here
export const SAVE_KEY = 'solmar-bay-save-v1';
export const START_CASH = 150;
export const PISTOL_PRICE = 400;
export const AMMO_PRICE = 60;
export const AMMO_PACK = 24;

// Golden-afternoon palette: warm sun, teal sea, dusty streets.
export const PALETTE = {
  asphalt: '#454a55',
  asphaltDark: '#3b404b',
  lane: '#e8d98a',
  sidewalk: '#c9b797',
  curb: '#a08e6d',
  grass: '#7fae5a',
  grassDark: '#6f9c4c',
  sand: '#e9d6a4',
  water: '#2e7f9e',
  waterDeep: '#256b87',
};

// Cars the city drives. topSpeed in world units per second.
export const CAR_TYPES = {
  sedan: { name: 'Sedan', topSpeed: 540, accel: 430, grip: 2.6, color: '#b8452f', length: 46, width: 22, health: 100 },
  taxi: { name: 'Taxi', topSpeed: 540, accel: 430, grip: 2.6, color: '#e8b73a', length: 46, width: 22, health: 100 },
  sports: { name: 'Sports', topSpeed: 720, accel: 560, grip: 3.4, color: '#2f6fb8', length: 48, width: 22, health: 80 },
  van: { name: 'Van', topSpeed: 470, accel: 360, grip: 2.2, color: '#7a8894', length: 56, width: 24, health: 130 },
  truck: { name: 'Truck', topSpeed: 430, accel: 320, grip: 2.0, color: '#5a7a4a', length: 62, width: 26, health: 160 },
  police: { name: 'Police', topSpeed: 640, accel: 540, grip: 3.2, color: '#20242e', length: 48, width: 22, health: 120 },
};

export const PED_COLORS = ['#d96f4e', '#4e7ad9', '#e8a04c', '#7a5ad9', '#4ad9a0', '#d94e8a', '#8a6f4a', '#3a9bb5'];
export const PED_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Dario', 'Elena', 'Felix', 'Gina', 'Hugo',
  'Iris', 'Jorge', 'Kira', 'Leo', 'Marta', 'Nico', 'Olga', 'Pablo',
];

// The story's people and places. All original names.
export const STORY = {
  hero: 'Rico Vega',
  fixer: 'Mara Solis',
  garage: 'Solis Auto',
  bank: 'Bay Trust Bank',
  shop: 'Solmar Arms',
  motel: 'Palm Court Motel',
  hospital: 'Solmar General',
  safehouse: 'Vega Apartment',
  city: 'Solmar Bay',
};
