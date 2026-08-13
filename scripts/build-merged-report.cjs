/* eslint-disable no-console */
/**
 * Builds the multi-demo merged a11y pack.
 * Tabs: Overview · Contrast · Keyboard · Demos · Backlog · By owner · Shared bugs
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = process.env.AUDIT_OUT || ROOT
const MERGED = path.join(OUT, 'merged')

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const DEMOS = [
  {
    slug: 'be2376b21',
    label: 'Demo with single video',
    url: 'https://play.goconsensus.com/be2376b21',
    results: path.join(OUT, 'results.json'),
    backlog: path.join(MERGED, 'backlog.json'),
    shotRoot: '',
    backlogDoc: 'merged/backlog.md',
    claudeDocs: [
      'consensus-player-a11y-audit-be2376b21.md',
      'consensus-player-a11y-audit-by-team.md',
      'consensus-player-a11y-audit-a754d887d-color-contrast-keyboard.md',
    ],
    coverage:
      'Cover → Opt-In → video player; guest “I’m new here” registration (justin.ware@goconsensus.com) → personalized player',
  },
  {
    slug: 'af5f0eba6',
    label: 'Dylan Standard personalized with tours',
    url: 'https://play.goconsensus.com/af5f0eba6',
    results: path.join(OUT, 'af5f0eba6', 'results.json'),
    backlog: path.join(MERGED, 'backlog-af5f0eba6.json'),
    shotRoot: 'af5f0eba6/',
    backlogDoc: 'merged/backlog-af5f0eba6.md',
    claudeDocs: [
      'consensus-player-a11y-audit-af5f0eba6-by-team.md',
      'consensus-player-a11y-audit-af5f0eba6-color-contrast-keyboard.md',
    ],
    coverage:
      'Identity → Opt-In → Topic Rating; Claude systematic contrast (14/18 Page A fail, grey theme) + Tab walk; product tour gated behind rating + cross-origin iframe',
  },
  {
    slug: 'a754d887d',
    label: 'Systematic contrast & keyboard demo',
    url: 'https://play.goconsensus.com/a754d887d',
    results: path.join(OUT, 'a754d887d', 'results.json'),
    backlog: path.join(MERGED, 'backlog-a754d887d.json'),
    shotRoot: 'a754d887d/',
    backlogDoc: 'merged/backlog-a754d887d.md',
    claudeDocs: ['consensus-player-a11y-audit-a754d887d-color-contrast-keyboard.md'],
    coverage:
      'Claude systematic pass: 69 text styles / 18 fails (brand orange); full Tab order on Topic Rating → Player → Lead-Capture with 3 focus mechanisms',
    claudeOnly: true,
  },
]

const SRC_LABELS = {
  'claude-by-team': 'Claude · by team',
  'claude-be2376': 'Claude · be2376',
  'claude-af5f0eba6': 'Claude · af5f0eba6',
  'claude-af5-systematic': 'Claude · systematic af5',
  'claude-a754-systematic': 'Claude · systematic a754',
  'cursor-axe': 'Cursor · axe',
}

const badge = (sev) => `<span class="badge ${sev}">${sev}</span>`
const pill = (cls, text) => `<span class="${cls}">${esc(text)}</span>`

function loadDemo(demo) {
  if (!fs.existsSync(demo.results) || !fs.existsSync(demo.backlog)) {
    console.warn(`skip ${demo.slug}: missing results or backlog`)
    return null
  }
  const results = JSON.parse(fs.readFileSync(demo.results, 'utf8'))
  const backlog = JSON.parse(fs.readFileSync(demo.backlog, 'utf8'))
  const shotExists = (rel) => rel && fs.existsSync(path.join(OUT, demo.shotRoot, rel))
  const shotHref = (rel) => `${demo.shotRoot}${rel}`
  return { ...demo, results, backlog, shotExists, shotHref }
}

function renderShots(d, shots, caption) {
  const ok = (shots || []).filter(d.shotExists)
  if (!ok.length) return ''
  return `<details open><summary>Evidence screen grabs (${ok.length})</summary><div class="shots">${ok
    .map(
      (s) =>
        `<figure class="shot"><a href="${d.shotHref(s)}" target="_blank" rel="noreferrer"><img src="${d.shotHref(
          s,
        )}" alt="${esc(caption)}" loading="lazy"></a><figcaption>${esc(caption)}</figcaption></figure>`,
    )
    .join('')}</div></details>`
}

function renderItem(d, item) {
  const hasShots = (item.shots || []).some(d.shotExists)
  return `<article class="finding ${item.severity}" id="${esc(d.slug)}-${esc(item.id)}">
    <div class="meta-row">
      ${badge(item.severity)}
      ${pill('id', item.id)}
      ${pill('owner', item.owner)}
      ${(item.pages || []).map((p) => pill('page', `Page ${p}`)).join('')}
      ${(item.sources || []).map((s) => pill('src', SRC_LABELS[s] || s)).join('')}
    </div>
    <h3>${esc(item.title)}</h3>
    ${item.detail ? `<p>${esc(item.detail)}</p>` : ''}
    <div class="fix"><strong>Fix.</strong> ${esc(item.fix)}</div>
    ${item.verified ? `<p class="verified">${esc(item.verified)}</p>` : ''}
    ${
      hasShots
        ? renderShots(d, item.shots, `${item.id} — ${item.title}`)
        : `<p class="sec-note">No Cursor screen grab — see note above for why this finding could not be captured live.</p>`
    }
  </article>`
}

function demoCounts(d) {
  const items = d.backlog.items
  return {
    items,
    byPriority: items.reduce(
      (acc, i) => {
        ;(acc[i.priority] || acc.P2).push(i)
        return acc
      },
      { P0: [], P1: [], P2: [] },
    ),
    critical: items.filter((i) => i.severity === 'critical').length,
    serious: items.filter((i) => i.severity === 'serious').length,
    withShots: items.filter((i) => (i.shots || []).some(d.shotExists)).length,
    eng: items.filter((i) => i.owner.includes('Engineering')).length,
    design: items.filter((i) => i.owner.includes('Design')).length,
  }
}

function renderContrastTable(failures) {
  if (!failures || !failures.length) return ''
  return `<h4 class="sub">Contrast failures (Claude systematic)</h4>
  <table class="contrast-table"><thead><tr><th>Text</th><th>Foreground / background</th><th class="num">Ratio</th><th class="num">Needed</th></tr></thead><tbody>
  ${failures
    .map((f) => {
      const ratio = String(f.ratio)
      const needed = Number(f.needed) || 4.5
      const numeric = parseFloat(ratio)
      const fails = Number.isFinite(numeric) ? numeric < needed : true
      return `<tr class="${fails ? 'contrast-fail' : ''}"><td>${esc(f.text)}</td><td><code>${esc(f.fg)}</code> / <code>${esc(
        f.bg,
      )}</code></td><td class="num"><strong class="fail">${esc(ratio)}${String(ratio).includes(':') ? '' : ':1'}</strong></td><td class="num">${esc(
        f.needed,
      )}</td></tr>`
    })
    .join('')}
  </tbody></table>`
}

function renderKeyboardTable(stops) {
  if (!stops || !stops.length) return ''
  return `<h4 class="sub">Tab order (real Tab presses)</h4>
  <table class="keyboard-table"><thead><tr><th class="num">#</th><th>Stop</th><th>Visible focus?</th><th>Mechanism</th></tr></thead><tbody>
  ${stops
    .map((s) => {
      const missing = s.visible === false
      const vis = s.visible
        ? s.correction
          ? 'Yes — correction'
          : 'Yes'
        : missing
          ? '<strong class="fail">No</strong>'
          : '—'
      return `<tr class="${missing ? 'keyboard-fail' : s.correction ? 'keyboard-fix' : ''}"><td class="num">${esc(s.n)}</td><td>${esc(
        s.stop,
      )}</td><td>${vis}</td><td>${esc(s.mechanism || '—')}</td></tr>`
    })
    .join('')}
  </tbody></table>`
}

function renderFocusRingNotes(notes) {
  if (!notes || !notes.length) return ''
  return `<h4 class="sub">Focus-indicator contrast notes</h4>
  <ul class="sources">${notes.map((n) => `<li><strong>${esc(n.control)}.</strong> ${esc(n.detail)}</li>`).join('')}</ul>`
}

/** One demo's evidence block (screens + measurements) — used inside the consolidated Demos tab. */
function renderDemoSection(d) {
  const counts = demoCounts(d)
  const themeState = (d.results.states || []).find((s) => (s.theme || []).length)
  const themeRows = themeState
    ? themeState.theme
        .map(
          (t) =>
            `<tr><td>${esc(t.label)}</td><td><code>${esc(t.color)}</code></td><td><code>${esc(
              t.background,
            )}</code></td><td class="num"><strong class="${t.passesAA ? '' : 'fail'}">${t.ratio}:1</strong></td><td>${
              t.passesAA ? 'pass' : '<strong class="fail">fails AA</strong>'
            }</td></tr>`,
        )
        .join('')
    : ''

  const zeroSize = []
  for (const s of d.results.states || []) {
    for (const c of s.ratingControls || []) {
      if (c.zeroSize) zeroSize.push({ state: s.title, ...c })
    }
  }

  const summary = d.results.summary
  const summaryBlock = summary
    ? `<div class="finding critical" style="margin-bottom:16px">
        <h3>${esc(summary.headline || 'Systematic contrast summary')}</h3>
        <p class="sec-note">${esc(d.results.methodNote || '')}</p>
        <p><strong>${esc(summary.stylesFailed)}</strong> of <strong>${esc(summary.stylesChecked)}</strong> distinct text styles failed.
        Brand orange token: <code>${esc(summary.brandOrange || '')}</code>.</p>
      </div>`
    : ''

  const axeLabel = d.claudeOnly
    ? `Claude systematic · no axe`
    : `axe <code>${esc(d.results.axeVersion)}</code>`

  return `<article class="demo-block" id="demo-${esc(d.slug)}">
  <header class="demo-head">
    <h2>${esc(d.label)}</h2>
    <div class="meta">
      <span>URL <code><a href="${esc(d.url)}" target="_blank" rel="noreferrer">${esc(d.url)}</a></code></span>
      <span>${axeLabel}</span>
      <span>Run <code>${new Date(d.results.generatedAt).toLocaleString()}</code></span>
    </div>
    <p class="sec-note"><strong>Coverage.</strong> ${esc(d.coverage)}</p>
  </header>

  <div class="cards">
    <div class="card critical"><div class="n">${counts.critical}</div><div class="l">Critical</div></div>
    <div class="card serious"><div class="n">${counts.serious}</div><div class="l">Serious</div></div>
    <div class="card"><div class="n">${counts.items.length}</div><div class="l">Backlog items</div></div>
    <div class="card"><div class="n">${counts.withShots}</div><div class="l">With screen grabs</div></div>
  </div>
  <p class="sec-note">Tickets for this demo are in the <button type="button" class="inline-tab-link" data-target="panel-backlog">Backlog</button> tab → <a href="#backlog-${esc(d.slug)}">${esc(d.label)}</a>.</p>

  ${summaryBlock}

  <h3 class="sub">Screens / states captured</h3>
  <div class="states">
  ${(d.results.states || [])
    .map(
      (s) => `<div class="finding">
      <h4>${esc(s.title)}</h4>
      <p class="sec-note">${esc(s.note)}${
        (s.violations || []).length
          ? ` — ${s.violations.length} axe rules, ${s.violations.reduce((n, v) => n + v.total, 0)} elements`
          : ''
      }</p>
      ${
        d.shotExists(s.full)
          ? `<figure class="shot"><a href="${d.shotHref(s.full)}" target="_blank" rel="noreferrer"><img src="${d.shotHref(
              s.full,
            )}" alt="${esc(s.title)}" loading="lazy"></a></figure>`
          : ''
      }
      ${(s.extras || [])
        .filter(d.shotExists)
        .map(
          (ex) =>
            `<figure class="shot"><a href="${d.shotHref(ex)}" target="_blank" rel="noreferrer"><img src="${d.shotHref(
              ex,
            )}" alt="${esc(s.title)}" loading="lazy"></a></figure>`,
        )
        .join('')}
      ${renderContrastTable(s.contrastFailures)}
      ${renderFocusRingNotes(s.focusRingNotes)}
      ${renderKeyboardTable(s.keyboardStops)}
    </div>`,
    )
    .join('\n')}
  </div>

  ${
    themeRows
      ? `<h3 class="sub">Independent contrast measurement (Cursor)</h3>
  <p class="sec-note">Computed foreground/background sampled directly from the live DOM on this demo.</p>
  <table><thead><tr><th>Control</th><th>Foreground</th><th>Background</th><th class="num">Ratio</th><th>AA</th></tr></thead><tbody>${themeRows}</tbody></table>`
      : ''
  }

  ${
    zeroSize.length
      ? `<h3 class="sub">Zero-size hit targets (Cursor probe)</h3>
  <p class="sec-note">Elements returning width or height of 0 from <code>getBoundingClientRect()</code> — Chrome skips these in Tab order regardless of <code>tabindex</code>.</p>
  <table><thead><tr><th>Screen</th><th>Element</th><th>Group name</th><th class="num">Size</th><th>Accessible name</th></tr></thead><tbody>
  ${zeroSize
    .map(
      (c) =>
        `<tr><td>${esc(c.state)}</td><td><code>${esc(c.tag)}${c.type ? `[type=${esc(c.type)}]` : ''}</code>${
          c.testid ? ` <span class="src">${esc(c.testid)}</span>` : ''
        }</td><td><code>${esc((c.name || '—').slice(0, 14))}</code></td><td class="num"><strong class="fail">${c.width}×${c.height}</strong></td><td>${
          c.accessibleName ? esc(c.accessibleName) : '<strong class="fail">none</strong>'
        }</td></tr>`,
    )
    .join('')}
  </tbody></table>`
      : ''
  }

  <h3 class="sub">Sources</h3>
  <ul class="sources">
    ${d.claudeDocs.map((c) => `<li>Claude — <code>${esc(c)}</code></li>`).join('')}
    ${
      d.claudeOnly
        ? ''
        : `<li>Cursor — live Playwright + axe-core run (<code>${esc(d.results.axeVersion)}</code>)</li>`
    }
    <li>Backlog data — <a href="${esc(d.backlogDoc)}">${esc(path.basename(d.backlogDoc))}</a></li>
  </ul>
</article>`
}

/** One demo's backlog block — used inside the consolidated Backlog tab. */
function renderBacklogSection(d) {
  const counts = demoCounts(d)
  const { byPriority } = counts
  return `<article class="demo-block" id="backlog-${esc(d.slug)}">
  <header class="demo-head">
    <h2>${esc(d.label)}</h2>
    <p class="sec-note">Design vs Engineering tickets — severity, page, suggested fix, and evidence. Full text: <a href="${esc(d.backlogDoc)}">${esc(path.basename(d.backlogDoc))}</a>.</p>
  </header>

  <div class="cards">
    <div class="card critical"><div class="n">${byPriority.P0.length}</div><div class="l">P0 hotfixes</div></div>
    <div class="card serious"><div class="n">${byPriority.P1.length}</div><div class="l">P1 shared</div></div>
    <div class="card"><div class="n">${byPriority.P2.length}</div><div class="l">P2 page-specific</div></div>
    <div class="card"><div class="n">${counts.items.length}</div><div class="l">Total tickets</div></div>
  </div>

  <h3 class="sub" id="${esc(d.slug)}-p0">P0 — Hotfixes</h3>
  <p class="sec-note">Ship first: functional dead-ends or hard keyboard blocks.</p>
  ${byPriority.P0.map((i) => renderItem(d, i)).join('\n') || '<p class="sec-note">None.</p>'}

  <h3 class="sub" id="${esc(d.slug)}-p1">P1 — Shared components</h3>
  <p class="sec-note">One fix clears multiple screens or demos.</p>
  ${byPriority.P1.map((i) => renderItem(d, i)).join('\n') || '<p class="sec-note">None.</p>'}

  <h3 class="sub" id="${esc(d.slug)}-p2">P2 — Page-specific &amp; Design decisions</h3>
  ${byPriority.P2.map((i) => renderItem(d, i)).join('\n') || '<p class="sec-note">None.</p>'}
</article>`
}

const demos = DEMOS.map(loadDemo).filter(Boolean)
if (!demos.length) {
  console.error('No demo data found under', OUT)
  process.exit(1)
}

const totals = demos.reduce(
  (acc, d) => {
    acc.items += d.backlog.items.length
    acc.critical += d.backlog.items.filter((i) => i.severity === 'critical').length
    acc.p0 += d.backlog.items.filter((i) => i.priority === 'P0').length
    return acc
  },
  { items: 0, critical: 0, p0: 0 },
)

const SHARED = [
  {
    title: 'Brand orange fails AA text contrast (design-system token)',
    demos: 'a754d887d systematic (18/69 styles); be2376b21 Cursor axe; applies wherever orange tokens are used',
    note: 'rgb(252,104,57) → 2.57–2.93:1 as text or under white text. Not a per-component bug.',
  },
  {
    title: 'Topic-rating controls at 0×0 with no accessible name',
    demos: 'All three demos (Cursor on af5f0eba6; Claude Tab walks on a754d887d + by-team)',
    note: 'Keyboard users cannot rate topics; rating is required to proceed.',
  },
  {
    title: 'Opt-In toggle: unlabeled, often 0×0, and no focus indicator',
    demos: 'All three demos',
    note: 'Shared switch; axe label rule + three-mechanism focus check both fail.',
  },
  {
    title: 'Modal close (X) button unlabeled',
    demos: 'be2376b21, af5f0eba6 (both Cursor axe-confirmed)',
    note: 'Single shared modal-header component.',
  },
  {
    title: 'Corrupted / duplicated legal disclaimer copy',
    demos: 'All three demos',
    note: 'Template or string-concatenation bug; read in full by screen readers.',
  },
  {
    title: 'Required-field indication is visual only',
    demos: 'be2376b21, af5f0eba6, a754d887d lead form',
    note: 'No required / aria-required on asterisked fields.',
  },
  {
    title: 'Focus rings that exist but fail 3:1 non-text contrast',
    demos: 'a754d887d (reaction bar 1.34–1.76:1); af5f0eba6 (both ring layers fail)',
    note: 'Earlier “missing focus” claims corrected — ring is present but not reliably visible.',
  },
  {
    title: 'Seek / Volume sliders have no focus indicator',
    demos: 'a754d887d (re-verified via outline, box-shadow, border-color)',
    note: 'Other Plyr controls use a dashed outline and pass.',
  },
  {
    title: 'Missing landmarks, generic document titles, heading-order gaps',
    demos: 'be2376b21, af5f0eba6',
    note: 'Structural fixes at the player shell.',
  },
]

const COMPARISON = [
  {
    dimension: 'Contrast root cause',
    a754: 'Brand orange rgb(252,104,57) fails in usual text/on-orange contexts (~25% of styles)',
    af5: 'Entire theme = grey placeholder rgb(169,169,169) — up to 78% fail on identity',
    be2376: 'Brand orange tokens (Cursor axe); lead-form legal + chrome also fail',
  },
  {
    dimension: 'Focus-ring contrast',
    a754: 'Outer orange layer 3.61:1 passes; inner alone 1.99:1 fails',
    af5: 'Both grey layers fail (1.71:1 / 2.92:1) — ring not reliably visible',
    be2376: 'Same orange-ring family as a754 where brand theme loads',
  },
  {
    dimension: 'Rating checkboxes 0×0',
    a754: 'Confirmed (Tab walk)',
    af5: 'Confirmed (Cursor + Claude) — 2 topics × 3',
    be2376: 'Confirmed (Claude by-team)',
  },
  {
    dimension: 'Opt-In toggle focus',
    a754: 'Missing (3 mechanisms)',
    af5: 'Missing (3 mechanisms)',
    be2376: 'Missing + unlabeled (Cursor axe / lead form)',
  },
  {
    dimension: 'Lead / registration form',
    a754: 'Full Tab walk; border-color focus; Country combobox gaps',
    af5: 'Same pattern on identity path',
    be2376: 'Cursor completed guest path (justin.ware@…) + axe + shots',
  },
  {
    dimension: 'Product tour',
    a754: 'N/A (video)',
    af5: 'Cross-origin iframe; close X non-responsive; Tab advances spotlight',
    be2376: 'N/A (single video)',
  },
]

const CORRECTIONS = [
  {
    was: 'Reaction bar / Contact me / Adjust my selections — no visible focus',
    now: 'They use box-shadow rings; earlier checks only looked at outline',
    demos: 'a754d887d (systematic)',
  },
  {
    was: 'Lead-capture text fields — “clear ring” (generic)',
    now: 'Mechanism is border-color → orange, not outline/box-shadow',
    demos: 'a754d887d',
  },
  {
    was: 'af5 grey theme ~2.06:1 from a few samples',
    now: '14/18 Page A styles fail (78%); structural grey placeholder, not one orange token',
    demos: 'af5f0eba6',
  },
  {
    was: 'Reaction focus “missing” vs “maybe present”',
    now: 'Ring exists but fails 3:1 non-text contrast (1.34–1.76:1 over video)',
    demos: 'a754d887d',
  },
]

const WCAG_MAP = [
  {
    criterion: '1.4.3 Contrast (Minimum)',
    level: 'AA',
    findings: 'Brand orange system-wide; af5 grey theme 78% Page A; legal/footer links; Continue / Get in touch / JW avatar',
  },
  {
    criterion: '1.4.11 Non-text Contrast',
    level: 'AA',
    findings: 'Focus rings (reaction bar; af5 grey ring both layers; orange ring inner layer)',
  },
  {
    criterion: '2.4.7 Focus Visible / 2.4.11 Focus Appearance (2.2)',
    level: 'AA',
    findings: 'Opt-In toggle; Seek/Volume; Select all / Contact me on Topic Rating; low-contrast rings that “exist” but fail visibility',
  },
  {
    criterion: '2.1.1 Keyboard',
    level: 'A',
    findings: '0×0 rating checkboxes skipped by Tab; tour Tab advances spotlight; unused Plyr rewind/FF 0×0',
  },
  {
    criterion: '4.1.2 Name, Role, Value',
    level: 'A',
    findings: 'Modal close unlabeled; Opt-In unlabeled; Country missing combobox/aria-expanded; rating checkbox-as-radio',
  },
  {
    criterion: '3.3.2 Labels or Instructions / 3.3.1',
    level: 'A',
    findings: 'Required fields visual-only (*); phone appears late after Country',
  },
  {
    criterion: '1.3.1 Info and Relationships',
    level: 'A',
    findings: 'Missing main/landmarks; heading-order jumps; dialog naming',
  },
]

const FIX_ORDER = [
  'Brand-orange + theme contrast tokens (design system) + grey-theme config safety net',
  'Topic-rating hit targets + radiogroup/radio semantics (one shared component)',
  'Modal close aria-label + Opt-In label, hit target, and :focus-visible',
  'Focus-ring contrast (reaction bar; grey-theme ring on af5)',
  'Seek / Volume focus indicators',
  'Required / aria-required on shared form fields; phone field order',
  'Legal disclaimer template / concatenation bug',
  'Country combobox ARIA; landmarks, titles, heading order',
  'Tour close button + deliberate Tab behavior (af5); dedicated tour-codebase audit',
]

function ownerBucket(owner) {
  if (/^Design$/i.test(owner)) return 'Design'
  if (/Engineering/i.test(owner) && !/Design/i.test(owner)) return 'Engineering'
  return 'Design + Engineering'
}

function allItems() {
  return demos.flatMap((d) =>
    d.backlog.items.map((i) => ({
      ...i,
      demoSlug: d.slug,
      demoLabel: d.label,
      demo: d,
    })),
  )
}

function isContrastItem(item) {
  const blob = `${item.title || ''} ${item.detail || ''} ${(item.axeRules || []).join(' ')}`.toLowerCase()
  return (
    (item.axeRules || []).includes('color-contrast') ||
    /contrast|brand orange|grey theme|gray theme|focus.?ring|luminance|2\.\d+:1|4\.5:1|3:1/.test(blob)
  )
}

function renderContrastTab() {
  const contrastItems = allItems().filter(isContrastItem)
  const sevOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
  const sorted = [...contrastItems].sort(
    (a, b) =>
      (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9) || a.demoLabel.localeCompare(b.demoLabel) || a.id.localeCompare(b.id),
  )

  let failureRows = 0
  const demoBlocks = demos
    .map((d) => {
      const states = (d.results.states || []).filter(
        (s) => (s.contrastFailures || []).length || (s.focusRingNotes || []).length || (s.theme || []).length,
      )
      if (!states.length && !d.results.summary) return ''

      const summary = d.results.summary
      const stateHtml = states
        .map((s) => {
          failureRows += (s.contrastFailures || []).length
          const themeRows = (s.theme || [])
            .filter((t) => !t.passesAA)
            .map(
              (t) =>
                `<tr class="contrast-fail"><td>${esc(t.label)}</td><td><code>${esc(t.color)}</code> / <code>${esc(
                  t.background,
                )}</code></td><td class="num"><strong class="fail">${esc(t.ratio)}:1</strong></td><td class="num">4.5</td></tr>`,
            )
            .join('')
          return `<div class="finding contrast-block">
            <h4>${esc(s.title)}</h4>
            <p class="sec-note">${esc(s.note || '')}</p>
            ${renderContrastTable(s.contrastFailures)}
            ${
              themeRows
                ? `<h4 class="sub">Cursor measured fails</h4><table class="contrast-table"><thead><tr><th>Control</th><th>Foreground / background</th><th class="num">Ratio</th><th class="num">Needed</th></tr></thead><tbody>${themeRows}</tbody></table>`
                : ''
            }
            ${renderFocusRingNotes(s.focusRingNotes)}
          </div>`
        })
        .join('\n')

      return `<article class="demo-block" id="contrast-${esc(d.slug)}">
        <header class="demo-head">
          <h2>${esc(d.label)}</h2>
          <p class="sec-note"><a href="${esc(d.url)}" target="_blank" rel="noreferrer"><code>${esc(d.url)}</code></a></p>
        </header>
        ${
          summary
            ? `<div class="finding critical contrast-callout"><h3>${esc(summary.headline || 'Contrast summary')}</h3>
               <p><strong>${esc(summary.stylesFailed)}</strong> of styles failed · token <code>${esc(summary.brandOrange || '')}</code></p>
               ${summary.comparisonToA754 ? `<p class="sec-note">${esc(summary.comparisonToA754)}</p>` : ''}
             </div>`
            : ''
        }
        ${stateHtml || '<p class="sec-note">No systematic contrast tables on this demo — see Cursor axe shots in Demos / Backlog.</p>'}
      </article>`
    })
    .join('\n')

  return `<header class="demo-head">
    <h2>Color &amp; contrast</h2>
    <p class="sec-note">All WCAG 1.4.3 text-contrast and 1.4.11 / 2.4.11 focus-indicator contrast findings in one place. Red rows failed their threshold. Full ticket cards live in <button type="button" class="inline-tab-link" data-target="panel-backlog">Backlog</button>.</p>
  </header>

  <div class="cards">
    <div class="card critical"><div class="n">${failureRows || '—'}</div><div class="l">Measured style fails</div></div>
    <div class="card serious"><div class="n">${sorted.length}</div><div class="l">Contrast-related tickets</div></div>
    <div class="card"><div class="n">2.93:1</div><div class="l">White on brand orange</div></div>
    <div class="card"><div class="n">2.06:1</div><div class="l">Grey on #F0F0F0 (af5)</div></div>
  </div>

  <div class="two-col" style="margin-top:16px">
    <div class="finding critical contrast-callout">
      <h4>Root cause A — Brand orange</h4>
      <p><code>rgb(252, 104, 57)</code> fails as text on white/#F0F0F0 (<strong>2.57–2.93:1</strong>) and under white text (<strong>2.93:1</strong>, still fails large-text 3:1 on JW avatar). Design-system token fix — not per-component.</p>
      <p class="sec-note">Seen on a754d887d systematic + be2376b21 Cursor axe.</p>
    </div>
    <div class="finding critical contrast-callout">
      <h4>Root cause B — Broken grey theme</h4>
      <p><code>rgb(169, 169, 169)</code> stands in for brand color on af5f0eba6. <strong>14/18</strong> identity styles fail (78%). Focus ring both layers also fail 3:1 because the palette is desaturated.</p>
      <p class="sec-note">Likely demo theme/config pipeline — same components look better (still imperfect) on orange demos.</p>
    </div>
  </div>

  <h3 class="sub">Contrast-related backlog tickets</h3>
  <table class="contrast-table">
    <thead><tr><th>ID</th><th>Sev</th><th>Demo</th><th>Finding</th><th>Owner</th></tr></thead>
    <tbody>
      ${sorted
        .map(
          (i) => `<tr class="contrast-fail">
        <td><a href="#${esc(i.demoSlug)}-${esc(i.id)}"><code>${esc(i.id)}</code></a></td>
        <td>${badge(i.severity)}</td>
        <td>${esc(i.demoLabel)}</td>
        <td><strong>${esc(i.title)}</strong></td>
        <td>${esc(i.owner)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h3 class="sub">Measured failures by demo</h3>
  <p class="jump">Jump to: ${demos.map((d) => `<a href="#contrast-${esc(d.slug)}">${esc(d.label)}</a>`).join(' · ')}</p>
  ${demoBlocks}`
}

function isKeyboardItem(item) {
  const blob = `${item.title || ''} ${item.detail || ''}`.toLowerCase()
  // Focus-ring *contrast* stays on Contrast tab; keyboard tab owns operability / Tab order / missing indicators
  if (/brand orange|grey theme|gray theme|luminance|color.contrast/.test(blob) && !/focus|tab|keyboard|seek|volume|opt-in|checkbox|0×0|0x0/.test(blob)) {
    return false
  }
  return /tab|keyboard|focus|seek|volume|opt-in toggle|0×0|0x0|hit.?target|checkbox|rewind|fast-forward|duplicate.*tab|tour.*tab|focus trap|combobox/.test(
    blob,
  )
}

function renderKeyboardTab() {
  const kbItems = allItems().filter(isKeyboardItem)
  const sevOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
  const sorted = [...kbItems].sort(
    (a, b) =>
      (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9) || a.demoLabel.localeCompare(b.demoLabel) || a.id.localeCompare(b.id),
  )

  let stopCount = 0
  let missingFocus = 0
  const demoBlocks = demos
    .map((d) => {
      const states = (d.results.states || []).filter((s) => (s.keyboardStops || []).length)
      if (!states.length) return ''
      const stateHtml = states
        .map((s) => {
          const stops = s.keyboardStops || []
          stopCount += stops.length
          missingFocus += stops.filter((x) => x.visible === false).length
          return `<div class="finding keyboard-block">
            <h4>${esc(s.title)}</h4>
            <p class="sec-note">${esc(s.note || '')}</p>
            ${renderKeyboardTable(stops)}
          </div>`
        })
        .join('\n')
      return `<article class="demo-block" id="keyboard-${esc(d.slug)}">
        <header class="demo-head">
          <h2>${esc(d.label)}</h2>
          <p class="sec-note"><a href="${esc(d.url)}" target="_blank" rel="noreferrer"><code>${esc(d.url)}</code></a></p>
        </header>
        ${stateHtml}
      </article>`
    })
    .join('\n')

  return `<header class="demo-head">
    <h2>Keyboard &amp; focus</h2>
    <p class="sec-note">Complete Tab walks (real key presses) and keyboard-operability tickets. Focus visibility checked via outline, box-shadow, and border-color. Red rows = no visible focus; amber = corrected from an earlier false negative. Ticket cards: <button type="button" class="inline-tab-link" data-target="panel-backlog">Backlog</button>.</p>
  </header>

  <div class="cards">
    <div class="card"><div class="n">${stopCount || '—'}</div><div class="l">Tab stops logged</div></div>
    <div class="card critical"><div class="n">${missingFocus || '—'}</div><div class="l">Stops with no focus style</div></div>
    <div class="card serious"><div class="n">${sorted.length}</div><div class="l">Keyboard-related tickets</div></div>
    <div class="card"><div class="n">3</div><div class="l">Focus CSS mechanisms</div></div>
  </div>

  <div class="two-col" style="margin-top:16px">
    <div class="finding critical keyboard-callout">
      <h4>Hard blocks</h4>
      <p><strong>Topic-rating checkboxes at 0×0</strong> — Tab skips them on all three demos; rating is required to continue. <strong>Opt-In toggle</strong> receives focus but has no visible indicator (all three mechanisms). <strong>Seek / Volume</strong> sliders have no focus style.</p>
    </div>
    <div class="finding serious keyboard-callout">
      <h4>Corrections &amp; tour quirks</h4>
      <p>Reaction bar / Contact me / Adjust my selections <strong>do</strong> have box-shadow rings (earlier outline-only checks were wrong). Lead fields use <strong>border-color</strong>. On af5 tours, Tab appears to advance the spotlight; close (X) did not dismiss.</p>
    </div>
  </div>

  <h3 class="sub">Keyboard-related backlog tickets</h3>
  <table class="keyboard-table">
    <thead><tr><th>ID</th><th>Sev</th><th>Demo</th><th>Finding</th><th>Owner</th></tr></thead>
    <tbody>
      ${sorted
        .map(
          (i) => `<tr class="keyboard-fail">
        <td><a href="#${esc(i.demoSlug)}-${esc(i.id)}"><code>${esc(i.id)}</code></a></td>
        <td>${badge(i.severity)}</td>
        <td>${esc(i.demoLabel)}</td>
        <td><strong>${esc(i.title)}</strong></td>
        <td>${esc(i.owner)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h3 class="sub">Tab walks by demo</h3>
  <p class="jump">Jump to: ${demos.map((d) => `<a href="#keyboard-${esc(d.slug)}">${esc(d.label)}</a>`).join(' · ')}</p>
  ${demoBlocks || '<p class="sec-note">No structured Tab walks in results yet for some demos — see backlog tickets above.</p>'}`
}

function renderOverview() {
  const items = allItems()
  const bySev = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  const byOwner = { Design: 0, Engineering: 0, 'Design + Engineering': 0 }
  for (const i of items) {
    bySev[i.severity] = (bySev[i.severity] || 0) + 1
    byOwner[ownerBucket(i.owner)] = (byOwner[ownerBucket(i.owner)] || 0) + 1
  }
  const withShots = items.filter((i) => (i.shots || []).some((s) => i.demo.shotExists(s))).length
  const sources = [
    ...new Set(demos.flatMap((d) => d.claudeDocs.map((c) => `sources/${c}`))),
  ]

  return `<header class="demo-head">
    <h2>Executive overview</h2>
    <p class="sec-note">Cross-demo rollup of Claude (manual + systematic contrast/keyboard) and Cursor (Playwright + axe-core) audits of the Consensus Demo Player.</p>
  </header>

  <div class="cards">
    <div class="card"><div class="n">${demos.length}</div><div class="l">Demos audited</div></div>
    <div class="card critical"><div class="n">${bySev.critical || 0}</div><div class="l">Critical tickets</div></div>
    <div class="card serious"><div class="n">${bySev.serious || 0}</div><div class="l">Serious tickets</div></div>
    <div class="card"><div class="n">${items.length}</div><div class="l">Total backlog</div></div>
    <div class="card"><div class="n">${withShots}</div><div class="l">With screen grabs</div></div>
    <div class="card"><div class="n">${byOwner.Engineering}</div><div class="l">Eng-owned</div></div>
    <div class="card"><div class="n">${byOwner.Design}</div><div class="l">Design-owned</div></div>
    <div class="card"><div class="n">${byOwner['Design + Engineering']}</div><div class="l">Design + Eng</div></div>
  </div>

  <h3 class="sub">Headline findings</h3>
  <ol class="headline-list">
    <li><strong>Brand orange fails AA text contrast</strong> wherever it is used as text or under white text (2.57–2.93:1) — design-system root cause on orange-themed demos. <button type="button" class="inline-tab-link" data-target="panel-contrast">Open Contrast tab</button></li>
    <li><strong>af5f0eba6 ships a broken grey theme</strong> (<code>rgb(169,169,169)</code>) — 14/18 identity styles fail (78%); theming/config safety net needed. <button type="button" class="inline-tab-link" data-target="panel-contrast">Open Contrast tab</button></li>
    <li><strong>Topic-rating controls are 0×0 and Tab-skipped</strong> on all three demos — single shared component fix. <button type="button" class="inline-tab-link" data-target="panel-keyboard">Open Keyboard tab</button></li>
    <li><strong>Opt-In toggle</strong> is unlabeled, often 0×0, and has no focus indicator (three-mechanism confirmed). <button type="button" class="inline-tab-link" data-target="panel-keyboard">Open Keyboard tab</button></li>
    <li><strong>Focus rings that “exist” can still fail</strong> WCAG 1.4.11 / 2.4.11 (reaction bar; af5 grey ring). <button type="button" class="inline-tab-link" data-target="panel-contrast">Contrast</button> · <button type="button" class="inline-tab-link" data-target="panel-keyboard">Keyboard</button></li>
    <li><strong>Corrupted legal disclaimer</strong> copy is three-for-three — shared template bug.</li>
    <li><strong>Product tours (af5)</strong> need a dedicated in-iframe audit; close X and Tab-as-advance are open Design/Eng decisions.</li>
  </ol>

  <h3 class="sub">Methodology</h3>
  <div class="two-col">
    <div class="finding">
      <h4>Claude — systematic contrast</h4>
      <p>Every distinct text style (color + effective background + size + weight) measured with the WCAG relative-luminance formula. Thresholds: <strong>4.5:1</strong> normal text, <strong>3:1</strong> large/bold (≥18.66px bold or ≥24px regular).</p>
    </div>
    <div class="finding">
      <h4>Claude — systematic keyboard</h4>
      <p>Full Tab order via real key presses (not simulated). Focus visibility checked via <strong>outline</strong>, <strong>box-shadow</strong>, and <strong>border-color</strong> — this app uses all three. Earlier outline-only checks produced false negatives.</p>
    </div>
    <div class="finding">
      <h4>Cursor — axe + Playwright</h4>
      <p>Live runs on <code>be2376b21</code> and <code>af5f0eba6</code> with WCAG 2.1 A/AA + best-practice tags, screen grabs per violation node, independent contrast sampling, and <code>getBoundingClientRect</code> hit-target probes. Guest lead-form path unlocked with an allowed email.</p>
    </div>
    <div class="finding">
      <h4>Out of scope / limits</h4>
      <p>OneTrust cookie UI excluded from axe. Cross-origin tour iframe (ReachSuite) cannot be DOM-audited from the parent. Disabled controls flagged for completeness where noted.</p>
    </div>
  </div>

  <h3 class="sub">Cross-demo comparison</h3>
  <table>
    <thead><tr><th>Dimension</th><th>a754d887d</th><th>af5f0eba6</th><th>be2376b21</th></tr></thead>
    <tbody>
      ${COMPARISON.map(
        (r) =>
          `<tr><td><strong>${esc(r.dimension)}</strong></td><td>${esc(r.a754)}</td><td>${esc(r.af5)}</td><td>${esc(r.be2376)}</td></tr>`,
      ).join('')}
    </tbody>
  </table>

  <h3 class="sub">Corrections to earlier spot-checks</h3>
  <table>
    <thead><tr><th>Previously reported</th><th>Corrected to</th><th>Demo</th></tr></thead>
    <tbody>
      ${CORRECTIONS.map(
        (c) =>
          `<tr><td>${esc(c.was)}</td><td>${esc(c.now)}</td><td><code>${esc(c.demos)}</code></td></tr>`,
      ).join('')}
    </tbody>
  </table>

  <h3 class="sub">WCAG criteria map</h3>
  <table>
    <thead><tr><th>Criterion</th><th>Level</th><th>Where it shows up in this pack</th></tr></thead>
    <tbody>
      ${WCAG_MAP.map(
        (w) =>
          `<tr><td><strong>${esc(w.criterion)}</strong></td><td>${esc(w.level)}</td><td>${esc(w.findings)}</td></tr>`,
      ).join('')}
    </tbody>
  </table>

  <h3 class="sub">Recommended fix order</h3>
  <ol class="headline-list">
    ${FIX_ORDER.map((f) => `<li>${esc(f)}</li>`).join('')}
  </ol>

  <h3 class="sub">Source documents</h3>
  <ul class="sources">
    ${sources.map((s) => `<li><a href="${esc(s)}"><code>${esc(s)}</code></a></li>`).join('')}
    <li>Backlogs — ${demos.map((d) => `<a href="${esc(d.backlogDoc)}"><code>${esc(path.basename(d.backlogDoc))}</code></a>`).join(' · ')}</li>
  </ul>`
}

function renderByOwner() {
  const items = allItems()
  const groups = {
    Design: items.filter((i) => ownerBucket(i.owner) === 'Design'),
    Engineering: items.filter((i) => ownerBucket(i.owner) === 'Engineering'),
    'Design + Engineering': items.filter((i) => ownerBucket(i.owner) === 'Design + Engineering'),
  }
  const sevOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
  const priOrder = { P0: 0, P1: 1, P2: 2 }

  const renderGroup = (title, list) => {
    const sorted = [...list].sort(
      (a, b) =>
        (priOrder[a.priority] ?? 9) - (priOrder[b.priority] ?? 9) ||
        (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9) ||
        a.id.localeCompare(b.id),
    )
    return `<h3 class="sub">${esc(title)} <span class="sec-note" style="display:inline">(${sorted.length})</span></h3>
    <table>
      <thead><tr><th>ID</th><th>Pri</th><th>Sev</th><th>Demo</th><th>Finding</th><th>Pages</th></tr></thead>
      <tbody>
      ${sorted
        .map(
          (i) => `<tr>
        <td><a href="#${esc(i.demoSlug)}-${esc(i.id)}"><code>${esc(i.id)}</code></a></td>
        <td>${esc(i.priority)}</td>
        <td>${badge(i.severity)}</td>
        <td>${esc(i.demoLabel)}</td>
        <td><strong>${esc(i.title)}</strong>${i.detail ? `<div class="sec-note">${esc(i.detail.slice(0, 160))}${i.detail.length > 160 ? '…' : ''}</div>` : ''}</td>
        <td>${esc((i.pages || []).join(', '))}</td>
      </tr>`,
        )
        .join('')}
      </tbody>
    </table>`
  }

  return `<header class="demo-head">
    <h2>Backlog by ownership</h2>
    <p class="sec-note">Same tickets as the Backlog tab, regrouped for Design vs Engineering planning. Links jump to the full ticket card.</p>
  </header>
  ${renderGroup('Design — needs a visual / interaction / content decision', groups.Design)}
  ${renderGroup('Engineering — fixable in code without a new design decision', groups.Engineering)}
  ${renderGroup('Design + Engineering — decision then implementation', groups['Design + Engineering'])}`
}

const jumpDemos = demos
  .map((d) => `<a href="#demo-${esc(d.slug)}">${esc(d.label)}</a>`)
  .join(' · ')
const jumpBacklogs = demos
  .map((d) => `<a href="#backlog-${esc(d.slug)}">${esc(d.label)}</a>`)
  .join(' · ')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Merged a11y pack — Consensus Demo Player</title>
<style>
  :root {
    --orange: #FC6839; --ink: #172537; --muted: #6F6F6F; --line: #E4E0DC; --bg: #FAF9F8;
    --critical: #C62A2F; --serious: #D2691E; --moderate: #B38600; --minor: #5B6B7C;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: var(--bg); line-height: 1.55; }
  a { color: var(--orange); }
  .shell { max-width: 1240px; margin: 0 auto; padding: 40px 32px 96px; }
  header.hero { border-bottom: 1px solid var(--line); padding-bottom: 20px; margin-bottom: 8px; }
  .kicker { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--orange); font-weight: 600; margin: 0; }
  h1 { font-size: 32px; line-height: 1.15; margin: 8px 0 10px; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13px; color: var(--muted); }
  .meta code { background: #fff; border: 1px solid var(--line); padding: 1px 6px; border-radius: 5px; font-size: 12px; }
  .tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 24px 0 0; border-bottom: 1px solid var(--line); }
  .tab { appearance: none; background: transparent; border: 1px solid transparent; border-bottom: none; font: inherit; font-size: 14px; font-weight: 600; color: var(--muted); padding: 10px 16px; border-radius: 10px 10px 0 0; cursor: pointer; }
  .tab:hover { color: var(--ink); background: #fff; }
  .tab[aria-selected="true"] { background: #fff; color: var(--ink); border-color: var(--line); box-shadow: 0 1px 0 #fff; }
  .tab:focus-visible { outline: 2px solid var(--orange); outline-offset: 2px; }
  .tab .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--critical); margin-right: 8px; vertical-align: middle; }
  .tab.backlog .dot { background: var(--orange); }
  .tab.shared .dot { background: var(--serious); }
  .tab.owner .dot { background: var(--moderate); }
  .tab.overview .dot { background: var(--ink); }
  .tab.contrast .dot { background: var(--critical); }
  .tab.keyboard .dot { background: #2F6FED; }
  .contrast-fail { background: #FFF1F0; }
  .contrast-fail:hover { background: #FFE4E1; }
  .contrast-callout { border-left-width: 6px; }
  .contrast-block { border-left-color: var(--critical); }
  table.contrast-table th:nth-child(3), table.contrast-table td.num { font-weight: 600; }
  .keyboard-fail { background: #FFF1F0; }
  .keyboard-fix { background: #FFF8E8; }
  .keyboard-callout { border-left-width: 6px; }
  .keyboard-block { border-left-color: #2F6FED; }
  .inline-tab-link { appearance: none; background: none; border: none; padding: 0; font: inherit; color: var(--orange); font-weight: 600; text-decoration: underline; cursor: pointer; }
  .inline-tab-link:focus-visible { outline: 2px solid var(--orange); outline-offset: 2px; }
  .jump { font-size: 14px; margin: 0 0 20px; color: var(--muted); }
  .jump a { font-weight: 600; }
  .panel { display: none; padding-top: 28px; }
  .panel.active { display: block; }
  .demo-block { margin-bottom: 56px; padding-bottom: 40px; border-bottom: 1px solid var(--line); }
  .demo-block:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .demo-head h2 { font-size: 24px; margin: 0 0 8px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 20px 0 8px; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
  .card .n { font-size: 26px; font-weight: 700; line-height: 1; }
  .card .l { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .card.critical .n { color: var(--critical); }
  .card.serious .n { color: var(--serious); }
  h3.sub { font-size: 18px; margin: 40px 0 6px; padding-top: 8px; }
  h4 { font-size: 16px; margin: 6px 0; }
  .sec-note { color: var(--muted); font-size: 14px; margin: 0 0 14px; }
  .verified { font-size: 12px; color: #2b7a4b; margin: 8px 0 0; font-weight: 600; }
  .finding { background: #fff; border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 12px; padding: 18px 20px; margin-bottom: 16px; }
  .finding.critical { border-left-color: var(--critical); }
  .finding.serious { border-left-color: var(--serious); }
  .finding.moderate { border-left-color: var(--moderate); }
  .finding.minor { border-left-color: var(--minor); }
  .finding h3 { font-size: 16px; margin: 10px 0 6px; }
  .finding h4 { margin-top: 0; }
  .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin: 12px 0 8px; }
  .headline-list { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px 16px 16px 36px; margin: 0 0 8px; }
  .headline-list li { margin: 8px 0; }
  .meta-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 3px 8px; border-radius: 999px; color: #fff; }
  .badge.critical { background: var(--critical); }
  .badge.serious { background: var(--serious); }
  .badge.moderate { background: var(--moderate); }
  .badge.minor { background: var(--minor); }
  .id { font-family: ui-monospace, Menlo, monospace; font-size: 12px; font-weight: 700; }
  .owner, .page, .src { font-size: 11px; border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; color: var(--muted); background: #fafafa; }
  .owner { border-color: #FFD9C9; color: #9a3d12; background: #FFF6F2; }
  .fix { background: #FFF6F2; border: 1px solid #FFD9C9; border-radius: 10px; padding: 10px 12px; margin-top: 10px; font-size: 14px; }
  .fix strong { color: var(--orange); }
  details { margin-top: 12px; }
  summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--muted); }
  .shots { display: grid; gap: 12px; margin-top: 12px; }
  figure.shot { margin: 10px 0 0; }
  figure.shot img { max-width: 100%; border: 1px solid var(--line); border-radius: 8px; display: block; background: #fff; }
  figure.shot figcaption { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .states { display: grid; gap: 18px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; font-size: 14px; margin-bottom: 8px; }
  th, td { text-align: left; padding: 9px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  tr:last-child td { border-bottom: none; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .fail { color: var(--critical); }
  ul.sources { font-size: 14px; color: var(--muted); }
  footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 13px; color: var(--muted); }
</style>
</head>
<body>
<div class="shell">
<header class="hero">
  <p class="kicker">Merged accessibility pack</p>
  <h1>Consensus Demo Player — Claude + Cursor</h1>
  <div class="meta">
    <span>Demos <code>${demos.length}</code></span>
    <span>Backlog items <code>${totals.items}</code></span>
    <span>Critical <code>${totals.critical}</code></span>
    <span>P0 hotfixes <code>${totals.p0}</code></span>
    <span>Standard <code>WCAG 2.1 / 2.2 AA</code></span>
  </div>
  <p class="sec-note" style="margin-top:14px">Systematic contrast + keyboard on <code>a754d887d</code> and <code>af5f0eba6</code>; Cursor axe + screen grabs on <code>be2376b21</code> and <code>af5f0eba6</code>; guest lead-form evidence on the single-video demo.</p>
</header>

<div class="tabs" role="tablist" aria-label="Audit report sections">
  <button class="tab overview" role="tab" id="tab-overview" aria-controls="panel-overview" aria-selected="true" data-target="panel-overview"><span class="dot"></span>Overview</button>
  <button class="tab contrast" role="tab" id="tab-contrast" aria-controls="panel-contrast" aria-selected="false" data-target="panel-contrast"><span class="dot"></span>Contrast</button>
  <button class="tab keyboard" role="tab" id="tab-keyboard" aria-controls="panel-keyboard" aria-selected="false" data-target="panel-keyboard"><span class="dot"></span>Keyboard</button>
  <button class="tab" role="tab" id="tab-demos" aria-controls="panel-demos" aria-selected="false" data-target="panel-demos"><span class="dot"></span>Demos audited</button>
  <button class="tab backlog" role="tab" id="tab-backlog" aria-controls="panel-backlog" aria-selected="false" data-target="panel-backlog"><span class="dot"></span>Backlog</button>
  <button class="tab owner" role="tab" id="tab-owner" aria-controls="panel-owner" aria-selected="false" data-target="panel-owner"><span class="dot"></span>By owner</button>
  <button class="tab shared" role="tab" id="tab-shared" aria-controls="panel-shared" aria-selected="false" data-target="panel-shared"><span class="dot"></span>Shared bugs</button>
</div>

<section class="panel active" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
  ${renderOverview()}
</section>

<section class="panel" id="panel-contrast" role="tabpanel" aria-labelledby="tab-contrast">
  ${renderContrastTab()}
</section>

<section class="panel" id="panel-keyboard" role="tabpanel" aria-labelledby="tab-keyboard">
  ${renderKeyboardTab()}
</section>

<section class="panel" id="panel-demos" role="tabpanel" aria-labelledby="tab-demos">
  <p class="jump">Jump to: ${jumpDemos}</p>
  ${demos.map(renderDemoSection).join('\n')}
</section>

<section class="panel" id="panel-backlog" role="tabpanel" aria-labelledby="tab-backlog">
  <header class="demo-head">
    <h2>Fix backlog</h2>
    <p class="sec-note">All Design vs Engineering tickets across demos — P0 → P1 → P2 within each demo. Prefer the <button type="button" class="inline-tab-link" data-target="panel-owner">By owner</button> tab for planning lanes.</p>
  </header>
  <p class="jump">Jump to: ${jumpBacklogs}</p>
  ${demos.map(renderBacklogSection).join('\n')}
</section>

<section class="panel" id="panel-owner" role="tabpanel" aria-labelledby="tab-owner">
  ${renderByOwner()}
</section>

<section class="panel" id="panel-shared" role="tabpanel" aria-labelledby="tab-shared">
  <header class="demo-head">
    <h2>Bugs that reproduce across demos</h2>
    <p class="sec-note">Single shared-component or shared-template defects. Fixing each once clears the same finding on every demo — highest leverage work in the pack.</p>
  </header>
  <table>
    <thead><tr><th>Finding</th><th>Seen on</th><th>Why it matters</th></tr></thead>
    <tbody>
      ${SHARED.map(
        (s) => `<tr><td><strong>${esc(s.title)}</strong></td><td>${esc(s.demos)}</td><td>${esc(s.note)}</td></tr>`,
      ).join('')}
    </tbody>
  </table>
  <div class="fix" style="margin-top:20px"><strong>Recommended order.</strong> See Overview for the full sequenced list. Short version: brand/theme contrast → rating hit targets → Opt-In + modal close → focus-ring contrast → Seek/Volume → required fields → legal template → combobox/landmarks → tour close/Tab.</div>
</section>

<footer>
  Sources under <code>sources/</code> ·
  <a href="report.html">Cursor-only report (single video)</a> ·
  Rebuild with <code>AUDIT_OUT=. node scripts/build-merged-report.cjs</code>
</footer>
</div>
<script>
  const tabs = [...document.querySelectorAll('.tab')];
  const select = (id) => {
    tabs.forEach((t) => {
      const on = t.dataset.target === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === id));
    history.replaceState(null, '', '#' + id);
  };
  tabs.forEach((t) => t.addEventListener('click', () => select(t.dataset.target)));
  document.querySelectorAll('.inline-tab-link').forEach((btn) =>
    btn.addEventListener('click', () => {
      select(btn.dataset.target);
      const hash = btn.getAttribute('href');
      if (hash && hash.startsWith('#')) {
        requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }));
      }
    }),
  );
  document.querySelectorAll('.jump a[href^="#backlog-"]').forEach((a) => {
    a.addEventListener('click', () => select('panel-backlog'));
  });
  document.querySelectorAll('.jump a[href^="#demo-"]').forEach((a) => {
    a.addEventListener('click', () => select('panel-demos'));
  });
  document.querySelectorAll('.jump a[href^="#contrast-"]').forEach((a) => {
    a.addEventListener('click', () => select('panel-contrast'));
  });
  document.querySelectorAll('.jump a[href^="#keyboard-"]').forEach((a) => {
    a.addEventListener('click', () => select('panel-keyboard'));
  });
  document.querySelectorAll('#panel-owner a[href^="#"], #panel-contrast a[href^="#"], #panel-keyboard a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.startsWith('#contrast-') || id.startsWith('#keyboard-')) return;
      const el = document.querySelector(id);
      if (!el) return;
      select('panel-backlog');
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }));
      e.preventDefault();
    });
  });
  document.querySelectorAll('a[href^="#backlog-"]').forEach((a) => {
    if (a.closest('.jump')) return;
    a.addEventListener('click', (e) => {
      select('panel-backlog');
      const id = a.getAttribute('href');
      requestAnimationFrame(() => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' }));
      e.preventDefault();
    });
  });
  tabs.forEach((t, i) =>
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      select(next.dataset.target);
    }),
  );
  if (location.hash && document.querySelector(location.hash + '.panel')) select(location.hash.slice(1));
  else if (location.hash && location.hash.startsWith('#backlog-')) {
    select('panel-backlog');
    requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
  } else if (location.hash && location.hash.startsWith('#demo-')) {
    select('panel-demos');
    requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
  } else if (location.hash && document.querySelector(location.hash)) {
    select('panel-backlog');
    requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
  }
</script>
</body>
</html>`

fs.writeFileSync(path.join(OUT, 'merged.html'), html)
if (fs.existsSync(MERGED)) {
  fs.writeFileSync(path.join(MERGED, 'index.html'), html)
}
console.log(`✓ ${path.join(OUT, 'merged.html')}`)
console.log(`  7 tabs · ${demos.length} demos · ${totals.items} backlog items · ${totals.p0} P0`)
