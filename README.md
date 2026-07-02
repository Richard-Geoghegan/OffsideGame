# OFFSIDE!

A 5-second mobile arcade game that teaches the offside rule through play, not explanation.

Bird's-eye pitch. You're the gold striker. The defenders hold a line. Tap to time your run — at that instant the pass fires, the offside line snaps visible, and the verdict fills the screen: **ONSIDE ✓** or **OFFSIDE ✗**.

## Run it

```sh
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # type-check + production build to dist/
```

## How it plays

- **One input.** Tap (mobile), click or spacebar (desktop). The striker jockeys forward on his own; you pick the moment the ball is played. Dawdle past 5 seconds and the pass comes anyway.
- **The law, as implemented** ([engine.ts](src/game/engine.ts)): the line is the **second-last opponent** — the goalkeeper counts as one. Level with the line is onside. Each verdict draws two lines: white for the defense, gold dashed for where *you* were when the ball was played.
- **The lesson is in the defenders**: lines push up, drop off, spring traps mid-round, and sometimes one laggard plays everyone onside. You learn it by being caught out.

## Modes

| Mode | Rules |
|------|-------|
| **Classic** | 10 rounds, rising difficulty, shareable score card |
| **Survival** | Endless, 3 lives, local best score |
| **Teach Me** | Unlocks after your first game; the line lingers with one label |

## Architecture

- [src/game/engine.ts](src/game/engine.ts) — all game logic; framework-agnostic, no DOM.
- [src/render/draw.ts](src/render/draw.ts) — canvas renderer (pitch, dots, lines, ball).
- [src/components/GameCanvas.tsx](src/components/GameCanvas.tsx) — owns the `requestAnimationFrame` loop; React never re-renders per frame.
- [src/game/audio.ts](src/game/audio.ts) — whistle, thwack, crowd, all synthesized with WebAudio. No asset files anywhere; everything is procedural and works offline after first load.
- React (App/Menu/Hud/Verdict/EndScreen) handles only screens and overlays, driven by engine events.

## Roadmap

- Free Kick module (swipe to pick a gap in the wall, tap to shoot)
- PWA manifest + service worker for installability
