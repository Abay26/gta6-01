// The shops: Solmar Arms sells a pistol and ammo, Tide & Thread sells
// jackets, Luna Paint repaints the crew car and cools one star of heat, and
// the Marina Loft is a safehouse to own. Press E at the door to buy.
import { PRICE_PISTOL, PRICE_AMMO, AMMO_PACK, PRICE_PAINT, PRICE_JACKET, PRICE_LOFT, PAINTS, JACKETS } from './tuning.js';
import { raiseHeat } from './heat.js';

export function buildShops(world) {
  const door = (kind) => {
    const m = world.atlas.spots[kind];
    return { x: m.x, y: m.y + m.h / 2 + 70 };
  };
  return [
    { id: 'arms', ...door('arms'), label: 'Solmar Arms', hint: 'E — buy pistol $400 / ammo $60' },
    { id: 'tailor', ...door('tailor'), label: 'Tide & Thread', hint: 'E — buy a jacket $80' },
    { id: 'paint', ...door('paint'), label: 'Luna Paint & Body', hint: 'E — repaint $150 (cools 1 star)' },
    { id: 'loft', ...door('loft'), label: 'Marina Loft', hint: 'E — buy the loft $2000' },
  ];
}
export function shopNear(world) {
  const s = world.state;
  for (const shop of world.shops) {
    if (Math.hypot(shop.x - s.hero.x, shop.y - s.hero.y) < 80) return shop;
  }
  return null;
}
export function shopHint(world) {
  const shop = shopNear(world);
  if (!shop) return null;
  if (shop.id === 'arms') return world.state.hero.hasPistol ? shop.hint : 'E — buy a pistol $400';
  if (shop.id === 'loft') return world.state.ownsLoft ? 'Marina Loft — yours. Respawns happen here.' : shop.hint;
  return shop.hint;
}
export function useShop(world, shop) {
  const s = world.state;
  const h = s.hero;
  const deny = (msg) => world.events.push({ kind: 'toast', text: msg });
  if (shop.id === 'arms') {
    if (!h.hasPistol) {
      if (s.cash < PRICE_PISTOL) return deny('Not enough cash for the pistol.');
      s.cash -= PRICE_PISTOL; h.hasPistol = true; h.ammo = AMMO_PACK;
      world.sound.cash();
      world.events.push({ kind: 'toast', text: 'Pistol bought — click to shoot.' });
    } else {
      if (s.cash < PRICE_AMMO) return deny('Not enough cash for ammo.');
      s.cash -= PRICE_AMMO; h.ammo += AMMO_PACK;
      world.sound.cash();
      world.events.push({ kind: 'toast', text: `Ammo +${AMMO_PACK}` });
    }
  } else if (shop.id === 'tailor') {
    if (s.cash < PRICE_JACKET) return deny('Not enough cash for a jacket.');
    s.cash -= PRICE_JACKET;
    s.jacketIdx = (s.jacketIdx + 1) % JACKETS.length;
    h.jacket = JACKETS[s.jacketIdx];
    world.sound.cash();
    world.events.push({ kind: 'toast', text: 'New jacket — looking sharp.' });
  } else if (shop.id === 'paint') {
    if (!s.car) return deny('Bring a car to repaint.');
    if (s.cash < PRICE_PAINT) return deny('Not enough cash for a repaint.');
    s.cash -= PRICE_PAINT;
    s.car.color = world.rng.pick(PAINTS);
    if (s.wanted > 0) { s.wanted -= 1; world.events.push({ kind: 'heat', stars: s.wanted }); }
    world.sound.cash();
    world.events.push({ kind: 'toast', text: 'Fresh paint — the heat cools a little.' });
  } else if (shop.id === 'loft') {
    if (s.ownsLoft) return deny('The Marina Loft is already yours.');
    if (s.cash < PRICE_LOFT) return deny('The loft costs $2000.');
    s.cash -= PRICE_LOFT; s.ownsLoft = true;
    world.sound.jingle();
    world.events.push({ kind: 'toast', text: 'Marina Loft bought — your new safehouse.' });
  }
  void raiseHeat;
}
