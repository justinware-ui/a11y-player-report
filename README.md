# Consensus Player — Accessibility Audit Pack

WCAG 2.1 / 2.2 AA findings for the Consensus Demo Player, merged from Claude (manual + systematic contrast/keyboard) and Cursor (axe-core / Playwright), with screen grabs and Design vs Engineering backlogs.

## Open

- **[index.html](./index.html)** / **[merged.html](./merged.html)** — 7-tab pack:
  1. **Overview** — exec summary, methodology, comparison, corrections, WCAG map, fix order
  2. **Contrast** — brand-orange / grey-theme root causes, measured fails, contrast tickets
  3. **Keyboard** — Tab walks, missing focus styles, keyboard-operability tickets
  4. **Demos audited** — per-demo evidence (axe, shots)
  5. **Backlog** — P0 → P1 → P2 tickets per demo
  6. **By owner** — Design / Engineering / Design+Eng lanes
  7. **Shared bugs** — cross-demo component defects
- **[report.html](./report.html)** — Cursor-only report for the single-video demo

## Demos covered

- [Demo with single video](https://play.goconsensus.com/be2376b21) — Cursor axe + guest lead-form
- [Dylan Standard personalized with tours](https://play.goconsensus.com/af5f0eba6) — Cursor axe + Claude by-team (systematic update)
- [Systematic contrast & keyboard](https://play.goconsensus.com/a754d887d) — Claude programmatic contrast (69 styles) + full Tab walks

## Headline shared findings

1. **Brand orange** (`rgb(252,104,57)`) fails AA text contrast nearly everywhere (2.57–2.93:1)
2. **Topic-rating 0×0 checkboxes** — confirmed on all three demos
3. **Opt-In toggle** unlabeled / no focus indicator
4. **Corrupted legal disclaimer** template — three-for-three

## Rebuild

```bash
AUDIT_OUT=. node scripts/build-merged-report.cjs
node scripts/copy-dist.cjs   # for Vercel
```

Requires the existing `results.json` / backlog files under this folder (and Playwright + axe-core on the machine for full re-audits).
