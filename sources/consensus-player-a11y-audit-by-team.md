# Consensus Player — WCAG 2.2 AA Audit, by Team & Page

Companion to `consensus-player-a11y-audit.md` (narrative version). This version splits every finding into **Design** or **Engineering** ownership, itemized by severity and by the page/screen it occurs on, plus a keyboard/focus support matrix so you can see what's already reachable and operable vs. what isn't.

**Pages covered:**
- **A — Topic Rating screen** (pre-demo "What topics are most important to you?")
- **B — Video Player screen** (header nav, Plyr controls, reaction bar, sidebar)
- **C — Lead-Capture Gate modal** ("Adjust my selections" / "Tell me about yourself to continue")

**Severity key:** Critical (blocks AT/keyboard users or breaks submission for everyone) → Serious (major barrier, workaround exists) → Moderate (real friction, not a hard block) → Minor (best-practice / polish).

---

## Screenshots

Attached to the message that shares this report — a technical note: the screenshot tool saves to the browser's local machine, not to this file's workspace, so images are attached alongside this document rather than embedded inline in it. Match them to sections below by label:

| Label | Shows | Supports |
|---|---|---|
| **Page A — Topic Rating screen** | Full view of the "What topics are most important to you?" screen | Design/Eng Critical #1–2 (rating checkboxes), Moderate ("Select all" labels) |
| **Page A — rating icons close-up** | Zoomed star/check/X cells | The visual-grouping redesign item; also the zero-size hit-target finding (not visible in the screenshot itself, since it's a DOM/layout issue, but shows exactly which three icons are affected) |
| **Page B — Video Player screen** | Full player view: header timer/arrows, Plyr transport controls, reaction bar | Header arrow labeling, focus-ring gaps on Seek/Volume, reaction bar |
| **Page B — header nav arrow close-up** | Zoomed `<` icon in the player header | Missing accessible name on header chevrons |
| **Page B — reaction bar close-up** | Zoomed Like/Comment/Confused icons | Missing focus indicator on reaction bar buttons |
| **Page C — Lead-Capture modal, full form** | Complete "Hi, Tell me about yourself to continue" modal | Required-field indicators, heading/dialog-title gaps, overall layout |
| **Page C — stuck tooltip in action** | Info icon focused (visible ring) with the tooltip open and stuck over the Opt-In toggle | The Critical tooltip/toggle-blocking bug |
| **Page C — Opt-In row close-up** | Zoomed "Opt In" label, info icon, and toggle in their normal state | Opt-In toggle's missing accessible name |

---

## Correction from targeted follow-up pass

A follow-up keyboard pass caught a methodology gap in the original testing (programmatic `.focus()` calls don't trigger Chrome's `:focus-visible` styling, only real keyboard-initiated focus does) and, in re-verifying with actual Tab key presses, turned up a more severe version of one finding:

**Page A — topic-rating checkboxes (star/check/X) are skipped entirely by Tab navigation, not just missing a visible ring.** The `<input type="checkbox">` elements render at **0×0 pixels** (the visible star/check/X icon is a separate sibling element). Confirmed via `getBoundingClientRect()` and by tabbing from the adjacent info icon: focus lands on `<body>`, never touching the checkbox, even though `tabIndex="0"` is set. Chrome's real sequential Tab algorithm skips zero-dimension elements regardless of `tabIndex`. **This means keyboard-only users cannot rate topics at all** — not a degraded experience, a hard block. Mouse users are unaffected (clicking works fine). This upgrades Design/Engineering Critical finding #1/#2 below: the fix isn't just an `aria-label` and `role=radio` — the input's hit target needs real dimensions, or focus needs to move to a sibling that has them.

Everything else flagged with ⚠️ in the original matrix was re-verified with real Tab presses and is now resolved below (most turned out fine — Comments/Industry/Vertical/Company Size/Budget fields, the Opt-In info tooltip, and the "Z inc Partners" link family all show a clear focus ring; the reaction bar, "Select all" buttons, and Opt-In toggle are confirmed to have none).

---

## DESIGN — concerns requiring a visual, interaction, or content decision

### Critical

- **Page C — Opt-In tooltip.** The info-icon tooltip next to "Opt In" is the *only* explanation of why the form can't be submitted, and it's a hover/focus-only reveal. Recommend moving this off the tooltip pattern entirely — e.g. an always-visible helper line under the toggle — since gating an entire form behind a hover/focus disclosure is fragile by design, independent of the engineering bug it's currently causing (see Engineering list). **Fix:** Redesign as persistent inline copy, not a tooltip.

- **Page A — Topic-rating icons read as three independent toggles, not one choice, AND their hit targets are invisible/zero-size.** Star / check / X sit in separate cells with no visual connection (sighted users have no stronger cue than AT users that only one can be active) — and confirmed via live testing, the actual clickable/focusable input underneath each icon renders at 0×0 pixels, which is *why* keyboard users can't reach them at all (see Engineering Critical below). **Fix:** redesign as a connected/segmented control (e.g. pill group) where the real interactive element has real dimensions matching the visible icon — this solves the visual clarity problem and the keyboard-access problem in the same pass.

### Serious

- **Page A / B / C — No visible focus-ring spec for custom controls.** Native Plyr controls (Page B) already ship a focus treatment; header nav arrows (Page B), the seek/volume sliders (Page B), and likely other custom components inherit no visible focus state at all. **Fix:** Define one focus-ring token (color/offset/style) in the design system and apply it everywhere a custom (non-native) control exists.

- **Page A / B / C — Icon-only controls have no established labeling pattern.** Topic-rating icons (A), header chevrons (B), Opt-In toggle and dropdown carets (C) are all icon-only with nothing to anchor a text label to. The in-player reaction bar ("I like this!", "Comment," "I'm Confused or Dislike") already solves this well — **Fix:** standardize that pattern (visible or visually-hidden label shipped with every icon-only component) across the uikit rather than patching one-by-one.

- **Page C — Lead-capture modal has no heading hierarchy or dialog title.** "Hi, Tell me about yourself to continue" is styled like a heading but isn't one, and the dialog itself has no accessible name. **Fix:** Confirm the intended heading structure for modals (dialog title → section headings → field groups) and apply consistently — this also resolves the page-level heading gaps on Pages A and B (see below).

### Moderate

- **Page A / B — No real heading structure anywhere in the app.** Every actual heading element on these pages belongs to the third-party cookie-consent widget; "Welcome!", "My demo," topic names, and slide titles ("What did we do?") are all unmarked text. **Fix:** Define `h1`–`h3` usage across the player (e.g. `h1` demo title, `h2` panel headings like "Welcome!"/"My demo," `h3` topic/slide names).

- **Page A — Required-field convention is purely visual.** The asterisk on "First name*" etc. is CSS-generated, not real text — a system-wide decision is needed (keep `*` but pair with a "* Required" legend, or move required/optional into the label copy itself) since this will recur in every Consensus form, not just this one.

- **Page C — Country/State dropdown toggles and the legal disclaimer need a copy pass.** Both dropdown-expand buttons currently get the same generic name; the legitimate-interest disclaimer text is corrupted/duplicated placeholder-looking copy. **Fix:** brand voice / content sign-off on replacement copy, not an engineering guess.

### Minor

- **Page B — No transcript offered alongside captions.** Not a strict AA requirement here (captions satisfy 1.2.2), but worth a design call on whether a transcript link belongs in the player chrome for deaf-blind users and searchability.

- **Page B — In-video "How did it go?" survey screenshot has no audio description.** The mid-video product-mockup overlay is part of the recorded video, not real UI. Where a demo video shows on-screen UI that isn't narrated aloud, blind users get nothing. **Fix:** a production guideline (script demo narration to describe what's on screen, or budget for described versions) rather than a one-off fix.

---

## ENGINEERING — concerns fixable in code without a new design decision

### Critical

- **Page C — Opt-In tooltip gets stuck open and blocks the toggle underneath it, breaking form submission for everyone.** Confirmed via `elementFromPoint`: once the tooltip is triggered (by Tab or click), it never dismisses (not on Escape, blur, or outside click), and the DOM element sitting at the toggle's coordinates becomes the tooltip overlay itself — the toggle is literally unclickable. Since "Continue" stays disabled until Opt-In is checked, this is a full dead-end. **Fix:** dismiss tooltip on blur/Escape/outside-click; fix z-index/hit-testing so it never captures pointer events over the control it's attached to. *(Ship this as a hotfix regardless of the rest of this list — it's a functional bug, not just an a11y gap.)*

- **Page A — Topic-rating checkboxes (star/check/X) are unreachable via keyboard, not just unlabeled.** Confirmed via `getBoundingClientRect()`: the actual `<input type="checkbox">` elements render at **0×0 pixels**, and confirmed via real Tab-key testing that Chrome's sequential focus navigation skips them entirely — tabbing from the adjacent info icon lands on `<body>`, never touching the checkbox, despite `tabIndex="0"`. **This is a hard block, not a degraded experience: keyboard-only users cannot rate topics at all.** On top of that, the same inputs have no accessible name (no text, `aria-label`, or `title`; the `<svg>` icons have no `<title>`), so even a screen-reader user who reached them via touch/switch access would hear only "checkbox, not checked." **Fix (in order):** (1) give the input real dimensions matching its visible icon so it re-enters the Tab sequence, (2) add `aria-label="Very important"` / `"Somewhat important"` / `"Not important"`.

- **Page A — Same controls are `type="checkbox"` implementing radio (mutually-exclusive) behavior.** All three per topic share one `name` and only one can be active, but there's no `radiogroup`/`radio` semantics. **Fix:** convert to `role="radiogroup"` + `role="radio"` (or native `<input type="radio">`) — doing this alongside the fix above (real dimensions) resolves both issues together.

- **Page B — Header prev/next chevron buttons have no accessible name.** `data-testid="back arrow button"` / `"next arrow button"` are icon-only with no `aria-label`. Disabled in this single-topic demo, but will be silent-but-active in any multi-topic demo. **Fix:** `aria-label="Previous topic"` / `"Next topic"`.

- **Page C — Opt-In toggle has no accessible name.** Real `<input type="checkbox">`, but the "Opt In" text is a sibling `<span>`, and the checkbox sits in an *empty* `<label>`. **Fix:** `<label for="optIn">Opt In</label>` or `aria-labelledby`.

### Serious

- **Page B — No visible focus indicator on header arrows or on the Seek/Volume sliders.** Computed styles show `outline: none` / `0px` with no replacement. **Fix:** add a visible `:focus-visible` style (can reuse the design-system token once Design specs it — see Design list).

- **Page A / B / C — Meaningless `<title>` and missing heading markup.** Document title is literally "test"; no real `h1`–`h4` exist anywhere in the app. **Fix:** set `document.title` dynamically (e.g. "Justin Ware's Demo — Consensus"); wire up heading elements once Design confirms hierarchy.

- **Page C — Required fields have no programmatic indication.** Confirmed on all 9 marked-required fields (First/Last name, Email, Confirm Email, Phone, Organization, Country, State): no `required` attribute, no `aria-required`. **Fix:** add `aria-required="true"` (or `required`) to each.

- **Page C — Modal opens with no focus movement and no accessible name.** `role="dialog"` + `aria-modal="true"` are correctly present, and focus *is* trapped once you're inside (confirmed by tabbing through all fields and back to the top) — but on open, focus stays on `<body>`, and there's no `aria-labelledby`. **Fix:** move focus to the first field (or a heading) on open; add `aria-labelledby` pointing to the dialog's title text once Design confirms it's a real heading.

### Serious (new this pass)

- **Page C — Modal close (X) button has no accessible name.** Found while re-verifying the Contact-me and lead-capture dialogs: the close button is icon-only with no text and no `aria-label`. A screen reader announces an unlabeled button. **Fix:** `aria-label="Close"`.

### Moderate

- **Page A — Three "Select all" buttons share an identical accessible name.** No way to tell which importance-column each belongs to out of visual context. **Fix:** `aria-label="Select all — Very important"`, etc.

- **Page C — Country/State dropdown-toggle buttons share the generic accessible name "menu toggle."** **Fix:** `aria-label="Toggle country list"` / `"Toggle state list"` (pending Design copy sign-off).

- **Page A — No skip link past the repeated header.** Low severity given a short header, but there's no bypass mechanism past the presenter card into the content on each screen. **Fix:** add a skip link or `aria-label` on the `<main>` landmark.

- **Page B — Countdown timer (`-02:24`) has no programmatic exposure.** Plain `<div>`, no `aria-live`/`role="timer"`. Minor since the seek slider already conveys progress accessibly. **Fix:** optional `aria-live="off"` region or omit — low priority.

### Minor

- **Page B — Captions are auto-generated (ASR) only, not human-reviewed.** Accuracy risk for product terminology in sales content; a process/QA fix more than a code fix.

- **Page C — Corrupted/duplicated legal disclaimer text is a content bug** that happens to also get read in full by screen readers, wasting time. Needs a copy fix (Design/content-owned) but flagging here since it's likely a template/rendering bug worth a quick engineering look too.

---

## Keyboard & Focus Support Matrix

What's actually reachable via Tab, operable via keyboard, and *visibly* focused — by page. This is the "what do we need to support, and where" view.

### Page A — Topic Rating screen

| Control | Tab-reachable | Keyboard-operable | Focus visible | Notes |
|---|---|---|---|---|
| Info (ⓘ) tooltip icon | ✅ | ✅ (shows tooltip) | ✅ Confirmed | Clear focus box visible |
| Rating checkboxes (star/check/X) | ❌ **Confirmed skipped** | ❌ **Not reachable, therefore not operable via Tab** | ❌ N/A | Inputs render at 0×0px; Chrome's Tab algorithm skips them entirely. Tabbing from the info icon lands on `<body>`. Mouse click still works. **Hard keyboard block, not a styling gap.** |
| "Select all" / "Deselect all" links | ✅ | ✅ | ❌ Confirmed missing | Verified via real Tab — no ring, no box-shadow |
| "Start my demo" button | ✅ | ✅ | ✅ Confirmed | Clear focus ring visible in testing |

### Page B — Video Player screen

| Control | Tab-reachable | Keyboard-operable | Focus visible | Notes |
|---|---|---|---|---|
| Header back/next arrows | ✅ (`tabIndex=0`) | N/A — `disabled=true` in this single-topic demo | ❌ Confirmed missing | Will matter once a multi-topic demo enables them |
| Plyr Play/Pause, Mute | ✅ | ✅ | ✅ Confirmed | Native Plyr dashed outline, verified via real Tab |
| Plyr Settings / Subtitles / Quality / Speed | ✅ | ✅ | ✅ Confirmed | Same native Plyr treatment |
| Seek slider | ✅ (confirmed real dimensions, ~1748px wide) | ✅ | ❌ Confirmed missing | Verified via real Tab + screenshot — `outline:none`, 0px, no visible change on focus |
| Volume slider | ✅ (confirmed real dimensions) | ✅ | ⚠️ Ambiguous | Computed style shows `outline:none`, but a faint dashed pattern appears on the track when focused via real Tab — unclear if this is an intentional (if very low-contrast) focus cue or just Plyr's default track rendering. Worth a design review either way — it's not a clear, reliable indicator as-is. |
| Reaction bar (Like / Comment / Confused) | ✅ | ✅ | ❌ Confirmed missing | Verified via real Tab — only a hover/focus tooltip label appears, not a focus ring |
| "Contact me" button | ✅ | ✅ (opens panel) | ❌ Confirmed missing | Verified via real Tab |
| "Adjust my selections" link | ✅ | ✅ (returns to topic screen, or opens Page C modal post-completion) | ❌ Confirmed missing | Verified via real Tab |
| In-video "How did it go?" survey overlay | ❌ N/A | ❌ N/A | ❌ N/A | Not real DOM — baked into video pixels, confirmed via `elementFromPoint` resolving to the video poster `<div>`. Not keyboard-reachable because it isn't a control at all. |

### Page C — Lead-Capture Gate modal

| Control | Tab-reachable | Keyboard-operable | Focus visible | Notes |
|---|---|---|---|---|
| Modal on open | N/A | N/A | ❌ Confirmed missing | Focus stays on `<body>` when modal opens via the player's gate flow — nothing receives initial focus. (Note: when the *same* dialog component is opened via the header "Contact me" *card*, focus correctly lands on its close button — the inconsistency itself is worth a look.) |
| First name – Job Title text fields | ✅ | ✅ | ✅ Confirmed | Clear orange focus ring, verified on Email and First Name via real Tab |
| Comments / Industry / Vertical / Company Size / Budget | ✅ | ✅ | ✅ Confirmed | Verified via real Tab — same clear orange ring as the fields above (corrects the original "not verified" status) |
| Country / State dropdowns | ✅ (input) / `tabindex="-1"` (toggle chevron, by design) | ⚠️ Not verified | ⚠️ Not verified | Still open — didn't get to confirm whether arrow-key/typeahead on the input actually opens and navigates the option list |
| Opt-In info (ⓘ) tooltip trigger | ✅ | ✅ (shows tooltip) | ✅ Confirmed | Clear circular focus ring, verified via real Tab (corrects the original "not verified" status) |
| Opt-In toggle | ✅ (genuinely receives focus — confirmed via `activeElement`) | ✅ (until blocked by the stuck tooltip bug) | ❌ Confirmed missing | Verified via real Tab: focus lands on the toggle with zero visible indicator. Separately, the stuck-tooltip bug (Critical, above) can block interaction entirely regardless of focus visibility. |
| Continue button | ✅ (once enabled) | ✅ (correctly disabled via native `disabled` until form valid) | ⚠️ Not verified | Didn't reach a state with the button enabled during this pass — disabled-state exposure to AT is confirmed good |
| Privacy Policy / Terms / Partners links | ✅ | ✅ | ✅ Confirmed | Browser-default blue focus box, verified via real Tab. Tab from the last link correctly wraps back to First Name — **focus trap confirmed working** |
| Modal close (X) button | ✅ | ✅ | ⚠️ Not verified | New finding this pass: the close button has **no accessible name** (no text, no `aria-label`) — a screen reader announces an unlabeled button |

**Legend:** ✅ Confirmed working · ❌ Confirmed broken/missing · ⚠️ Genuinely not yet verified — flagged rather than guessed.

---

## Suggested next steps
1. Hotfix the stuck Opt-In tooltip (Page C, Engineering-Critical) — independent of everything else here.
2. Knock out the four accessible-name gaps (Design pattern + Engineering `aria-label`s) on Pages A, B, and C together, since they're the same class of fix.
3. Fill in the "⚠️ Not verified" cells above with a quick focused pass (mostly focus-ring checks) — I can do this live if useful.
4. Loop Design in on the tooltip pattern, radio-group redesign, and required-field convention before those tickets get written, since the engineering fix depends on the decision.
