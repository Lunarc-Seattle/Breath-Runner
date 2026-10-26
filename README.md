# Breath Runner

**A breathing-rehab game for people recovering from lung surgery at home. Inhale to jump, keep inhaling to glide across the cliffs.**

Designed, illustrated and built by **Jie (Fia) Yin**.

[![Test & Deploy](https://github.com/Lunarc-Seattle/breath-runner/actions/workflows/test-and-deploy.yml/badge.svg)](https://github.com/Lunarc-Seattle/breath-runner/actions/workflows/test-and-deploy.yml)

**[▶ Play it live](https://lunarc-seattle.github.io/breath-runner/)** · [Full design case study (PDF)](pic/Jie_Yin_Breath_Training.pdf)

![Breath Runner gameplay: the runner jumps a gap on a long inhale and collects coins](docs/media/breath-runner.gif)

---

## The problem

After thoracic surgery, patients are asked to do inspiratory breathing exercises every day with a plastic three-ball trainer. The exercise works, but it is repetitive and gives no sense of progress, so many people stop.

Breath Runner turns the same exercise into a short run through an illustrated landscape. The game rewards the breath the doctor wants: **long, steady inhales**, not short gasps.

## How it plays

- The runner moves on her own across the cliffs from the original illustration.
- When the golden arrow tilts up, **start inhaling**: she jumps. **Keep inhaling** and she glides. **Exhale** and she lands.
- A short breath can't clear the big gap in the middle; only a long, controlled inhale can. That's the core design decision: the hardest jump is the one that needs the most therapeutic breath.
- The lung meter empties while you glide and refills while you exhale, so you can't just hold forever.
- Falling never ends the run. She respawns on the last cliff, because this is rehab, not a test.

Input: hold the screen, hold Space, or **breathe into your microphone**. The mic mode listens for the sound of airflow, measures the room's noise first, and needs no hardware.

| Level | Coins | Breaths per lap | Lung (glide time) | Pace |
|---|---|---|---|---|
| Forest · 1 | 30, placed as drawn in the illustration | ~5, only at the gaps | 2.4 s | 1.0× |
| Sunlit Canyon · 2 | 22, along longer glide arcs | 7 | 2.2 s | 1.1× |
| Glacier Ridge · 3 | 22, higher and sparser | 10 | 2.0 s | 1.2× |

<p>
  <img src="docs/media/level1-forest.jpg" alt="Level 1 in play: HUD with coins and breath sync, runner on the cliffs, breath dock at the bottom" width="49%" />
  <img src="docs/media/level3-glacier.jpg" alt="Level 3 start card showing 22 coins, 2 s lung and 1.2x pace" width="49%" />
</p>

## From sketch to playable game

I designed the whole product, not just the screens: the physical trainer, the companion app, the illustration, and now the game running in the browser.

| 1 · Form sketches | 2 · Trainer device (3D) |
|---|---|
| ![Ideation sketches of the trainer's form, built from cylinder and sphere studies](docs/media/process-1-sketch.jpg) | ![3D render of the white handheld breathing trainer with a teal accent](docs/media/process-2-device.jpg) |

| 3 · Companion app design | 4 · Level illustration (Illustrator) |
|---|---|
| ![App design board: welcome, device pairing, home, map choice, community and hygiene booking screens](docs/media/process-3-app-design.jpg) | ![The original illustration: misty mountains, pine forest and stone cliffs](docs/media/process-4-illustration.jpg) |

The game runs on the original `pic/background.ai` file, not on a redrawing of it. An export script reads the Illustrator file, renders the scenery without the sprites, pulls out the runner, arrow and coin artwork, and traces the vector cliff shapes into collision data. Change the illustration, re-run the script, and the level changes with it.

## Engineering highlights

- **Art pipeline from the source file.** `scripts/assets/export_forest_ai.py` uses PyMuPDF to read the `.ai`. It deletes the sprite images before rendering the background, samples the cliff paths into top-surface profiles, and writes the coin, runner and arrow positions to `src/animation/forestMap.js`.
- **Game logic separated from rendering.** `src/core/forestRunner.js` is a pure step function covering jump, glide, lung, coins, falls and laps, all in the illustration's own coordinates. `src/animation/forestEngine.js` only draws what the state says, so the rules can be unit-tested without a browser.
- **Levels that are guaranteed to be beatable.** Levels 2 and 3 are written as *breath scripts* (where to inhale, for how long). The physics simulates each script and drops coins along the flight arcs, so every coin is reachable by construction. A test plays each script and checks that it collects every coin with zero falls.
- **Microphone breath detection.** `src/lib/micBreath.js` band-passes the mic signal, calibrates to the room's noise floor, and uses hysteresis so a fading breath doesn't flicker. The detector is a pure function with its own tests.
- **Runs anywhere.** The JavaScript ships as native ES modules with React via `htm`, so there is no bundler; only the Tailwind CSS is precompiled. On GitHub Pages, sessions are saved in `localStorage`; under `npm run server`, they are saved through an Express REST API (`/api/v1/sessions`). The client detects which one is available.
- **Small, real CI.** Every push runs the test suite, checks the compiled CSS is current, then deploys to Pages.
- **Accessible and fast.** Lighthouse (desktop, home page): **Performance 98 · Accessibility 100 · Best Practices 100 · SEO 100**. Filled brand colors use slightly deeper variants wherever they carry white text, so every label meets WCAG AA contrast (4.5:1).

## The rest of the app

Breath Runner is page 04 of a 12-page companion-app prototype: welcome & resume, daily schedule, map choice, spirometry lab, co-op mode, leaderboard, hygiene booking, device rental, physician guidance, recovery journey and profile. Navigation hides in a drawer that eases in when you hover the page pill or the left edge of the screen; the AeroCare mark is always Home.

![Navigation drawer open from the left edge, grouped into Train, Together, Care and You](docs/media/nav-drawer.jpg)

**Honest scope:** apart from the game, these pages are interactive prototypes with sample data. Trainer pairing uses the real Web Bluetooth API (Chrome / Edge) and looks for a device named `AeroCare…`. The trainer itself is a design concept, so without one the app says no trainer was found and points you to free-trial mode. The microphone input, the game and the session storage are real.

## Run it locally

```bash
npm install
npm run server        # http://localhost:4000 (app + session API)
npm test              # 36 tests: game physics, levels, mic detector, stats, API
```

Or serve it statically like GitHub Pages: `python3 -m http.server 8000`.

After changing Tailwind classes, run `npm run build:css` and commit `assets/app.css`. CI fails if you forget.

To re-export the level art after editing the illustration:

```bash
python3 -m pip install pymupdf
python3 scripts/assets/export_forest_ai.py
```

## Project map

```
pic/background.ai              original illustration (source of truth for the level)
scripts/assets/                .ai → web assets + cliff/coin data
assets/forest/                 exported background and sprites
src/core/forestRunner.js       game rules (pure, tested)
src/core/forestLevels.js       level specs and breath scripts
src/animation/forestEngine.js  canvas renderer, camera, particles
src/components/                React pages (ForestRunnerStage, NavDrawer, …)
src/lib/micBreath.js           microphone breath detector
server/                        Express API for sessions
tests/                         node:test suites
```

## License

© 2020–2026 Jie (Fia) Yin. **All rights reserved.** This repository is public so the work can be viewed and evaluated. The code, illustrations, 3D models, sketches and design documents may not be copied, reused or redistributed without written permission. See [LICENSE](LICENSE).
