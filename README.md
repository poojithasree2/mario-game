# Kaboom.js Platformer Demo

Simple HTML + JavaScript game built with [Kaboom.js](https://kaboomjs.com/).

## Features

- **Player**: a white square that can move left/right and **double jump**.
- **World**: two levels with green rectangular platforms (no sprites, just shapes).
- **Coins**: collect yellow squares to increase your score.
- **Enemies**: avoid green squares that patrol platforms horizontally.
- **Levels**: collect all coins in a level to advance to the next one.
- **Game Over**: when you hit an enemy or fall off, press **Tab or any key** to open a fresh game in a new browser tab.

## Files

- `index.html` – page layout and script includes.
- `game.js` – all Kaboom.js game logic.
- `prompt.txt` – original instructions for this mini‑project.

## How to Run

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox, etc.).
   - Either double‑click it in File Explorer, **or**
   - Use a simple dev server / Live Server extension and open `index.html`.
2. Use **Left/Right arrows or A/D** to move.
3. Use **Space/Up/W** to jump (double jump supported — press jump again in mid-air).
4. Collect all **yellow coins** to advance to the next level.
5. Avoid the **green enemy squares** — touching them ends the game.

## Game Over

When the game ends, a message will appear: **"Game Over / Press Tab or any key to continue"**. Pressing any key (including Tab) will open the game in a new browser tab so you can start fresh.

No build step or install is required; Kaboom is loaded from a CDN.

