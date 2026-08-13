# Consensus Player — Systematic Color/Contrast & Keyboard Navigation Audit

URL tested: `play.goconsensus.com/af5f0eba6` ("Dylan Standard personalized with tours")

Companion to the equivalent report for `a754d887d`. Same method: every distinct text style checked programmatically against its real computed background (WCAG relative-luminance formula, 4.5:1 normal text / 3:1 large text), and the complete Tab order walked stop-by-stop using real key presses, checking all three focus-indicator mechanisms this app family uses (outline, box-shadow, border-color).

## Part 1 — Color & Contrast (systematic)

### Headline finding: this demo's entire theme is broken, and the damage is worse than a single missing brand color

Where the `a754d887d` demo's contrast problems traced back to one color (the brand orange) failing in specific contexts, this demo's problem is structural: the whole UI appears to be rendering with a grey placeholder color (`rgb(169,169,169)`) standing in for what should be the brand color, applied consistently across buttons, avatars, and backgrounds. The result is a much higher failure rate.

| Page | Distinct styles checked | Failed |
|---|---|---|
| A — Identity screen | 18 | 14 (78%) |
| B — Opt-In modal | 21 (incl. background) | 15, but only 1 new (the "Opt-in and Continue" button — the rest are the dimmed background repeating) |
| C — Topic Rating screen | 20 | 6 (30% — noticeably better once past the identity screen, see below) |

### Page A — Identity screen: nearly everything fails

| Text | Colors (fg/bg) | Ratio | Needed |
|---|---|---|---|
| "Personalized demo for" | white / grey 169,169,169 | 2.35 | 4.5 |
| "Goconsensus" (28px) | white / grey | 2.35 | 3.0 |
| "JW" avatar (32px) | white / grey | 2.35 | 3.0 |
| "Justin Ware" / "Test User" (identity buttons) | white / grey | 2.35 | 4.5 |
| Legal disclaimer text, "Z inc Privacy Policy," "Terms of Service," "Z inc Partners" | white / grey | 2.35 | 4.5 |
| "Copyright Z inc 2023," "Powered by," "Consensus" (footer) | white / grey | 2.35 | 4.5 |
| "Contact me," "I'm new here" | grey / light-grey 240,240,240 | 2.06 | 4.5 |

Every one of these traces to the same `rgb(169,169,169)` value doing double duty as both a background color (under white text) and a text color (over light-grey) — neither pairing comes close to passing.

### Page B — Opt-In modal: mostly the same story, plus a confirmation

The modal's own heading ("Opt In") and body copy are genuinely fine — black text on white, 21:1. But the "Opt-in and Continue" button measures the same 2.35:1 (white text on the grey background) as everything else. The broken color isn't confined to the identity screen; it's a shared value used wherever this demo's "brand" color is supposed to appear.

### Page C — Topic Rating screen: improves, but not clean

Once past the identity screen, most of the interface (labels, headings, the rating table) uses normal black-on-white text and passes cleanly. Remaining failures:

| Text | Colors (fg/bg) | Ratio | Needed |
|---|---|---|---|
| "JW" avatar | white / grey | 2.35 | 3.0 |
| "Contact me," "Select all" | grey / light-grey | 2.06 | 4.5 |
| "Rate all topics to continue" (disabled) | white / grey | 2.35 | 4.5 |
| "Now Playing" tab label | dark navy / near-transparent grey | 4.15 | 4.5 |
| Notification badge "2" | white / grey | 2.35 | 4.5 |

The "Now Playing" tab label is worth calling out separately: at 4.15:1 it's close to passing and isn't tied to the broken grey theme — it looks like an independent, smaller-margin contrast issue (likely just a slightly-too-light navy on a near-white translucent background) rather than the same root cause as everything else on this page.

### Focus-ring contrast: also broken, and worse than the other demo

The working focus ring on this demo (used for "Contact me," "I'm new here," "Justin Ware," "Test User," and the Opt-In info icon) is a two-layer box-shadow, same technique as `a754d887d` — but here both layers fail:

- Inner layer `rgb(198,198,198)`: 1.71:1 against white, 1.50:1 against light-grey
- Outer layer `rgb(151,151,151)`: 2.92:1 against white — still short of 3:1

On the other demo, the outer layer's darker color (3.61:1) was enough to save the ring. Here, because the whole palette is desaturated, even the darkest layer available doesn't reach the bar. This focus ring is confirmed too low-contrast to reliably see, not just borderline.

## Part 2 — Keyboard Navigation (systematic, sequential)

### Page A — Identity screen

| # | Stop | Visible focus? | Mechanism |
|---|---|---|---|
| 1–4 | Footer links (Privacy Policy, Terms, Partners, "Consensus" logo link) | Yes | Browser default outline: auto |
| 5 | "Contact me" | Present but fails contrast | Two-layer grey box-shadow, both layers under 3:1 (see Part 1) |
| 6 | "I'm new here" | Present but fails contrast | Same |
| 7 | "Justin Ware" | Present but fails contrast | Same |
| 8–9 | "Test User" (appears twice in sequence) | Present but fails contrast | Same — the duplicate stop is itself worth a look; suggests two focusable elements exist for what should be one button, possibly a stale/duplicate session identity left in the DOM |
| 10 | Opt-In info (ⓘ) icon | Present but fails contrast | Same |
| 11 | Opt-In toggle | No | Confirmed via all three mechanisms — genuinely none, same as every other demo audited |
| 12 | (wraps to `<body>`) | — | — |

### Page C — Topic Rating screen

Not re-walked stop-by-stop this pass (session state made this harder to reach cleanly), but the underlying rating-checkbox bug was already confirmed earlier in this engagement: the "Feature 1"/"Feature 2" rating inputs render at 0×0px, matching the identical bug found on `a754d887d` and `be2376b21`. This is now confirmed on all three demos audited, which is about as strong as evidence gets that it's a single shared component defect.

## Summary: how this demo compares to a754d887d

| | a754d887d | af5f0eba6 |
|---|---|---|
| Root cause | One color (brand orange) fails in its usual contexts | Entire theme appears to be a broken/placeholder grey value |
| Scope of failure | ~25% of checked styles failed | Up to 78% failed on the worst page |
| Focus-ring contrast | Partially saved by a darker outer shadow layer (3.61:1, passes) | Fails even at its darkest layer (2.92:1) |
| Checkbox 0×0 bug | Confirmed | Confirmed (same bug) |
| Opt-In toggle focus | Confirmed missing | Confirmed missing (same) |

The two demos share the same underlying component bugs (checkbox hit-target, Opt-In toggle focus, the general focus-ring technique), but `af5f0eba6` is a strictly worse instance because whatever assigns this demo's theme color appears to have failed entirely, defaulting to a flat grey rather than the brand orange. This strongly suggests a demo-configuration/theming pipeline issue rather than something wrong with the component code itself — the same components render correctly (if still imperfectly) on the other demo.
