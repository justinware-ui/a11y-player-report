# Consensus Player — WCAG 2.2 AA Accessibility Evaluation

**Scope tested:** `play.goconsensus.com/a754d887d` — pre-demo Topic Rating (survey) screen, the video Player experience (header nav, Plyr video controls, reaction bar), and sidebar navigation.
**Method:** Live DOM/accessibility-tree inspection, keyboard-only navigation, computed accessible-name checks, and contrast calculations against rendered styles. Not a full automated + AT (JAWS/NVDA/VoiceOver) pass — treat this as a strong first pass to scope engineering work, not a certification.

---

## Critical issues (blocks AT/keyboard users)

### 1. Topic-importance rating controls have no accessible name
**WCAG:** 1.1.1 Non-text Content, 4.1.2 Name, Role, Value (A)
On the pre-demo "What topics are most important to you?" screen, each topic row has three icon-only controls (star / check / X for Very/Somewhat/Not important). These are `<input type="checkbox">` wrapped in a `<label>` with **no text, no `aria-label`, no `title`**, and an `<svg>` icon with no `<title>`/`aria-hidden` handling. A screen reader announces only "checkbox, not checked" three times per topic, with no way to know which option is which.
**Fix:** Add `aria-label="Very important"` / `"Somewhat important"` / `"Not important"` (or visually-hidden text) to each control.

### 2. Same controls use `type="checkbox"` for mutually-exclusive (radio) behavior
**WCAG:** 4.1.2 Name, Role, Value (A)
All three inputs per topic share one `name` attribute and only one can be active at a time (confirmed via DOM inspection) — that's radio-button behavior implemented with checkboxes. AT users will hear "checkbox" and reasonably expect independent toggling, and won't get the "1 of 3" grouping semantics a `radiogroup`/`radio` pattern provides.
**Fix:** Convert to `role="radiogroup"` per topic row with three `role="radio"` (or native `<input type="radio">`) elements.

### 3. Header prev/next navigation arrows have no accessible name
**WCAG:** 1.1.1, 4.1.2 (A)
The `<` / `>` chapter navigation buttons in the player header (`data-testid="back arrow button"` / `"next arrow button"`) are icon-only with no `aria-label` or text. In this single-topic demo they're disabled, but in any multi-topic demo they'll be active and silent to AT users.
**Fix:** Add `aria-label="Previous topic"` / `aria-label="Next topic"`.

### 4. No visible keyboard focus indicator on several real controls
**WCAG:** 2.4.7 Focus Visible (AA), 2.4.11 Focus Not Obscured (Minimum) (AA — new in 2.2)
Computed styles show `outline: none` / `outline-width: 0px` with no replacement focus style on the header arrow buttons and — more importantly — on the Plyr **Seek** and **Volume** slider inputs. Keyboard users tabbing through the player cannot see where focus is on these controls. (Plyr's own Play/Pause/Mute buttons *do* render a dashed outline correctly — the gap is in the custom-wrapped elements.)
**Fix:** Ensure every focusable element has a visible `:focus-visible` style (outline or equivalent) that meets the 2.2 minimum focus-appearance guidance.

---

## Serious issues

### 5. No document/page structure — zero real headings
**WCAG:** 1.3.1 Info and Relationships (A), 2.4.6 Headings and Labels (AA)
Every heading (`h1`–`h4`) on the page belongs to the third-party OneTrust cookie dialog. Nothing in the actual Consensus experience — "Welcome!", "My demo," topic names, "What did we do?" slide titles — is marked up with heading elements. Screen reader users navigating by heading (a primary AT navigation method) find nothing.
**Fix:** Give the app a real heading hierarchy — e.g., `h1` for the demo/page title, `h2` for "Welcome!" / "My demo" panel, `h3` for individual topic names.

### 6. Meaningless document `<title>`
**WCAG:** 2.4.2 Page Titled (A)
The browser tab title is literally **"test"** — not descriptive of the demo or the presenter. Screen reader users rely on the title to identify the tab/window.
**Fix:** Set `document.title` dynamically to something like "Justin Ware's Demo — Consensus."

### 7. No skip link / bypass mechanism
**WCAG:** 2.4.1 Bypass Blocks (A)
There's a single `<main>` landmark, which helps, but there's no visible/programmatic skip link past the repeated header (logo, presenter card) straight to the survey/player content. Low severity here since the header is short, but worth adding given the cookie banner and header repeat on every screen transition.

### 8. In-video interactive-looking content is baked into the video pixels, not real UI
**WCAG:** 1.2.5 Audio Description (AA, prerecorded video), 2.1.1 Keyboard (A) by implication
The "How did it go?" feedback-survey overlay (1–5 rating scale, free-text box, Submit button) that appears mid-video is **not DOM/HTML** — clicking directly on it does nothing but pause/play the underlying video (confirmed via `elementFromPoint`, which resolves to the Plyr poster `<div>`, and via click testing). It's a recorded screenshot of a product screen, part of the video content. That's fine as a demo technique, but it means: a blind user gets *no* information about this on-screen UI unless the narrator describes it verbally, and captions (which only transcribe speech) won't cover it either.
**Fix:** Where product screenshots/mockups convey information not spoken aloud, add audio description (either narrated in the recording, or a supplementary described version) — this applies broadly to any Consensus demo video with silent on-screen UI callouts.

### 9. Captions are auto-generated only
**WCAG:** 1.2.2 Captions (Prerecorded) (A) — accuracy concern, not a strict fail
The subtitle track is `kind="subtitles"` sourced from an auto-generated (ASR) file, not human-reviewed. WCAG 1.2.2 requires *accurate* captions; auto-captions commonly mis-transcribe names, product terms, and numbers. Given this is sales/demo content where product terminology accuracy matters, this is worth a review pass rather than shipping raw ASR output.

---

## Moderate / minor issues

### 10. "Select all" column-header buttons are ambiguous out of visual context
**WCAG:** 2.5.3 Label in Name / 4.1.2 (A/AA)
The three "Select all" buttons above the Very/Somewhat/Not-important columns have identical accessible names ("Select all" ×3) with nothing distinguishing which column each belongs to when read out of visual context (e.g., in a screen reader's forms/buttons list).
**Fix:** `aria-label="Select all — Very important"`, etc.

### 11. Countdown timer has no programmatic exposure
**WCAG:** 4.1.3 Status Messages (AA) — minor, informational
The `-02:24` remaining-time indicator in the header is a plain `<div>` with no `aria-live`/`role="timer"`. Not a hard failure (the Plyr seek slider already conveys progress accessibly), but screen reader users get no equivalent read of "time remaining" the way sighted users do.

### 12. No full transcript offered
**WCAG:** not a strict AA requirement (transcripts are called out at 1.2.1/1.2.3, which is largely satisfied by captions here), but a best-practice gap
There's no static transcript link for the video content. A transcript benefits deaf-blind users (who can't use captions), users on unreliable connections, and anyone who wants to scan/search content — worth considering for the player, even though captions technically satisfy 1.2.2.

---

## What's working well
- The Plyr video player itself is a solid accessible baseline: Play/Pause, Mute, Settings, Subtitles, Quality, and Speed controls all expose correct accessible names and respond to keyboard, and Plyr's native controls render visible focus outlines.
- The in-player reaction bar ("I like this!", "Comment," "I'm Confused or Dislike") has clear, correctly-labelled accessible names despite icon-only visual presentation — this is the pattern the topic-rating controls and header arrows (issues #1 and #3) should be brought up to.
- Text contrast ratios sampled across the sidebar, survey screen, and player controls (grey secondary text, orange CTAs, control icons on scrims) all comfortably clear 4.5:1.
- `lang="en"` is set at the document level, and images carry `alt` text.
- The mid-video feedback modal pattern (when it *is* real DOM, e.g., a genuine survey step) correctly uses `role="dialog"` + `aria-modal="true"`.

---

## Suggested priority order for engineering
1. Accessible names for topic-rating controls and header nav arrows (#1, #3) — small, high-impact fixes.
2. Convert topic-rating checkboxes to a proper radio group (#2).
3. Visible focus styles on Seek/Volume sliders and header arrows (#4).
4. Real heading structure + dynamic page title (#5, #6).
5. Column-header button labels (#10).
6. Process fixes: human-reviewed captions and an audio-description pass for videos with silent on-screen UI (#8, #9).

Happy to turn any of these into Jira tickets, or go deeper on a specific flow (e.g., the "Adjust my selections" modal, Contact-me panel, or multi-topic navigation) if useful.
