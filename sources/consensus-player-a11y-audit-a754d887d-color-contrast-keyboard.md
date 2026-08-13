# Consensus Player — Systematic Color/Contrast & Keyboard Navigation Audit

URL tested: `play.goconsensus.com/a754d887d`

Method: This is a systematic pass, not a spot-check. Contrast was measured programmatically: every distinct text style (by color + effective background + font-size + weight) rendered on each page was enumerated and checked against its actual computed background color, using the WCAG relative-luminance formula and the correct threshold (4.5:1 for normal text, 3:1 for large/bold text ≥18.66px bold or ≥24px regular). Keyboard navigation was walked stop-by-stop from page load using real Tab key presses (not simulated), logging every focus stop in order and checking for a visible indicator via three possible CSS mechanisms — outline, box-shadow, and border-color — since this app uses all three in different components. Two earlier findings from prior spot-checks turned out to be false negatives once box-shadow and border-color were included; those corrections are called out explicitly below and have been fixed in the by-team report as well.

## Part 1 — Color & Contrast (systematic)

### Headline finding: the brand orange itself fails contrast, everywhere it's used as text

Across all three pages tested, 69 distinct text styles were checked; 18 failed. Nearly every failure traces back to the same root cause: Consensus's brand orange, `rgb(252, 104, 57)`, does not have sufficient contrast against either white or the light-grey (`rgb(240, 240, 240)`) backgrounds it's most commonly placed on — in either direction (orange text on light background, or white text on an orange background).

| Combination | Ratio | Threshold | Result | Where it appears |
|---|---|---|---|---|
| White text on brand orange bg | 2.93:1 | 4.5:1 (3:1 if large) | Fail | "Hi," / "Tell me about yourself to continue" modal heading, "Continue" button, "Get in touch" button, "JW" avatar initials (32px — still fails even the relaxed 3:1 large-text threshold), "Rate all topics to continue" (disabled state) |
| Brand orange text on white bg | 2.93:1 | 4.5:1 | Fail | "Contact me," "Adjust my selections," "Z inc Privacy Policy," "Terms of Service," "Z inc Partners" |
| Brand orange text on light-grey bg | 2.57:1 | 4.5:1 | Fail | "Contact me" and "Select all" when rendered against the `#F0F0F0` panel background |

This is not a per-component bug — it's the core brand color itself. Every place it's used as text, or as a background under white text, fails WCAG AA. Recoloring or darkening this orange (or adding a bolder weight to push it into large-text territory, which only partially helps) is a design-system-level fix, not something individual components can solve on their own.

### Full failure list by page

#### Page A — Topic Rating screen (15 distinct styles checked, 4 failed)

| Text | Colors (fg/bg) | Ratio | Needed |
|---|---|---|---|
| "JW" avatar | white / orange | 2.93 | 3.0 |
| "Contact me" | orange / light-grey | 2.57 | 4.5 |
| "Select all" (×3) | orange / light-grey | 2.57 | 4.5 |
| "Rate all topics to continue" (disabled) | white / orange | 2.93 | 4.5 |

#### Page B — Video Player screen (18 distinct styles checked, 3 failed)

| Text | Colors (fg/bg) | Ratio | Needed |
|---|---|---|---|
| "JW" avatar | white / orange | 2.93 | 3.0 |
| "Contact me" | orange / white | 2.93 | 4.5 |
| "Adjust my selections" | orange / white | 2.93 | 4.5 |

#### Page C — Lead-Capture modal (36 distinct styles checked, 11 failed)

| Text | Colors (fg/bg) | Ratio | Needed |
|---|---|---|---|
| "JW" avatar | white / orange | 2.93 | 3.0 |
| "Get in touch" | white / orange | 2.93 | 4.5 |
| "Hi," | white / orange | 2.93 | 4.5 |
| "Tell me about yourself to continue" | white / orange | 2.93 | 4.5 |
| "Continue" | white / orange | 2.93 | 4.5 |
| "Adjust my selections" (×2 contexts) | orange / white, orange / light-grey | 2.93, 2.57 | 4.5 |
| "Contact me" | orange / light-grey | 2.57 | 4.5 |
| "Z inc Privacy Policy" | orange / white | 2.93 | 4.5 |
| "Terms of Service" | orange / white | 2.93 | 4.5 |
| "Z inc Partners" | orange / white | 2.93 | 4.5 |

(A note on the disabled-state buttons like "Rate all topics to continue": WCAG 1.4.3 doesn't explicitly exempt disabled controls, but common practice/interpretation treats inactive UI as out of scope since it conveys no actionable information at that moment. Flagging it here for completeness rather than asserting a hard violation.)

### Focus-indicator contrast (WCAG 1.4.11 / 2.4.11, new emphasis in 2.2)

Having a focus ring isn't the same as having a visible one. Two of the working focus indicators found in Part 2 were checked for their own contrast:

- The orange focus ring (used on "Start my demo," "Contact me," "Adjust my selections") is actually two stacked box-shadow layers — a lighter inner ring (`rgb(255,160,124)`, only 1.99:1 against white — would fail alone) and a darker outer ring (`rgb(224,94,52)`, 3.61:1 against white — passes). Because the outer, darker layer is what creates the visible edge against a light page background, the combined effect is likely adequate — but it's worth having Design confirm this is intentional layering rather than a happy accident, since the inner layer alone would not have been sufficient.
- The reaction bar's grey focus ring is confirmed too low-contrast to be reliably visible. Precisely modeling the compositing (the ring is `rgba(111,111,111,0.5)` sitting on a `rgba(0,0,0,0.35)` bar, which itself sits over the video frame) gives only 1.34:1 contrast against a light video frame and 1.76:1 against a dark one — both far under the 3:1 non-text/focus-indicator requirement. The ring technically exists (correcting the earlier "missing" claim), but it doesn't meet the bar for being reliably visible. This is now a confirmed finding, not an open question.

## Part 2 — Keyboard Navigation (systematic, sequential)

Every stop below was reached by pressing Tab from the previous one — this is the actual, complete Tab order, not a sample.

### Page A — Topic Rating screen (before rating; single "Survey" topic)

| # | Stop | Visible focus? | Mechanism |
|---|---|---|---|
| 1 | Cookie-preferences icon (bottom-left) | Yes | Browser default outline: auto |
| 2 | "Contact me" | No | — (outline, box-shadow, and border all inactive here) |
| 3–5 | "Select all" × 3 (one per rating column) | No | — |
| 6 | Info (ⓘ) tooltip icon | Yes | Browser default outline: auto |
| 7 | (none — lands on `<body>`) | N/A | The three rating checkboxes are skipped entirely — confirmed via this walkthrough, they render at 0×0px and Chrome's Tab algorithm passes over them regardless of tabIndex |
| 8 | (wraps back to stop 1) | — | — |

Once a rating is selected, "Start my demo" becomes reachable as the next stop after the info icon, and it does have a visible focus ring (a two-layer orange box-shadow).

### Page B — Video Player screen

| # | Stop | Visible focus? | Mechanism |
|---|---|---|---|
| 1–3 | Reaction bar (Like / Comment / Confused) | Yes — correction | Grey box-shadow ring (contrast against its backdrop not fully confirmed — see Part 1) |
| 4 | "Contact me" | Yes — correction | Two-layer orange box-shadow |
| 5 | "Adjust my selections" | Yes — correction | Two-layer orange box-shadow |
| 6 | (lands on `<body>`) | N/A | Plyr's default rewind/fast-forward buttons are present in the DOM (not disabled) but rendered at 0×0px since this control-bar layout doesn't use them — Chrome's Tab skips them the same way it skips the rating checkboxes |
| 7 | Cookie-preferences icon | Yes | Browser default outline |
| 8 | Play/Pause | Yes | Plyr's native dashed outline |
| 9 | Seek slider | No | Confirmed via all three mechanisms — outline: none, box-shadow: none, border-width: 0px regardless of color |
| 10 | Mute | Yes | Plyr native dashed outline |
| 11 | Volume slider | No | Same as Seek — genuinely no indicator available |
| 12 | Subtitles toggle | Yes | Plyr native dashed outline |
| 13 | Settings | Yes | Plyr native dashed outline |
| 14 | Fullscreen | Yes | Plyr native dashed outline |
| 15 | (wraps back to stop 1) | — | — |

**Correction from prior reports:** the reaction bar, "Contact me," and "Adjust my selections" were previously reported as having no visible focus indicator. That was a methodology gap — the earlier checks only inspected outline, and all three actually use box-shadow. They do have a focus ring. This has been corrected in the by-team report.

Note: the disabled header `</>` chapter-navigation arrows don't appear in this sequence at all, which is correct/expected behavior for genuinely disabled buttons (unlike the checkboxes and hidden Plyr controls, which are not disabled, just zero-size).

### Page C — Lead-Capture modal

| # | Stop | Visible focus? | Mechanism |
|---|---|---|---|
| 1–7 | First name, Last name, Email, Confirm Email, Phone, Organization, Job Title | Yes — correction | border-color changes to orange on focus (not outline or box-shadow — a third mechanism this app uses) |
| — | Comments, Industry, Vertical, Company Size, Budget | Yes | Same border-color mechanism, confirmed via real Tab in the earlier follow-up pass |
| — | Opt-In info (ⓘ) tooltip trigger | Yes | Circular orange ring |
| — | Country / State dropdown | Yes (on the input) | Border-color, same as other fields — and confirmed via aria-activedescendant/role="listbox"/role="option" that arrow-key navigation is properly exposed to screen readers, not just visually functional. Minor gaps: input lacks role="combobox" and aria-expanded. |
| — | Opt-In toggle | No | Confirmed via all three mechanisms on both the input and its visible sibling span — genuinely no focus style defined anywhere |
| — | Privacy Policy / Terms / Partners links | Yes | Browser-default focus box |
| — | (wraps back to First name — confirmed focus trap works) | — | — |

**Correction from prior reports:** the text fields (First name, Last name, Email, etc.) were correctly reported as having visible focus in the narrative report, but the mechanism was misattributed — it's border-color, not box-shadow or outline. This doesn't change any pass/fail conclusion, just the technical description of how it works, which matters if engineering goes looking for the CSS rule to replicate elsewhere (e.g., for the Opt-In toggle, which has none of the three).

## Summary of corrections to prior reports

| Finding | Previously reported | Corrected to |
|---|---|---|
| Reaction bar focus visibility | No visible indicator | Has a grey box-shadow ring (contrast against backdrop unconfirmed) |
| "Contact me" focus visibility | No visible indicator | Has a two-layer orange box-shadow ring |
| "Adjust my selections" focus visibility | No visible indicator | Has a two-layer orange box-shadow ring |
| Text field focus mechanism (Page C) | Described generically as "a clear ring" | Specifically border-color, not outline/box-shadow |

All other prior findings — Seek/Volume sliders (no indicator), Select-all buttons (no indicator), Opt-In toggle (no indicator), the 0×0 checkbox skip bug — were re-verified using the full three-mechanism check and stand exactly as previously reported.

## New findings from this pass

1. The brand orange color fails text contrast almost everywhere it's used — the most consequential and broadly-applicable finding across all audits so far (see Part 1).
2. Plyr's unused default rewind/fast-forward buttons are present-but-invisible (0×0, not disabled) and get silently skipped by Tab — a minor but real cleanup item (should be disabled or removed from the DOM, not just visually hidden).
3. The reaction bar's grey focus ring is confirmed too low-contrast to be reliably visible — precise compositing gives 1.34–1.76:1 against its backdrop depending on the video frame behind it, well under the 3:1 requirement. It exists (correcting the "missing" claim) but doesn't meet the visibility bar.
4. The orange focus ring's inner layer alone would fail non-text contrast (1.99:1); it's only the outer darker layer keeping it above 3:1 — worth Design confirming this is deliberate.
