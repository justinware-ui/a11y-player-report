# Consensus Player — Accessibility Fix Backlog

Unified backlog from Claude’s WCAG 2.2 AA audits + Cursor’s live axe pass on
[`play.goconsensus.com/be2376b21`](https://play.goconsensus.com/be2376b21).

**Sources**
- Claude — `consensus-player-a11y-audit-by-team.md` (Pages A/B/C, Design vs Eng)
- Claude — `consensus-player-a11y-audit-be2376b21.md` (this URL: identity / Opt-In / registration)
- Cursor — live Playwright + axe-core run (cover → Opt-In → video player) with screen grabs

**How to use**
1. Start with **P0 Hotfixes** — functional or hard keyboard blocks.
2. Then **Shared-component** items — one fix clears multiple screens/demos.
3. Then page-specific Design decisions before the dependent Eng tickets.
4. Open the merged report for evidence: [http://localhost:4318/merged.html](http://localhost:4318/merged.html)

---

## Severity & ownership key

| Severity | Meaning |
|---|---|
| Critical | Blocks AT/keyboard users, or breaks submission for everyone |
| Serious | Major barrier; workaround may exist |
| Moderate | Real friction, not a hard block |
| Minor | Best practice / polish |

| Owner | Means |
|---|---|
| Engineering | Fixable in code without a new design decision |
| Design | Needs visual / interaction / content decision first |
| Design + Engineering | Decision + implementation |

| Page | Screen |
|---|---|
| A | Topic Rating (“What topics are most important to you?”) |
| B | Video Player (header, Plyr, reactions, sidebar) |
| C | Lead-Capture / Opt-In / registration gate |
| Cover | Identity picker on this URL (`be2376b21`) |
| Shared | Cross-demo / shared UIKit component |

---

## P0 — Ship first (hotfixes)

| ID | Finding | Sev | Owner | Pages | Status | Evidence |
|---|---|---|---|---|---|---|
| P0-1 | **Opt-In tooltip stuck open blocks the toggle** — after Tab/click, tooltip never dismisses and captures pointer events over the toggle; Continue stays disabled → full dead-end for everyone | Critical | Engineering | C | Open | Claude by-team (Eng Critical); no Cursor shot (interaction bug) |
| P0-2 | **Topic-rating checkboxes are 0×0px and skipped by Tab** — keyboard users cannot rate topics at all | Critical | Design + Engineering | A | Open | Claude by-team (confirmed via `getBoundingClientRect` + real Tab) |
| P0-3 | **Topic-rating inputs are checkboxes implementing radio behavior** — need `radiogroup`/`radio` (or native radios) with real hit targets | Critical | Design + Engineering | A | Open | Claude by-team |
| P0-4 | **Modal close (X) has no accessible name** — shared `src-shared-ui-modal-header--close` component | Critical | Engineering | C, Cover, Shared | Open | Claude both audits; Cursor shot `opt-in-button-name-1.png` |

---

## P1 — Shared-component / cross-demo

| ID | Finding | Sev | Owner | Pages | Suggested fix | Evidence |
|---|---|---|---|---|---|---|
| P1-1 | **Required fields lack `required` / `aria-required`** despite visual `*` | Serious | Engineering (+ Design convention) | C, Cover, Shared | Add `aria-required="true"` (or `required`) at the form-field component | Claude both audits |
| P1-2 | **Opt-In toggle has no accessible name** — empty `<label>`, “Opt In” is a sibling span | Critical | Engineering | C, Cover | `<label for=…>Opt In</label>` or `aria-labelledby` | Claude by-team + be2376; Cursor axe `label` on `data-testid="optin toggle"` |
| P1-3 | **Corrupted / duplicated legal disclaimer text** (“…gitimate Interes…”) | Serious | Design (content) + Engineering | Cover, Shared | Fix source copy / template render once | Claude both; Cursor `cover-*-color-contrast-*.png` + full covers |
| P1-4 | **Icon-only controls lack a labeling pattern** | Serious | Design + Engineering | A, B, C, Shared | Standardize visible or visually-hidden labels (reaction bar is the good reference) | Claude by-team Design Serious |
| P1-5 | **No focus-ring token for custom controls** | Serious | Design + Engineering | A, B, C, Shared | Define one `:focus-visible` token; apply to header arrows, seek/volume, reactions, Opt-In toggle | Claude keyboard matrix |

---

## P2 — Page-specific Engineering

| ID | Finding | Sev | Owner | Page | Suggested fix | Evidence |
|---|---|---|---|---|---|---|
| P2-1 | **Opt-In / consent modal missing dialog semantics** on this URL’s Opt-In surface (`role="dialog"` + `aria-modal` + named title) | Serious | Engineering | Cover / C | Add dialog roles + `aria-labelledby` on a real heading | Claude be2376; Cursor `opt-in-aria-dialog-name-1.png` |
| P2-2 | **ARIA progressbar (button spinner) has no accessible name** | Serious | Engineering | Cover / C | `aria-label="Loading"` (or hide decorative spinner from AT) | Cursor `opt-in-aria-progressbar-name-1.png` |
| P2-3 | **Custom Country dropdown lacks combobox/listbox semantics** | Critical | Engineering | C / Cover | ARIA 1.2 combobox pattern | Claude be2376 (DOM inspection) |
| P2-4 | **Header prev/next chevrons unlabeled** | Critical | Engineering | B | `aria-label="Previous topic"` / `"Next topic"` | Claude by-team |
| P2-5 | **Lead-capture modal: no initial focus move; missing `aria-labelledby`** (trap itself works) | Serious | Engineering | C | Focus first field or title on open; wire `aria-labelledby` | Claude by-team |
| P2-6 | **“Select all” buttons share identical accessible names** | Moderate | Engineering | A | `aria-label="Select all — Very important"` etc. | Claude by-team |
| P2-7 | **Country/State toggle buttons named generically (“menu toggle”)** | Moderate | Engineering | C | Distinct `aria-label`s pending Design copy | Claude by-team |
| P2-8 | **Document / demo `<title>` is generic** (“New accessibility test” / “test”) | Moderate | Engineering | All | Dynamic meaningful title | Claude both; Cursor cover states |
| P2-9 | **Missing / weak landmark structure** (`main`, regions) | Moderate | Engineering | Cover, B | Add `<main>` and labeled regions | Cursor axe `region`, `landmark-one-main` |
| P2-10 | **Color contrast failures** (legal/copyright, Invite, JW chip) | Serious | Design + Engineering | Cover, B | Raise contrast to ≥4.5:1 (or 3:1 for large text) | Cursor `*-color-contrast-*.png` |
| P2-11 | **Heading order jump** (`h5` “Opt In” without higher headings) | Moderate | Engineering | Cover | Use real `h2`/`h3` once Design confirms hierarchy | Cursor opt-in `heading-order` |
| P2-12 | **Duplicate `contentinfo` landmarks** | Moderate | Engineering | Cover | One footer / unique accessible names | Cursor opt-in landmarks |

---

## P2 — Page-specific Design (decide before Eng)

| ID | Finding | Sev | Owner | Page | Decision needed |
|---|---|---|---|---|---|
| D-1 | **Opt-In explanation only in hover/focus tooltip** — fragile; also root of P0-1 | Critical | Design | C | Replace with always-visible helper copy under the toggle |
| D-2 | **Topic-rating icons look like three independent toggles** | Critical | Design | A | Redesign as connected segmented / pill control with real hit area |
| D-3 | **Required-field convention is visual-only (`*`)** | Moderate | Design | C, Shared | Legend vs inline “required” copy — system-wide |
| D-4 | **Heading hierarchy for player + modals** | Moderate | Design | A, B, C | Define `h1`–`h3` usage (demo title, panels, topics) |
| D-5 | **Legal disclaimer / Country-State toggle copy** | Moderate | Design (content) | Cover, C | Brand voice sign-off on replacement strings |
| D-6 | **Transcript alongside captions?** | Minor | Design | B | Product call — not strict AA if captions exist |
| D-7 | **In-video UI overlays need narration / AD guideline** | Minor | Design / Production | B | Script guideline, not a one-off code fix |

---

## Cursor-only inventory (axe, this URL)

Useful for QA verification after fixes; mostly overlaps P1/P2 above.

| Rule | Impact | States | Tied to |
|---|---|---|---|
| `label` | Critical | cover-cookies, cover, opt-in | P1-2 |
| `button-name` | Critical | opt-in | P0-4 |
| `aria-dialog-name` | Serious | opt-in | P2-1 |
| `aria-progressbar-name` | Serious | opt-in | P2-2 |
| `color-contrast` | Serious | all four states | P2-10 |
| `region` / `landmark-one-main` / duplicate contentinfo | Moderate | cover, opt-in, player | P2-9, P2-12 |
| `heading-order` | Moderate | opt-in | P2-11 |
| Incomplete: `video-caption`, `no-autoplay-audio` | — | player | Manual captions / autoplay review |

---

## Suggested sprint order

1. **P0-1** stuck tooltip (hotfix — blocks everyone)
2. **P0-4 + P1-2 + P1-1** — close button name, Opt-In label, required fields (shared components)
3. **Design sync on D-1, D-2, D-3, D-4** before A/C redesign tickets
4. **P0-2 / P0-3** topic-rating keyboard + radio semantics (after D-2)
5. **P2-3** Country combobox; **P2-4 / P1-5** player chrome names + focus rings
6. **P1-3 / D-5** legal copy; **P2-10** contrast; landmarks / titles polish

---

## Open / not verified on this URL

- Guest “I’m new here” → full registration → player path (sharing restricted)
- Country dropdown keyboard operability (arrow keys / typeahead)
- Topic Rating screen on `be2376b21` specifically (Claude confirmed on other demo as shared component)
- Human caption QA vs ASR-only tracks

---

*Generated for the merged a11y pack. Machine-readable copy: `backlog.json`.*
