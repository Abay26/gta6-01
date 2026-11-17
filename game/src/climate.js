// Climate: the clock, day/night and weather for Solmar Bay.
// Time starts at golden hour and rolls forward; night falls, lamps glow and
// the sea darkens. Weather cycles clear -> cloudy -> rain -> clear, and rain
// makes the roads slick and the city read differently in every screenshot.
export function createClimate() {
  return {
    minutes: 17 * 60 + 30, // golden hour
    weather: 'clear', weatherTimer: 240, rain: [],
    day: 1,
  };
}
export function climateStep(c, dt, rng) {
  c.minutes += dt / 2; // one game minute every two real seconds
  if (c.minutes >= 24 * 60) { c.minutes -= 24 * 60; c.day += 1; }
  c.weatherTimer -= dt;
  if (c.weatherTimer <= 0) {
    const order = { clear: 'cloudy', cloudy: 'rain', rain: 'clear' };
    c.weather = order[c.weather] || 'clear';
    c.weatherTimer = c.weather === 'rain' ? 90 : 180 + rng.range(0, 120);
  }
  if (c.weather === 'rain') {
    for (let i = 0; i < 3; i += 1) c.rain.push({ x: rng.range(0, 3600), y: rng.range(0, 3600), v: rng.range(500, 800) });
    if (c.rain.length > 220) c.rain.splice(0, c.rain.length - 220);
  } else c.rain.length = 0;
  for (const drop of c.rain) { drop.y += drop.v * dt; drop.x -= drop.v * 0.25 * dt; }
  c.rain = c.rain.filter((d) => d.y < 3700);
}
export function isNight(c) { const h = c.minutes / 60; return h < 6 || h >= 20; }
export function isDusk(c) { const h = c.minutes / 60; return (h >= 17 && h < 20) || (h >= 5 && h < 7); }
// 0 = pitch night, 1 = full day. Used by the renderer for the sky tint.
export function daylight(c) {
  const h = c.minutes / 60;
  if (h < 5 || h >= 21) return 0.12;
  if (h < 7) return 0.12 + ((h - 5) / 2) * 0.5;
  if (h < 17) return 1;
  if (h < 20) return 1 - ((h - 17) / 3) * 0.55;
  return 0.45 - ((h - 20) / 1) * 0.33;
}
export function clockText(c) {
  const total = Math.floor(c.minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
export function weatherLabel(c) {
  return c.weather === 'rain' ? 'Rain' : c.weather === 'cloudy' ? 'Cloudy' : 'Clear';
}
