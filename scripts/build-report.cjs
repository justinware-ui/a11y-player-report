/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'out')
const data = require(path.join(OUT, 'results.json'))
const SRC = '/Users/justinware/Ware-house/src'

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 }

/** Count interactive elements vs. accessible names per component so fixes can be prioritised. */
function scanSource(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) scanSource(full, acc)
    else if (/\.tsx$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8')
      const buttons = (text.match(/<button/g) || []).length
      if (!buttons) continue
      acc.push({
        file: path.relative('/Users/justinware/Ware-house', full),
        buttons,
        labels: (text.match(/aria-label/g) || []).length,
      })
    }
  }
  return acc
}

const hotspots = scanSource(SRC)
  .map((h) => ({ ...h, gap: h.buttons - h.labels }))
  .filter((h) => h.gap > 0)
  .sort((a, b) => b.gap - a.gap)
  .slice(0, 10)

/** Roll every state's violations up into one list keyed by rule. */
const byRule = new Map()
for (const state of data.states) {
  for (const v of state.violations) {
    const existing = byRule.get(v.id)
    if (existing) {
      existing.totalNodes += v.total
      existing.states.push(state.title)
      existing.nodes.push(...v.nodes.map((n) => ({ ...n, state: state.title })))
    } else {
      byRule.set(v.id, {
        ...v,
        totalNodes: v.total,
        states: [state.title],
        nodes: v.nodes.map((n) => ({ ...n, state: state.title })),
      })
    }
  }
}
const rules = [...byRule.values()].sort(
  (a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || b.totalNodes - a.totalNodes,
)

const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 }
let affectedNodes = 0
for (const r of rules) {
  counts[r.impact] = (counts[r.impact] || 0) + 1
  affectedNodes += r.totalNodes
}

const onboarding = data.states.find((s) => s.id === 'onboarding')
const firstStop = onboarding?.focus?.[0]
const unnamedStops = data.states.map((s) => ({
  title: s.title,
  unnamed: s.focus.filter((f) => !f.hasName).length,
  total: s.focus.length,
}))

const MANUAL = [
  {
    id: 'dialog-focus-trap',
    impact: 'critical',
    title: 'Onboarding dialog does not trap focus',
    criterion: 'WCAG 2.4.3 Focus Order (A) · 2.1.2 No Keyboard Trap',
    body:
      'With <code>role="dialog" aria-modal="true"</code> open on first load, the first Tab press moves focus to a button behind the overlay instead of into the dialog. A keyboard or screen-reader user tabs through the entire canvas without ever reaching the two choice cards.',
    evidence: firstStop
      ? `First Tab stop was <code>&lt;${esc(firstStop.tag)}&gt;</code> — ${esc(firstStop.label)} — which sits behind the overlay.`
      : '',
    shot: firstStop?.shot || null,
    fix: 'Move initial focus into the dialog on mount, cycle Tab/Shift+Tab within it, close on Escape, and restore focus to the trigger on close.',
    where: 'src/components/OnboardingModal.tsx',
  },
  {
    id: 'background-not-inert',
    impact: 'serious',
    title: 'Background stays in the accessibility tree behind the modal',
    criterion: 'WCAG 4.1.2 Name, Role, Value (A)',
    body:
      'Running axe with the dialog open still reports every canvas and sidebar control, so nothing behind the overlay is hidden from assistive tech. Screen-reader users can browse and activate controls they cannot see.',
    evidence: `${onboarding ? onboarding.violations.reduce((n, v) => n + v.total, 0) : 0} background elements were still reachable and audited while the dialog was open.`,
    shot: onboarding?.full || null,
    fix: 'Apply <code>inert</code> (or <code>aria-hidden="true"</code>) to the app root while the dialog is mounted.',
    where: 'src/App.tsx, src/components/OnboardingModal.tsx',
  },
  {
    id: 'focus-visible-inconclusive',
    impact: 'moderate',
    title: 'Focus indicator visibility needs a manual pass',
    criterion: 'WCAG 2.4.7 Focus Visible (AA)',
    body:
      'The automated sweep treats any computed outline or box-shadow as a focus indicator, and Tailwind shadows satisfy that test even when nothing changes on focus. This check is reported as inconclusive rather than passing.',
    evidence:
      'Several components use <code>focus:outline-none</code> with a hover-only visual change, which is the pattern that typically fails this criterion.',
    shot: null,
    fix: 'Verify each control by tabbing with a keyboard, and pair every <code>focus:outline-none</code> with a <code>focus-visible:</code> ring.',
    where: 'src/components/Sidebar.tsx, src/components/FlowCanvas.tsx',
  },
]

const impactBadge = (impact) => `<span class="badge ${impact}">${impact}</span>`

const shotFigure = (src, caption) =>
  src
    ? `<figure class="shot"><a href="${src}" target="_blank" rel="noreferrer"><img src="${src}" alt="${esc(caption)}" loading="lazy"></a><figcaption>${esc(caption)}</figcaption></figure>`
    : ''

const wcagTags = (tags) =>
  tags
    .filter((t) => /^wcag\d|best-practice/.test(t))
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join('')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Accessibility report — ${esc(data.app)}</title>
<style>
  :root {
    --orange: #FC6839;
    --ink: #172537;
    --muted: #6F6F6F;
    --line: #E4E0DC;
    --bg: #FAF9F8;
    --critical: #C62A2F;
    --serious: #D2691E;
    --moderate: #B38600;
    --minor: #5B6B7C;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--ink);
    background: var(--bg);
    line-height: 1.55;
  }
  a { color: var(--orange); }
  .wrap { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 40px; max-width: 1400px; margin: 0 auto; padding: 40px 32px 96px; }
  nav { position: sticky; top: 40px; align-self: start; font-size: 14px; }
  nav h2 { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 24px 0 8px; }
  nav a { display: block; padding: 6px 10px; border-radius: 8px; text-decoration: none; color: var(--ink); }
  nav a:hover { background: #fff; }
  nav a:focus-visible { outline: 2px solid var(--orange); outline-offset: 2px; }
  header.hero { border-bottom: 1px solid var(--line); padding-bottom: 24px; margin-bottom: 32px; }
  .kicker { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--orange); font-weight: 600; margin: 0; }
  h1 { font-size: 34px; line-height: 1.15; margin: 8px 0 12px; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13px; color: var(--muted); }
  .meta code { background: #fff; border: 1px solid var(--line); padding: 1px 6px; border-radius: 5px; font-size: 12px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 24px 0 8px; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  .card .n { font-size: 30px; font-weight: 700; line-height: 1; }
  .card .l { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .card.critical .n { color: var(--critical); }
  .card.serious .n { color: var(--serious); }
  .card.moderate .n { color: var(--moderate); }
  section { margin-top: 48px; }
  h2.sec { font-size: 22px; margin: 0 0 6px; }
  .sec-note { color: var(--muted); font-size: 14px; margin: 0 0 20px; }
  .finding { background: #fff; border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 12px; padding: 20px 22px; margin-bottom: 18px; }
  .finding.critical { border-left-color: var(--critical); }
  .finding.serious { border-left-color: var(--serious); }
  .finding.moderate { border-left-color: var(--moderate); }
  .finding.minor { border-left-color: var(--minor); }
  .finding h3 { font-size: 17px; margin: 10px 0 4px; }
  .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 3px 8px; border-radius: 999px; color: #fff; }
  .badge.critical { background: var(--critical); }
  .badge.serious { background: var(--serious); }
  .badge.moderate { background: var(--moderate); }
  .badge.minor { background: var(--minor); }
  .tag { display: inline-block; font-size: 11px; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; margin: 0 4px 4px 0; }
  .count { font-size: 12px; color: var(--muted); font-weight: 600; }
  .fix { background: #FFF6F2; border: 1px solid #FFD9C9; border-radius: 10px; padding: 12px 14px; margin-top: 14px; font-size: 14px; }
  .fix strong { color: var(--orange); }
  main { min-width: 0; }
  pre { background: #1A1A1A; color: #F0F0F0; padding: 12px 14px; border-radius: 8px; overflow-x: auto; max-width: 100%; font-size: 12px; margin: 8px 0 0; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  details { margin-top: 14px; }
  summary { cursor: pointer; font-size: 14px; font-weight: 600; }
  .nodes { display: grid; gap: 16px; margin-top: 14px; min-width: 0; }
  .node { border-top: 1px solid var(--line); padding-top: 14px; min-width: 0; }
  .node .sel { font-size: 12px; color: var(--muted); word-break: break-all; }
  figure.shot { margin: 12px 0 0; }
  figure.shot img { max-width: 100%; border: 1px solid var(--line); border-radius: 8px; display: block; background: #fff; }
  figure.shot figcaption { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .states { display: grid; gap: 24px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; font-size: 14px; }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--line); }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  tr:last-child td { border-bottom: none; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .gap { color: var(--critical); font-weight: 700; }
  footer { margin-top: 64px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 13px; color: var(--muted); }
  @media (max-width: 900px) { .wrap { grid-template-columns: 1fr; } nav { position: static; } }
</style>
</head>
<body>
<div class="wrap">
<nav aria-label="Report sections">
  <strong>On this page</strong>
  <h2>Overview</h2>
  <a href="#summary">Summary</a>
  <a href="#screens">Screens audited</a>
  <h2>Findings</h2>
  <a href="#manual">Keyboard &amp; dialog issues</a>
  ${rules.map((r) => `<a href="#${esc(r.id)}">${esc(r.help)}</a>`).join('\n  ')}
  <h2>Fixing</h2>
  <a href="#hotspots">Source hotspots</a>
  <a href="#method">Method &amp; limits</a>
</nav>

<main>
<header class="hero">
  <p class="kicker">Accessibility audit</p>
  <h1>${esc(data.app)} — WCAG 2.1 AA report</h1>
  <div class="meta">
    <span>Target <code>${esc(data.url)}</code></span>
    <span>Viewport <code>${data.viewport.width}×${data.viewport.height}</code></span>
    <span>axe-core <code>${esc(data.axeVersion)}</code></span>
    <span>Run <code>${new Date(data.generatedAt).toLocaleString()}</code></span>
  </div>
</header>

<section id="summary" style="margin-top:0">
  <h2 class="sec">Summary</h2>
  <p class="sec-note">${rules.length} automated rule failures plus ${MANUAL.length} manual findings across ${data.states.length} screens. Every automated failure below has a captured screen grab with the offending element ringed in red.</p>
  <div class="cards">
    <div class="card critical"><div class="n">${counts.critical + MANUAL.filter((m) => m.impact === 'critical').length}</div><div class="l">Critical</div></div>
    <div class="card serious"><div class="n">${counts.serious + MANUAL.filter((m) => m.impact === 'serious').length}</div><div class="l">Serious</div></div>
    <div class="card moderate"><div class="n">${counts.moderate + MANUAL.filter((m) => m.impact === 'moderate').length}</div><div class="l">Moderate</div></div>
    <div class="card"><div class="n">${affectedNodes}</div><div class="l">Elements affected</div></div>
    <div class="card"><div class="n">${unnamedStops.reduce((n, s) => Math.max(n, s.unnamed), 0)}/${unnamedStops[0]?.total ?? 0}</div><div class="l">Tab stops with no name</div></div>
  </div>
  <div class="fix"><strong>Headline:</strong> the app is not currently keyboard- or screen-reader-operable. Most interactive controls are icon-only <code>&lt;button&gt;</code> elements with no accessible name, and the onboarding dialog neither traps focus nor hides the page behind it. Both are single-pattern fixes that clear the majority of the findings at once.</div>
</section>

<section id="screens">
  <h2 class="sec">Screens audited</h2>
  <p class="sec-note">Each screen was loaded in headless Chromium at 1440×900 and scanned with axe-core against WCAG 2.1 A/AA plus axe best practices.</p>
  <div class="states">
  ${data.states
    .map(
      (s) => `<div class="finding">
      <h3>${esc(s.title)}</h3>
      <p class="sec-note">${esc(s.note)} — <span class="count">${s.violations.length} rule failures, ${s.violations.reduce((n, v) => n + v.total, 0)} elements</span></p>
      ${shotFigure(s.full, `${s.title} — full page capture`)}
    </div>`,
    )
    .join('\n  ')}
  </div>
</section>

<section id="manual">
  <h2 class="sec">Keyboard &amp; dialog issues</h2>
  <p class="sec-note">Found by tabbing through each screen and re-running axe with the dialog open. Automated scanners do not catch these.</p>
  ${MANUAL.map(
    (m) => `<article class="finding ${m.impact}" id="${m.id}">
    ${impactBadge(m.impact)} <span class="tag">${esc(m.criterion)}</span>
    <h3>${esc(m.title)}</h3>
    <p>${m.body}</p>
    ${m.evidence ? `<p class="sec-note"><strong>Evidence.</strong> ${m.evidence}</p>` : ''}
    ${shotFigure(m.shot, `${m.title} — evidence`)}
    <div class="fix"><strong>Fix.</strong> ${m.fix}<br><span class="count">${esc(m.where)}</span></div>
  </article>`,
  ).join('\n  ')}
</section>

<section>
  <h2 class="sec">Automated failures</h2>
  <p class="sec-note">Grouped by axe rule, ordered by severity then number of elements affected.</p>
  ${rules
    .map(
      (r) => `<article class="finding ${r.impact}" id="${esc(r.id)}">
    ${impactBadge(r.impact)} <span class="count">${r.totalNodes} element${r.totalNodes === 1 ? '' : 's'} · ${esc(r.states.join(', '))}</span>
    <h3>${esc(r.help)}</h3>
    <p>${esc(r.description)}</p>
    <div>${wcagTags(r.tags)}</div>
    <div class="fix"><strong>Rule.</strong> <code>${esc(r.id)}</code> — <a href="${esc(r.helpUrl)}" target="_blank" rel="noreferrer">axe guidance for this rule</a></div>
    <details open>
      <summary>Screen grabs — ${Math.min(r.nodes.length, 5)} of ${r.totalNodes} affected element${r.totalNodes === 1 ? '' : 's'}</summary>
      <div class="nodes">
      ${r.nodes
        .slice(0, 5)
        .map(
          (n) => `<div class="node">
        <p class="sel">${esc(n.state)} · <code>${esc(n.selector)}</code></p>
        <pre>${esc(n.html)}</pre>
        ${n.failureSummary ? `<p class="sec-note">${esc(n.failureSummary).replace(/\n/g, '<br>')}</p>` : ''}
        ${shotFigure(n.shot, `${r.id} — offending element ringed in red`)}
      </div>`,
        )
        .join('\n      ')}
      </div>
    </details>
  </article>`,
    )
    .join('\n  ')}
</section>

<section id="hotspots">
  <h2 class="sec">Source hotspots</h2>
  <p class="sec-note">Components with more <code>&lt;button&gt;</code> elements than <code>aria-label</code> attributes. Start at the top to clear the <code>button-name</code> failures.</p>
  <table>
    <thead><tr><th>Component</th><th class="num">Buttons</th><th class="num">aria-labels</th><th class="num">Gap</th></tr></thead>
    <tbody>
    ${hotspots
      .map(
        (h) => `<tr><td><code>${esc(h.file)}</code></td><td class="num">${h.buttons}</td><td class="num">${h.labels}</td><td class="num gap">${h.gap}</td></tr>`,
      )
      .join('\n    ')}
    </tbody>
  </table>
</section>

<section id="method">
  <h2 class="sec">Method &amp; limits</h2>
  <div class="finding">
    <p>Headless Chromium (Playwright) loaded <code>${esc(data.url)}</code> at ${data.viewport.width}×${data.viewport.height} with a 2× pixel ratio. axe-core ${esc(data.axeVersion)} ran against <code>${esc(data.standard)}</code> on each screen. For every failure the element was scrolled into view, ringed, and captured with 48px of surrounding context. A separate pass tabbed ${unnamedStops[0]?.total ?? 0} stops per screen recording the accessible name and computed focus styling of each.</p>
    <p><strong>Limits.</strong> Only the two screens above were reached automatically — modals such as the hotspot builder, preview, and agentic chat are not yet covered. Automated rules catch roughly a third to a half of real barriers; colour contrast on gradients and images was reported as inconclusive by axe and still needs a manual check, as does focus-indicator visibility. No screen-reader (VoiceOver/NVDA) pass was performed.</p>
    <p><strong>Re-run.</strong> <code>node .cursor/a11y-audit/run-audit.cjs &amp;&amp; node .cursor/a11y-audit/build-report.cjs</code> — set <code>TARGET_URL</code> and <code>APP_NAME</code> to point it at another app.</p>
  </div>
</section>

<footer>Generated from a live audit run · ${esc(data.app)} · ${new Date(data.generatedAt).toLocaleString()}</footer>
</main>
</div>
</body>
</html>
`

fs.writeFileSync(path.join(OUT, 'report.html'), html)
console.log(`✓ report written: ${path.join(OUT, 'report.html')}`)
console.log(`  ${rules.length} automated rules, ${MANUAL.length} manual findings, ${affectedNodes} elements`)
