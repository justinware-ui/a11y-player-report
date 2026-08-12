# Consensus Player — WCAG 2.2 AA Evaluation
**URL tested:** `play.goconsensus.com/be2376b21` ("New accessibility test")

## Note on scope
This demo's flow differs from the one audited 47 minutes ago (`a754d887d`): it opens on a "who are you" identity screen with two paths. Choosing **"Justin Ware"** (the returning/owner identity) routes into the internal **Discovery Demo Builder** — an authoring/editing tool, not the customer-facing viewer — which is out of scope for a player-experience audit. Choosing **"I'm new here"** correctly leads to visitor registration. That path is what's evaluated below.

Registration on this specific demo has an email-domain restriction ("Sharing restricted for this demo") that gates further progress behind a "Request Access" flow I couldn't complete live, so the video player and topic-rating screen themselves weren't reachable this pass. Findings below cover the identity screen, the Opt-In consent modal, and the registration form — plus systemic comparisons against the first demo, since several bugs/patterns reproduced identically here.

---

## Findings

### Critical

- **Custom Country dropdown has no accessible combobox/listbox semantics.** Clicking the Country field opens a custom option list, but confirmed via DOM inspection: the input has no `role`, `aria-expanded`, or `aria-controls`, and each option is a plain `<span>` with no `role="option"` inside a container with no `role="listbox"`. A screen reader gets no indication a list opened, what the options are, or how many there are. **Fix:** implement the ARIA 1.2 combobox pattern (`role="combobox"` + `aria-expanded`/`aria-controls` on the input, `role="listbox"`/`role="option"` on the list).

- **Required-field indication is programmatic-free, reproducing the same bug found in the other demo.** First name, Last name, Email, and Country are all visually marked with `*` but confirmed to have `required=false` and no `aria-required` — identical to the lead-capture form audited previously. This confirms the issue is a **shared component/template bug**, not a one-off, and any fix should be applied once at the component level rather than per-demo.

### Serious

- **Opt-In consent modal has no dialog semantics.** Unlike the lead-capture modal (which correctly uses `role="dialog"` + `aria-modal="true"`), this Opt-In modal — triggered from "Justin Ware" or "I'm new here" — has neither. Its "Opt In" heading is a `<span>`, not a real heading element either. Focus does move to the close button on open (a working pattern, matching the header "Contact me" panel, and better than the lead-capture form's behavior in the other demo) — but the container itself is invisible to AT as a modal. **Fix:** add `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to a real heading.

- **Modal close (X) button has no accessible name — same shared component bug as before.** Confirmed via class name (`src-shared-ui-modal-header--close-...`) that this is the identical close-button component flagged in the other demo's audit, appearing here on both the Opt-In modal and (by inheritance) likely everywhere else it's used. One fix — `aria-label="Close"` — resolves it everywhere at once.

- **The corrupted/duplicated legal disclaimer text is confirmed systemic.** The same garbled "This is a legal statement describing Opt-in & Legitimate Interest..." repeating into "...gitimate Interesgitimate Interes..." text appears verbatim on this demo's landing screen too. This is a shared content/template bug, not specific to one demo — worth fixing once at the source.

### Moderate

- **Document title is generic, though slightly better than the other demo.** Title reads "New accessibility test" (the demo's internal name) rather than something like "test" — an improvement over the literal placeholder seen before, but still not a meaningful, presenter-oriented title for end users.

### What's working well (worth calling out and replicating elsewhere)

- **This landing screen has a real `<h1>`** ("Personalized demo for Goconsensus") — a genuine heading element, unlike every screen audited in the previous demo. Worth using as the template for fixing the heading gaps found elsewhere.
- **Email field validation is done right.** When the restricted email was rejected, the error ("Sharing restricted for this demo") was properly wired: `aria-invalid="true"` on the input, `aria-describedby` pointing to the message, and the message itself has `role="alert"` — meaning it's announced automatically to screen reader users the moment it appears. This is a solid, correct implementation and a good reference pattern for fixing the required-field indication issue elsewhere (the same `aria-describedby`/`role="alert"` machinery could carry a "this field is required" message too).
- **Text input focus rings** (First name, Last name, Email, Country) are all clearly visible, consistent with the other demo's registration form.
- **"Justin Ware" and "Policies & Statement" buttons have real, non-empty accessible text** — unlike some of the icon-only controls flagged elsewhere.

---

## Open items (couldn't verify this pass)
- The actual video player, reaction bar, and topic-rating controls on *this* demo — blocked by the access-restriction gate. Given the topic-rating checkbox issue (0×0 hit target, skipped by Tab) was confirmed as a shared-component bug in the other demo, it's reasonable to expect it reproduces here too, but I haven't confirmed it directly on this URL.
- Keyboard operability of the Country dropdown's option list (arrow keys, typeahead) — the missing ARIA semantics make this unlikely to work well for AT users regardless, but I didn't test the raw keyboard behavior itself.

Happy to request access and finish this demo's player/topic-rating audit once that gate clears, or move on to ticketing the shared-component fixes (required-field indication, modal close button, corrupted legal text) that now have confirmed cross-demo evidence.
