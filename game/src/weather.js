// The sky: a clock that runs from golden hour through night, and weather
// that drifts between clear, cloudy and rain.
export function makeSky() {
  return { minutes: 17 * 60 + 30, weather: 'clear', weatherTimer: 40, rain: 0 };
}
export function tickSky(sky, dt, rng) {
  sky.minutes = (sky.minutes + dt * 2) % 1440; // 1 real second = 2 game minutes
  sky.weatherTimer -= dt;
  if (sky.weatherTimer <= 0) {
    sky.weatherTimer = rng.range(35, 90);
    sky.weather = rng.pick(['clear', 'clear', 'cloudy', 'rain']);
  }
  const target = sky.weather === 'rain' ? 1 : sky.weather === 'cloudy' ? 0.35 : 0;
  sky.rain += (target - sky.rain) * Math.min(1, dt * 0.5);
}
export function skyIsNight(sky) { const h = sky.minutes / 60; return h < 6 || h >= 20; }
export function skyIsDusk(sky) { const h = sky.minutes / 60; return (h >= 17 && h < 20) || (h >= 5 && h < 7); }
export function daylight(sky) {
  const h = sky.minutes / 60;
  if (h < 5 || h >= 21) return 0.15;
  if (h < 7) return 0.15 + ((h - 5) / 2) * 0.55;
  if (h < 17) return 0.7 + Math.sin(((h - 7) / 10) * Math.PI) * 0.3;
  if (h < 20) return 0.7 - ((h - 17) / 3) * 0.55;
  return 0.15;
}
export function clockString(sky) {
  const h = Math.floor(sky.minutes / 60);
  const m = Math.floor(sky.minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
export function weatherString(sky) {
  return sky.weather === 'rain' ? 'Rain' : sky.weather === 'cloudy' ? 'Cloudy' : 'Clear';
}
