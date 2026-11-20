# SOLMAR HEAT — An Open-City Story from Solmar Bay

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![make.fun bounty: gta6-01](https://img.shields.io/badge/make.fun-gta6--01-orange.svg)](https://make.fun/bounty/gta6-01)
[![Play offline](https://img.shields.io/badge/play-offline%20in%20browser-blue.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) — $1,666, top 100.
It runs entirely offline in a desktop browser from static files: no build step,
no network request, no account.

**Rio Vega runs packages for the Bayline crew across Solmar Bay.** Steal a car,
lose the cops, run three story jobs — and don't get busted.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static file server.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Run |
| E | Enter / exit a car (stealing one raises your wanted level) |
| Click / F | Fire the pistol |
| Mouse drag | Orbit the camera |
| P / Esc | Pause (save from the pause menu) |

## What's in the city

- **Solmar Bay** — a procedural sun-soaked city: 80+ towers, the Solmar Grand
  Hotel, Marina Pier, a beach and the sea, palms and street lamps, all built
  from code (no borrowed art, names, characters or music).
- **On foot and by car** — walk the sidewalks or steal one of the parked cars,
  taxis and sports cars; arcade driving with steering, braking and reversing.
- **Traffic and pedestrians** — 11 cars cruise the avenues and 16 pedestrians
  stroll the blocks (and scatter when a car barrels at them).
- **Wanted level + police** — steal, hit or shoot and the stars rise; Solmar
  Bay PD interceptors chase, ram and bust you. Stay clean and the heat cools off.
- **Three story missions** — pick up a package at Marina Pier, chase down the
  rival courier who stole the crew's sports car, then deliver to the Solmar
  Grand Hotel against the clock while the cops are watching. Each job pays
  cash; progress auto-saves to the browser.
- **Combat** — a hitscan pistol with muzzle flash and procedural sound.
- **HUD + minimap** — cash, health, missions, wanted stars, a live minimap
  with the player arrow, traffic, police and the pulsing yellow waypoint.
- **Sound** — every effect is synthesized with WebAudio (engine, siren,
  gunshot, cash); no audio files.
- **Save** — progress auto-saves on every completed mission; continue from the
  title screen.

## How it's built

- `game/index.html` + `game/src/*.js` — the game, split into files with one
  clear job each: `config` (tuning), `city` (the procedural city), `vehicles`
  (cars + traffic + driving), `people` (Rio + pedestrians), `police` (wanted
  system + pursuit), `missions` (the story), `hud` (HUD + minimap), `audio`
  (synthesized sound), `save`, `world` (rules + state), `render` (three.js
  scene + chase camera), `shots` (the screenshot scenes), `main` (boot + loop).
- `game/three.min.js` — three.js r160, vendored (the only library).
- `main.ts` — the entry program: copies `game/` + `screenshots/` to `/output`
  and writes `/output/dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for local play.
- `screenshots/` — 4 real renders of the game (cover first: a 3-star chase).

## License

MIT — see [LICENSE](LICENSE). Original city, characters, vehicles, names,
story, art and sounds; nothing from any commercial game.
