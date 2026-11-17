# Solmar Bay — an open-world crime story

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Abay26/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Abay26/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** is an open-world crime game for the [make.fun](https://make.fun/c/gta6-01?ref=qw56w9dq) **gta6-01** bounty ("Make GTA 6"). You are Rico Vega, a driver fresh back in Solmar Bay, working ten jobs for fixer Mara Solis — from moving her sedan across town to cracking the Coral Crown Casino and escaping by speedboat while the whole Solmar PD hunts you.

## The city

- **Four districts** — Old Town's low brick streets, Downtown's glass towers, Northgate Hills, and the Marina District with its beach, piers and moored speedboats.
- **Day and night, weather** — a clock runs from golden hour through night; rain and cloud roll in and change how the city looks and feels.
- **Traffic and pedestrians** — cars, taxis, vans, trucks and limos drive the avenues; pedestrians stroll, jog the parks and lounge on the beach, and scatter when things get loud.

## The systems

- **Ten story jobs** with a real arc: First Day on the Job, The Docks Pickup, Getaway Driver, Taxi Hustle, Bike Courier, Repo Run, Fresh Paint, The Solmar Score, The Casino Caper, and the Harbor Escape finale.
- **Vehicles to steal and drive** — sedans, sports cars, taxis, vans, pickups, street bikes and drivable speedboats, each with its own handling.
- **A five-star wanted level** — foot cops at low heat, cop cars that chase and ram, roadblocks from three stars, and the police helicopter with its spotlight from four stars. Lose the heat by staying out of sight, or cool it with a fresh paint job.
- **Combat** — punch (F), or buy a pistol and ammo at Solmar Arms and shoot with the mouse.
- **In-game phone (Q)** — call Mara for the next job, Lena for parcel runs, Dante for getaways, or Cab Dispatch for a taxi shift.
- **Economy** — earn cash from jobs, fares and street pickups; spend it on a pistol, ammo, jackets at Tide & Thread, repaints at Luna Paint & Body, and the Marina Loft safehouse.
- **Three synthesized radio stations** — Bay Wave 98.2 (synthwave), Solmar Salsa 101, Harbor Rock 94 — plus engine hum, sirens and crash sounds, all generated in code. No audio files.
- **HUD with minimap** — cash, health, wanted stars, clock, weather, radio, objective, speed, and a live minimap showing the player, cops and markers.
- **Save** — progress saves when a job finishes and when the game is paused; continue from the title screen.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk and drive (Shift to sprint on foot) |
| E | Enter / exit a car, bike or boat · talk · shop |
| F | Punch |
| Mouse + click | Aim and shoot (with a pistol) |
| Q | Phone |
| R | Radio |
| M | Mute |
| P / Esc | Pause |
| Enter | Confirm / start |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: the game is plain static files under `game/` and runs offline in desktop Chrome.

## Screenshots

The four shots in `screenshots/` are real renders of this build, staged by `game/src/frames.js` (`?shot=foot|drive|chase|mission&seed=7`): on foot at the garage with the phone open, driving down the avenue in traffic, a four-star chase with the helicopter overhead, and the Casino Caper in progress.

## Structure

| File | Job |
| --- | --- |
| `game/src/boot.js` | Boot, the fixed-step loop, title / help / pause screens |
| `game/src/core.js` | The world: state, one step, events, pickups, the taxi trade |
| `game/src/atlas.js` | The map: seeded city, landmarks, piers, collision helpers |
| `game/src/tuning.js` | Constants, districts, palette, vehicle specs, story names |
| `game/src/canvas.js` | The painter: city, traffic, crowd, cops, heli, screens |
| `game/src/interface.js` | HUD, minimap, toasts, phone panel |
| `game/src/hero.js` | Rico on foot: walk, punch, shoot, board vehicles |
| `game/src/garage.js` | Vehicle physics, traffic, crashes |
| `game/src/crowd.js` | Pedestrians |
| `game/src/heat.js` | Wanted level, cops, roadblocks, helicopter, respawn |
| `game/src/story.js` | The ten jobs |
| `game/src/cell.js` | Phone contacts and side jobs |
| `game/src/shops.js` | Gun shop, tailor, paint shop, Marina Loft |
| `game/src/weather.js` | Clock and weather |
| `game/src/synth.js` | Synthesized sound and radio |
| `game/src/keys.js` | Keyboard and mouse |
| `game/src/rng.js` | Seeded random numbers |
| `game/src/vault.js` | Save / load |
| `game/src/frames.js` | Screenshot scenes |
| `main.ts` | Hands the game in: copies `game/` + `screenshots/`, writes `dossier.json` |

## License

MIT — see `LICENSE`. The city, characters, vehicles, names, story, art, sound and music are all original; nothing here comes from any commercial game.
