# SKY RUNNER — Escape the Floating City

3D endless runner. Stack: **Vite + React + Three.js**, plain CSS, JavaScript.

- `src/game/createGame.js` — the whole game (scene, track generator, physics, collisions, particles, sound)
- `src/App.jsx` — React UI (menu, HUD, game-over)
- `src/styles.css` — styling

## Just play (no install)
Double-click **`play/index.html`**. It is one self-contained file (game + Three.js inlined) and works offline.
(The top-level `index.html` is the Vite source page: it only works through `npm run dev`, not by double-click.)

## Run the source project
```
npm install
npm run dev
```
## Build for deploy
```
npm run build          # output: dist/ (for Vercel / a web server)
npm run build:single   # regenerates play/index.html (double-click version)
```
Deploy on Vercel: push to GitHub, import the repo (Framework: Vite, build `npm run build`, output `dist`).

Controls: T switches Sunny day / Neon dusk. Arrows or A/D change lane, Up/W/Space jump, Down/S slide (dive in the air), M mute. Phone: swipe, tap to jump.
Best score is stored in LocalStorage.

## Power-ups and revive
- **Magnet** (10 s): pulls nearby orbs to you.
- **x2 Orbs** (12 s): every orb counts double.
- **Shield**: absorbs one crash or one fall.
- **Revive**: after a crash, spend 12 orbs to continue once per run (a short invulnerability follows).
- Speed ramps from 22 to 46 (faster than before).
