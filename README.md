# Consensus Player — Accessibility Audit Pack

WCAG 2.1 / 2.2 AA findings for the Consensus Demo Player, merged from Claude (manual) and Cursor (axe-core / Playwright), with screen grabs and Design vs Engineering backlogs.

## Open

- **[index.html](./index.html)** / **[merged.html](./merged.html)** — tabbed pack (Demos audited · Backlog · Shared component bugs)
- **[report.html](./report.html)** — Cursor-only report for the single-video demo

## Demos covered

- [Demo with single video](https://play.goconsensus.com/be2376b21)
- [Dylan Standard personalized with tours](https://play.goconsensus.com/af5f0eba6)

## Rebuild

```bash
AUDIT_OUT=. node scripts/build-merged-report.cjs
```

Requires the existing `results.json` / backlog files under this folder (and Playwright + axe-core on the machine for full re-audits).
