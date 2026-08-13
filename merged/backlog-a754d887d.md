# Consensus Player — Accessibility Fix Backlog (`a754d887d`)

Systematic color/contrast + keyboard pass on
[`play.goconsensus.com/a754d887d`](https://play.goconsensus.com/a754d887d).

**Source:** `sources/consensus-player-a11y-audit-a754d887d-color-contrast-keyboard.md`

**Method:** programmatic WCAG luminance on every distinct text style; real Tab walk with focus checked via outline, box-shadow, and border-color.

## P0

| ID | Finding | Sev | Owner |
|---|---|---|---|
| A7-P0-1 | **Brand orange fails AA text contrast everywhere** (18/69 styles; 2.57–2.93:1) | Critical | Design + Eng |
| A7-P0-2 | **Topic-rating checkboxes 0×0 / Tab-skipped** — reconfirmed | Critical | Design + Eng |

## P1

| ID | Finding | Sev | Owner |
|---|---|---|---|
| A7-P1-1 | Reaction-bar focus ring exists but **1.34–1.76:1** (fails 3:1) | Serious | Design + Eng |
| A7-P1-2 | Seek + Volume sliders — **no** focus indicator | Serious | Engineering |
| A7-P1-3 | Opt-In toggle + Page A Contact me / Select all — **no** focus style | Critical | Engineering |
| A7-P1-4 | Orange focus ring outer layer alone keeps 3:1 — Design confirm | Moderate | Design |

## P2

| ID | Finding | Sev | Owner |
|---|---|---|---|
| A7-P2-1 | Unused Plyr rewind/FF controls 0×0 in DOM | Moderate | Engineering |
| A7-P2-2 | Country/State missing combobox / aria-expanded | Moderate | Engineering |
| A7-COR-1 | Corrections: reaction / Contact me / Adjust my selections **do** have box-shadow rings; fields use **border-color** | Minor | Engineering |
