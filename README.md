# Solmar Bay v2 — an open-world crime story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Abay26/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Abay26/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay v2** is a complete open-world crime game that plays offline in a
desktop browser from static files — a sun-soaked coastal city of its own,
with its own streets, people, cars, story and music. Nothing in it comes
from any commercial game. This is the second entry: ten story jobs, four
districts, a marina with boats, day and night, weather, a phone, radio
stations and a police helicopter.

You are **Rico Vega**, back in Solmar Bay after five years away. **Mara
Solis** runs the garage and has work for a driver who asks no questions:
ten jobs, from moving a sedan across town to the casino caper and a
speedboat escape out of the harbor — with the whole Solmar PD on your tail.

## What's in the city

- **A living open world, four districts** — Old Town's low brick blocks,
  Downtown's glass towers, Northgate Hills' pale high-rises and the Marina
  District's pastel piers; parks, the docks, the beach and the sea; traffic
  that drives the roads, pedestrians on the sidewalks, joggers, beachgoers
  and dock workers.
- **Day, night and weather** — the clock rolls from golden hour through
  dusk to night, lamps glow, the sea darkens, and rain sweeps in and makes
  the roads slick.
- **On foot, by car, bike and boat** — walk, sprint, punch, shoot; steal
  any car on the street (sedans, taxis, sports cars, vans, trucks, limos,
  pickups), ride a street bike, or take a speedboat from the marina and
  outrun the harbour patrol.
- **A wanted system with escalation** — crimes the police see raise your
  stars. Police cars chase and ram; foot cops run you down; roadblocks
  appear at 3 stars and a police helicopter circles at 4–5, its
  searchlight keeping the heat from cooling. Hide out of sight and the heat
  cools, one star at a time. Get caught and it's BUSTED; get hurt and it's
  WASTED — either way you wake at Solmar General, or at the Marina Loft
  if you own it.
- **Missions and a story** — ten jobs with a waypoint marker, objectives
  and payouts, from a first day at the garage to the bank job, the casino
  caper and the harbor escape finale.
- **Side jobs on the phone** — press Q, call Mara for a delivery, Dante
  for a getaway, or Lena for a taxi shift. Drive a taxi and take fares,
  grab the green cash on the streets.
- **Economy** — buy a pistol and ammo at Solmar Arms, a new jacket at
  Tide & Thread, a repaint at Luna Paint & Body (fresh paint cools the
  heat), repair your car at the garage, and buy the Marina Loft safehouse
  for $2,000.
- **Radio** — press R to switch between Bay Wave 98.2 (synthwave),
  Solmar Salsa 101 and Harbor Rock 94, all synthesized live.
- **HUD with a live minimap** — cash, health, wanted stars, the clock,
  weather, district, radio station, the mission objective, toasts, a
  speedometer, and a minimap showing the roads, the player, the cops, the
  helicopter and the job marker.
- **Feel and polish** — a start screen, pause, save (localStorage — cash,
  jobs, pistol, jacket and loft survive a visit), synthesized engine hum,
  sirens, skid marks, boat wakes, explosions, screen shake and a
  golden-hour sun glare.
- **Deterministic screenshots** — `?shot=foot|drive|chase|mission&seed=N`
  stages each scene from the real rules, so the four screenshots are
  reproducible renders of the game itself.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive / sail |
| Shift | Sprint |
| E | Get in / out of a car, bike or boat |
| Space | Punch |
| Mouse + click | Aim and shoot (with a pistol) |
| F | Talk, buy, repair, repaint, buy a jacket or the loft |
| Q | Phone — call a contact for a side job (1/2/3) |
| R | Change radio station |
| H | Horn |
| P / Esc | Pause |
| M | Mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/index.html` and its modules are the whole
game. The entry program is `main.ts` (Node 22, standard library only).

## Source layout

| File | Job |
| --- | --- |
| `game/src/main.js` | Boot, screens, the fixed-step loop |
| `game/src/city.js` | The city generator: four districts, marina, landmarks |
| `game/src/climate.js` | Day/night cycle and weather |
| `game/src/world.js` | The world: state, one step, pickups, taxi fares |
| `game/src/player.js` | Rico on foot: movement, punching, shooting, stealing |
| `game/src/vehicles.js` | Driving, biking and boating physics, traffic AI |
| `game/src/pedestrians.js` | Foot traffic in kinds: strollers, joggers, beachgoers |
| `game/src/police.js` | Wanted stars, police cars, roadblocks, helicopter |
| `game/src/missions.js` | The ten jobs and the story |
| `game/src/phone.js` | The in-game phone and side jobs |
| `game/src/economy.js` | Shops, paint, jackets and the Marina Loft |
| `game/src/render.js` | Drawing the city, cars, boats, people and effects |
| `game/src/hud.js` | HUD, wanted stars, clock, weather and the live minimap |
| `game/src/audio.js` | Synthesized sound, music and three radio stations |
| `game/src/save.js` | localStorage save and load |
| `game/src/shots.js` | Deterministic screenshot scenes |
| `game/src/config.js` | Tuning, palette, car types, districts, story names |
| `game/src/input.js` | Keyboard and mouse |
| `game/src/random.js` | Seeded random |

MIT licensed — see [LICENSE](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?ref=qw56w9dq&utm_source=github&utm_medium=readme&utm_campaign=gta6-01).</sub>
