// Economy: shops and property. Solmar Arms sells the pistol and ammo,
// Tide & Thread sells shirts (each outfit changes Rico's jacket colour),
// Luna Paint repaints the car you are driving, and the Marina Loft safehouse
// can be bought outright — it becomes a second respawn and save point.
import { AMMO_PACK, AMMO_PRICE, PAINT_COLORS, PAINT_PRICE, PISTOL_PRICE, SAFEHOUSE2_PRICE, SHIRT_PRICE } from './config.js';

export const SHIRTS = [
  { name: 'Red Jacket', color: '#e83a3a', price: SHIRT_PRICE },
  { name: 'Teal Jacket', color: '#2a9a8a', price: SHIRT_PRICE },
  { name: 'Gold Jacket', color: '#e8b73a', price: SHIRT_PRICE },
  { name: 'Black Jacket', color: '#20242e', price: SHIRT_PRICE },
];
export function nearestShop(world) {
  const s = world.state; const p = s.player;
  const spots = [
    { kind: 'gunshop', lm: world.city.landmarks.gunshop },
    { kind: 'clothes', lm: world.city.landmarks.clothes },
    { kind: 'paint', lm: world.city.landmarks.paint },
    { kind: 'safehouse2', lm: world.city.landmarks.safehouse2 },
    { kind: 'garage', lm: world.city.landmarks.garage },
  ];
  for (const spot of spots) {
    if (!spot.lm) continue;
    const d = Math.hypot(p.x - spot.lm.x, p.y - (spot.lm.y + spot.lm.h / 2 + 70));
    if (d < 95) return spot.kind;
  }
  return null;
}
export function shopHint(world) {
  const kind = nearestShop(world);
  const s = world.state;
  if (kind === 'gunshop') return s.player.hasPistol ? 'F — Buy ammo ($60)' : 'F — Buy a pistol ($400)';
  if (kind === 'clothes') return 'F — Buy a jacket ($80)';
  if (kind === 'paint') return s.playerCar ? 'F — Repaint car ($150)' : 'F — Paint shop (bring a car)';
  if (kind === 'safehouse2') return s.ownsLoft ? 'Marina Loft — yours' : 'F — Buy the Marina Loft ($2000)';
  if (kind === 'garage') return s.playerCar ? 'F — Repair car' : 'F — Talk to Mara';
  return null;
}
// Returns true when F was consumed by a shop.
export function useEconomy(world) {
  const s = world.state; const p = s.player;
  const kind = nearestShop(world);
  if (!kind) return false;
  const toast = (t) => world.events.push({ kind: 'toast', text: t });
  if (kind === 'gunshop') {
    if (!p.hasPistol && s.cash >= PISTOL_PRICE) { s.cash -= PISTOL_PRICE; p.hasPistol = true; p.ammo = AMMO_PACK; toast(`Pistol bought — $${PISTOL_PRICE}. Aim with the mouse, click to fire.`); world.audio.cash(); }
    else if (p.hasPistol && s.cash >= AMMO_PRICE) { s.cash -= AMMO_PRICE; p.ammo += AMMO_PACK; toast(`Ammo +${AMMO_PACK} — $${AMMO_PRICE}`); world.audio.cash(); }
    else toast(p.hasPistol ? 'Not enough cash for ammo ($60)' : 'Pistol costs $400 — earn some cash first');
    return true;
  }
  if (kind === 'clothes') {
    if (s.cash < SHIRT_PRICE) { toast('A jacket costs $80 — not enough cash'); return true; }
    s.cash -= SHIRT_PRICE;
    const next = SHIRTS[(s.shirtIndex + 1) % SHIRTS.length];
    s.shirtIndex = (s.shirtIndex + 1) % SHIRTS.length;
    p.jacket = next.color;
    toast(`New jacket: ${next.name} — $${SHIRT_PRICE}`);
    world.audio.cash();
    return true;
  }
  if (kind === 'paint') {
    if (!s.playerCar) { toast('Bring a car to repaint it'); return true; }
    if (s.cash < PAINT_PRICE) { toast('A repaint costs $150'); return true; }
    s.cash -= PAINT_PRICE;
    const car = s.playerCar;
    const idx = (PAINT_COLORS.indexOf(car.color) + 1) % PAINT_COLORS.length;
    car.color = PAINT_COLORS[idx];
    car.paintIndex = idx;
    toast(`Repainted ${car.spec.name} — $${PAINT_PRICE}. Fresh paint cools the heat.`);
    if (s.wanted > 0) { s.wanted = Math.max(0, s.wanted - 1); }
    world.audio.cash();
    return true;
  }
  if (kind === 'safehouse2') {
    if (s.ownsLoft) { toast('The Marina Loft is yours — progress saves here'); return true; }
    if (s.cash < SAFEHOUSE2_PRICE) { toast(`The Marina Loft costs $${SAFEHOUSE2_PRICE} — save up`); return true; }
    s.cash -= SAFEHOUSE2_PRICE; s.ownsLoft = true;
    toast('Marina Loft bought! A second safehouse — respawn here after a bust.');
    world.audio.jingle();
    return true;
  }
  if (kind === 'garage' && s.playerCar) {
    const car = s.playerCar;
    const cost = Math.ceil((car.maxHealth - car.health) * 0.8);
    if (car.health < car.maxHealth && s.cash >= cost) { s.cash -= cost; car.health = car.maxHealth; toast(`Car repaired — $${cost}`); world.audio.cash(); }
    else if (car.health >= car.maxHealth) toast('The car is already in perfect shape');
    else toast(`Repair costs $${cost} — not enough cash`);
    return true;
  }
  return false;
}
