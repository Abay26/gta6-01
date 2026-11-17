# Solmar Bay — an open-world crime story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Abay26/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Abay26/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** is a complete open-world crime game that plays offline in a
desktop browser from static files — a sun-soaked coastal city of its own,
with its own streets, people, cars, story and music. Nothing in it comes
from any commercial game.

You are **Rico Vega**, back in Solmar Bay after five years away. **Mara
Solis** runs the garage and has work for a driver who asks no questions:
six jobs, from moving a sedan across town to the big score at Bay Trust
Bank — with the whole Solmar PD on your tail.

## What's in the city

- **A living open world** — a 9×9 grid of avenues, parks, the docks, the
  beach and the sea; traffic that drives the roads, pedestrians on the
  sidewalks, day rolling on toward evening.
- **On foot and by car** — walk, sprint, punch, shoot; steal any car on the
  street (sedans, taxis, sports cars, vans, trucks) and drive it with
  arcade handling, drift and damage.
- **A wanted system** — crimes the police see raise your stars. Police cars
  chase and ram; foot cops run you down. Hide out of sight and the heat
  cools, one star at a time. Get caught and it's BUSTED; get hurt and it's
  WASTED — either way you wake at Solmar General, lighter in the wallet.
- **Missions and a story** — six jobs with a waypoint marker, objectives and
  payouts, from a first day at the garage to the bank job finale.
- **Side hustles** — drive a taxi and take fares, grab the green cash on the
  streets, buy a pistol and ammo at Solmar Arms, repair your car at the
  garage.
- **HUD with a live minimap** — cash, health, wanted stars, the clock, the
  mission objective, toasts, a speedometer, and a minimap showing the
  roads, the player, the cops and the job marker.
- **Feel and polish** — a start screen, pause, save (localStorage — cash,
  jobs, pistol and position survive a visit), synthesized engine hum,
  sirens, a synthwave loop, skid marks, explosions, screen shake and a
  golden-hour sun glare.
- **Deterministic screenshots** — `?shot=foot|drive|chase|mission&seed=N`
  stages each scene from the real rules, so the four screenshots are
  reproducible renders of the game itself.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Sprint |
| E | Get in / out of a car |
| Space | Punch |
| Mouse + click | Aim and shoot (with a pistol) |
| F | Talk, buy, repair |
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
| `game/src/city.js` | The city generator: roads, blocks, landmarks |
| `game/src/world.js` | The world: state, one step, pickups, taxi fares |
| `game/src/player.js` | Rico on foot: movement, punching, shooting, stealing |
| `game/src/vehicles.js` | Driving physics and traffic AI |
| `game/src/pedestrians.js` | Foot traffic that strolls and flees |
| `game/src/police.js` | Wanted stars, police cars and foot cops |
| `game/src/missions.js` | The six jobs and the story |
| `game/src/render.js` | Drawing the city, cars, people and effects |
| `game/src/hud.js` | HUD, wanted stars and the live minimap |
| `game/src/audio.js` | Synthesized sound and music (WebAudio) |
| `game/src/save.js` | localStorage save and load |
| `game/src/shots.js` | Deterministic screenshot scenes |
| `game/src/config.js` | Tuning, palette, car types, story names |
| `game/src/input.js` | Keyboard and mouse |
| `game/src/random.js` | Seeded random |

MIT licensed — see [LICENSE](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?ref=qw56w9dq&utm_source=github&utm_medium=readme&utm_campaign=gta6-01).</sub>
