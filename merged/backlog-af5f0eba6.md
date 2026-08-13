# Consensus Player — Accessibility Fix Backlog (`af5f0eba6`)

**Demo:** “Dylan Standard personalized with tours” — [play.goconsensus.com/af5f0eba6](https://play.goconsensus.com/af5f0eba6)

**Sources**
- Claude — `consensus-player-a11y-audit-af5f0eba6-by-team.md`
- Cursor — live Playwright + axe-core run (identity → opt-in → topic rating), plus independent contrast and hit-target measurement

**Pages:** A Identity · B Opt-In modal · C Topic Rating · D Interactive Product Tour (cross-origin iframe)

**Coverage note.** Cursor reached Identity, Opt-In, and Topic Rating. The product tour sits behind the rating gate and inside a cross-origin iframe, so Claude’s tour findings (D) remain the only evidence for that surface. One earlier run also hit a “This demo has expired” state, so re-verify before ticketing tour items.

---

## P0 — Hotfixes

| ID | Finding | Sev | Owner | Pages | Verified by |
|---|---|---|---|---|---|
| AF-P0-1 | **Whole demo theme is low-contrast grey — systematic: 14/18 Page A styles fail (78%).** Tokens: `rgb(169,169,169)` on `#F0F0F0` = **2.06:1**; white on grey = **2.35:1**. Page C: 6/20 fail. Cursor samples match. | Critical | Design + Eng | A, C | **Claude systematic + Cursor** |
| AF-P0-2 | **Topic-rating checkboxes render 0×0 and are skipped by Tab.** All 6 inputs (2 topics × 3 ratings) return width/height 0 with `tabIndex=0` and no accessible name. Rating is required to continue → keyboard users are hard-blocked. | Critical | Design + Eng | C | **Cursor + Claude** |
| AF-P0-3 | **Rating controls are checkboxes implementing radio behavior** — 3 inputs share one `name` per topic, with no `radiogroup`/`radio` semantics. | Critical | Design + Eng | C | **Cursor + Claude** |
| AF-P0-4 | **Tour close (X) does not respond to clicks** — strands the visitor inside the tour. | Serious | Engineering | D | Claude only |

---

## P1 — Shared components

| ID | Finding | Sev | Owner | Pages | Verified by |
|---|---|---|---|---|---|
| AF-P1-1 | **Opt-In toggle is 0×0 and unnamed** (`input[data-testid="optin toggle"]`) | Critical | Engineering | A, B | **Cursor + Claude** |
| AF-P1-2 | **Modal close (X) has no accessible name** (shared modal-header component) | Critical | Engineering | B | Cursor axe |
| AF-P1-3 | **Opt-In modal has no dialog accessible name; spinner progressbar unnamed** | Serious | Engineering | B | Cursor axe |
| AF-P1-4 | **Corrupted / duplicated legal disclaimer copy** — third confirmation across demos | Serious | Design + Eng | A, B | **Cursor + Claude** |
| AF-P1-5 | **Focus ring exists but both layers fail 3:1** (inner 1.71:1, outer 2.92:1) — worse than a754d887d; Opt-In still has zero focus style | Serious | Design + Eng | A, B, C | Claude systematic |

---

## P2 — Page-specific & Design decisions

| ID | Finding | Sev | Owner | Pages | Verified by |
|---|---|---|---|---|---|
| AF-P2-1 | **Tab advances the tour instead of moving focus** — non-standard keyboard pattern | Serious | Design | D | Claude only |
| AF-P2-2 | **Tour is a cross-origin iframe** — internal DOM/ARIA unauditable from the parent | Serious | Engineering | D | Both (methodology limit) |
| AF-P2-3 | **Missing landmarks / content outside regions**, duplicate `contentinfo` | Moderate | Engineering | A, B, C | Cursor axe |
| AF-P2-4 | **Heading order jumps** (`h5` “Opt In” with no preceding levels) | Moderate | Engineering | B | Cursor axe |
| AF-P2-5 | **Three “Select all” buttons share one accessible name** | Moderate | Design + Eng | C | Both |
| AF-P2-6 | **Document title is the demo’s internal name** | Minor | Engineering | A | Both |
| AF-P2-7 | **Required-field asterisks have no programmatic equivalent** | Moderate | Engineering | A | Claude |
| AF-P2-8 | **Duplicate “Test User” tab stop** on identity screen | Moderate | Engineering | A | Claude Tab walk |
| AF-P2-9 | **“Now Playing” tab at 4.15:1** — independent of grey theme | Moderate | Design + Eng | C | Claude systematic |

---

## Independent measurements (Cursor)

**Contrast** — sampled from live computed styles on the identity and topic screens:

| Control | Foreground | Background | Ratio | AA |
|---|---|---|---|---|
| I’m new here | `rgb(169,169,169)` | `rgb(240,240,240)` | 2.06:1 | fail |
| Contact me | `rgb(169,169,169)` | `rgb(240,240,240)` | 2.06:1 | fail |
| Select all (×3) | `rgb(169,169,169)` | `rgb(240,240,240)` | 2.06:1 | fail |
| Justin Ware | `rgb(255,255,255)` | `rgb(169,169,169)` | 2.35:1 | fail |
| Test User | `rgb(255,255,255)` | `rgb(169,169,169)` | 2.35:1 | fail |
| Continue | `rgb(255,255,255)` | `rgb(169,169,169)` | 2.35:1 | fail |

**Zero-size hit targets** — `getBoundingClientRect()` on live DOM:

| Element | Group | Size | Accessible name |
|---|---|---|---|
| `input[type=checkbox]` × 3 | `da4cbc5f…` (Feature 1) | 0×0 | none |
| `input[type=checkbox]` × 3 | `b26ca434…` (Feature 2) | 0×0 | none |
| `input[data-testid="optin toggle"]` | — | 0×0 | none |

---

## Suggested order

1. **AF-P0-1** theme/contrast config — visitor-facing beyond accessibility
2. **AF-P0-2 / AF-P0-3** rating hit targets + radio semantics (shared component, 3 demos)
3. **AF-P1-1 / AF-P1-2** Opt-In toggle and modal close labels
4. **AF-P0-4 / AF-P2-1** tour close button and Tab behavior (needs Design decision)
5. Structural: landmarks, heading order, titles, required-field indication

---

*Machine-readable copy: `backlog-af5f0eba6.json`. Merged view: [merged.html](../merged.html).*
