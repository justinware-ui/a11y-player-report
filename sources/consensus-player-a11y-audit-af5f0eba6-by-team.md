# Consensus Player — WCAG 2.2 AA Audit, by Team & Page
**URL tested:** `play.goconsensus.com/af5f0eba6` ("Dylan Standard personalized with tours")

Companion to the by-team reports for `a754d887d` and `be2376b21`. Same format: every finding split into **Design** or **Engineering** ownership, itemized by severity, grouped by page.

**Pages covered:**
- **A — Identity screen** ("Hi, I'm Justin. Tell me who you are to get started.")
- **B — Opt-In consent modal**
- **C — Topic Rating screen** ("Welcome, Test. What topics are most important to you?")
- **D — Interactive Product Tour** ("Dynamic Tours" — a click-through walkthrough of a real product screen, rendered in a cross-origin iframe titled "Dynamic tour")

This demo introduced a new content type not seen in the first two audits: instead of (or alongside) video, "topics" here launch **interactive product tours** — a spotlight-style walkthrough over what looks like a live rendering of the actual Consensus "ReachSuite" product UI. This surface is embedded via iframe, which limits how deep a DOM-level audit can go from outside it; findings below note where that limit applies.

**Severity key:** Critical (blocks AT/keyboard users or breaks submission for everyone) → Serious (major barrier, workaround exists) → Moderate (real friction, not a hard block) → Minor (best-practice / polish).

---

## Screenshots

Attached to the message that shares this report (same technical note as before: the tool saves to the browser's local machine, not this file's workspace, so images are attached rather than embedded inline).

| Label | Shows | Supports |
|---|---|---|
| **Page A — Identity screen** | Full "who are you" screen, showing the greyscale theme and low-contrast "I'm new here" button | Design/Eng Critical contrast finding |
| **Page B — Opt-In modal** | Full consent modal | Confirms the same modal pattern as `be2376b21` |
| **Page C — Topic Rating screen** | Full "Feature 1 / Feature 2" rating screen | Confirms greyscale theme extends throughout; rating-checkbox findings |
| **Page D — Tour intro screen** | The "Check this out! Let's go!" launch modal over the ReachSuite product UI | Tour-content findings below |

---

## DESIGN — concerns requiring a visual, interaction, or content decision

### Critical

- **Page A / C — This demo's entire theme renders in low-contrast grey instead of proper brand colors.** Confirmed via computed style: the "I'm new here" button (and matching elements throughout — checkmarks, avatar, "Start my demo" button) render at `rgb(169,169,169)` text/border on a `rgb(240,240,240)` background — a measured contrast ratio of **2.06:1**, well under the 4.5:1 (normal text) and 3:1 (UI component boundary) thresholds. This isn't a filter or an accessibility setting — the actual color values are grey. Every other demo audited so far renders in vivid orange/brand colors; this one appears to have lost its theme configuration entirely. **Fix:** this is likely a data/config issue (a demo missing its brand theme assignment) rather than a code-level bug — worth checking whether this demo was set up without a theme, or whether a theming service call is silently failing. Either way, the underlying color tokens need a contrast-safe fallback so a themeless demo doesn't ship at 2:1 contrast.

### Serious

- **Page D — The tour's close button doesn't visibly respond to clicks.** Clicking the top-right (X) twice did not dismiss the tour overlay in testing. Worth a design/QA look at whether this is a hit-target sizing issue, a z-index conflict, or a genuine functional bug — either way it currently strands the visitor inside the tour with no obvious way out.

- **Page D — Tab key appears to advance the tour to its next step instead of moving keyboard focus.** Observed directly: pressing Tab while a tour step's spotlight was showing moved the spotlight to a *different* UI element rather than shifting keyboard focus in the conventional sense. If intentional, this is a non-standard keyboard pattern that will surprise both keyboard-only users (who lose the ability to Tab through the underlying real page while a tour is active) and screen reader users. Worth a deliberate design decision: either keep Tab as standard focus-navigation and add dedicated Next/Back buttons (visible ones already exist at the bottom: `< > ↻`), or make this repurposing intentional and clearly signal it (e.g. via visible instructions each step).

### Moderate

- **Page A / B — Corrupted, duplicated legal disclaimer copy — confirmed a third time.** Same garbled "This is a legal statement describing Opt-in & Legitimate Interest...gitimate Interesgitimate Interes..." text as the previous two demos. Three-for-three now; this is unambiguously a shared template bug, not demo-specific.

- **Page A — Required-field asterisk convention — same systemic gap, third confirmation.** (Carried over from the registration form on this identity path, which matches the `be2376b21` flow exactly.)

### What's working well
- **The tour iframe has a real, descriptive `title` attribute** ("Dynamic tour") — good practice for a screen reader user encountering it via the frames list, even though the tour's *internal* content couldn't be inspected from outside the iframe.
- **The tour includes visible Back/Next/Restart controls** (`< > ↻`) at the bottom of the screen — a real, persistent navigation affordance rather than relying solely on the spotlight advancing via click, which is a good baseline to build proper keyboard support on top of.

---

## ENGINEERING — concerns fixable in code without a new design decision

### Critical

- **Page A / C — Topic-rating checkboxes reproduce the exact 0×0 hit-target bug — confirmed a third time.** Both "Feature 1" and "Feature 2" rows on this demo show the identical `getBoundingClientRect()` zero-dimension result found on `a754d887d`, and Tab navigation skips them the same way. This is now confirmed across **three separate demos** — about as strong as evidence gets that this is a single shared player component, not per-demo content. Fix once at the component level (real hit-target dimensions matching the visible icon) and it resolves everywhere.

- **Page A — Low-contrast theme values need a code-level safety net.** Whatever produced the 2.06:1 grey theme on this demo, engineering should check whether the player has a minimum-contrast fallback when a theme/brand color fails to load or isn't configured — right now nothing prevents a demo from shipping with an unreadable UI.

### Serious

- **Page D — Tour close button non-responsive to click.** Two click attempts at the visible (X) location did not dismiss the tour. Worth checking the click handler/hit-target registration on that control specifically — possibly a z-index or event-propagation issue given the tour renders inside an iframe layered over the parent page.

- **Page D — Cross-origin iframe blocks any further DOM/ARIA audit of the tour's internal content from the parent page.** Not a fix in itself, but worth flagging to whoever owns the ReachSuite/tour-builder codebase: this audit could only verify the iframe's own `title` attribute and observe visual/keyboard behavior from outside. A proper accessibility pass on the tour experience itself needs to happen from inside that codebase (or with tooling that can reach into the iframe), since this audit's methodology couldn't reach it.

### Moderate

- **Page A / B — Corrupted legal disclaimer text is a rendering bug, not just a copy problem — confirmed a third time.** Same recommendation as the other two audits: look at the template/string-concatenation logic generating this text, independent of whatever the correct copy should say.

### Minor

- **Page A — Document title is the demo's internal name** ("Dylan Standard personalized with tours") rather than something end-visitor-appropriate — same low-priority gap as the other two demos.

---

## Keyboard & Focus Support Matrix

### Page A — Identity screen / Page C — Topic Rating screen

| Control | Tab-reachable | Keyboard-operable | Focus visible | Notes |
|---|---|---|---|---|
| "I'm new here" / "Justin Ware" / "Test User" buttons | ✅ | ✅ | ⚠️ Not verified | Same component as other demos; not independently re-verified here |
| Topic-rating checkboxes (Feature 1 / Feature 2) | ❌ **Confirmed skipped** | ❌ | ❌ N/A | Same 0×0 hit-target bug as `a754d887d`, confirmed via `getBoundingClientRect()` |
| "Start my demo" button | ✅ | ✅ | ⚠️ Not verified | Also affected by the low-contrast theme bug — text is barely visible against its own background even when focused |

### Page B — Opt-In modal

| Control | Tab-reachable | Keyboard-operable | Focus visible | Notes |
|---|---|---|---|---|
| Modal on open | N/A | N/A | ✅ Confirmed working | Same pattern as `be2376b21` — focus lands on the modal's close button |
| Close (X) / "Opt-In and Continue" | ✅ | ✅ | ⚠️ Not verified | Same shared modal-header component flagged as unlabeled in prior audits — likely reproduces here, not independently re-verified |

### Page D — Interactive Product Tour

| Control | Tab-reachable | Keyboard-operable | Focus visible | Notes |
|---|---|---|---|---|
| "Let's go!" button | ⚠️ Not verified (inside cross-origin iframe) | ✅ (confirmed via mouse click) | ⚠️ Not verified | Cross-origin iframe blocks JS-level inspection; only visual/behavioral testing was possible |
| Tab key during an active tour step | ✅ (reaches *something*) | ⚠️ **Unexpected behavior** | N/A | Tab appeared to advance the tour's spotlight to a different element rather than doing conventional focus navigation — see Design/Engineering Serious findings |
| Close (X) button | ⚠️ Not verified | ❌ **Did not respond to clicks in testing** | ⚠️ Not verified | Two click attempts failed to dismiss the tour |
| Bottom nav controls (`< > ↻`) | ⚠️ Not verified | ⚠️ Not verified | ⚠️ Not verified | Visible and present, but not independently keyboard-tested this pass |

**Legend:** ✅ Confirmed working · ❌ Confirmed broken/missing · ⚠️ Genuinely not yet verified — flagged rather than guessed.

---

## Suggested next steps
1. **Investigate the theme/contrast failure on Page A/C** — this is the most severe and most novel finding here; a themeless or broken-theme demo shipping at 2.06:1 contrast is a real visitor-facing problem beyond accessibility compliance.
2. **Fix the tour close button** — a non-responsive exit control is a hard usability block, independent of accessibility framing.
3. **Decide the Tab-key behavior in tours deliberately** (Design) and implement accordingly (Engineering) — right now it's unclear whether the current behavior is intentional.
4. **Roll the three now-triple-confirmed shared-component bugs** (checkbox hit target, corrupted legal text, required-field indicators) into whatever fix work is already planned from the first two audits — this demo adds no new evidence needed, just further confirmation.
5. Consider whether the tour/iframe content needs its own dedicated accessibility audit conducted from inside that codebase, since this methodology hit a hard boundary at the iframe's origin.
