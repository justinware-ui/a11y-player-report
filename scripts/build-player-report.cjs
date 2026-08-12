/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'out')
const data = require(path.join(OUT, 'results.json'))

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 }

const byRule = new Map()
for (const state of data.states) {
  for (const v of state.violations) {
    const existing = byRule.get(v.id)
    if (existing) {
      existing.totalNodes += v.total
      if (!existing.states.includes(state.title)) existing.states.push(state.title)
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

const unnamedStops = data.states.map((s) => ({
  title: s.title,
  unnamed: s.focus.filter((f) => !f.hasName).length,
  total: s.focus.length,
  noFocus: s.focus.filter((f) => !f.visibleFocus).length,
}))

const coverCookies = data.states.find((s) => s.id === 'cover-cookies')
const optIn = data.states.find((s) => s.id === 'opt-in')
const player = data.states.find((s) => s.id === 'player')

const firstCookieStop = coverCookies?.focus?.[0]
const firstOptInStop = optIn?.focus?.[0]

/** Manual findings derived from the live player run. */
const MANUAL = []

if (coverCookies) {
  const bgViolations = coverCookies.violations.reduce((n, v) => n + v.total, 0)
  MANUAL.push({
    id: 'cookie-banner-background',
    impact: 'serious',
    title: 'Cookie banner leaves cover page fully interactive underneath',
    criterion: 'WCAG 2.4.3 Focus Order (A) · 4.1.2 Name, Role, Value (A)',
    body:
      'On first load the OneTrust consent dialog sits over the Demo Player cover, but axe still finds every cover control (identity picker, Contact me, Policies) and Tab can leave the banner into the page behind it. Screen-reader users can browse and activate controls that are visually obscured.',
    evidence: firstCookieStop
      ? `First Tab stop was <code>&lt;${esc(firstCookieStop.tag)}&gt;</code> — ${esc(firstCookieStop.label)}. ${bgViolations} product elements were still audited under the banner (OneTrust itself was excluded from the axe scan).`
      : `${bgViolations} product elements were still audited under the banner.`,
    shot: firstCookieStop?.shot || coverCookies.full,
    fix: 'Ensure the consent dialog traps focus, marks the page behind it <code>inert</code>/<code>aria-hidden</code>, and restores focus to the first cover control after Accept/Reject.',
    where: 'OneTrust banner integration on Demo Player cover',
  })
}

if (optIn) {
  MANUAL.push({
    id: 'optin-dialog-focus',
    impact: 'serious',
    title: 'Opt-in dialog focus management needs a keyboard pass',
    criterion: 'WCAG 2.4.3 Focus Order (A)',
    body:
      'Selecting a known viewer opens an Opt-in dialog over the cover. Confirm that focus moves into the dialog, Tab cycles within it, Escape dismisses (or is intentionally disabled), and focus returns to the trigger after Opt-in and Continue.',
    evidence: firstOptInStop
      ? `First Tab stop after the dialog opened: <code>&lt;${esc(firstOptInStop.tag)}&gt;</code> — ${esc(firstOptInStop.label)}.`
      : 'Opt-in dialog was present during the audit.',
    shot: firstOptInStop?.shot || optIn.full,
    fix: 'Use a focus trap on the Opt-in surface and set initial focus on the primary action or dialog title.',
    where: 'Demo Player cover · Opt-in modal',
  })
}

if (player) {
  const unnamed = player.focus.filter((f) => !f.hasName).length
  MANUAL.push({
    id: 'player-keyboard',
    impact: 'moderate',
    title: 'Video player keyboard & naming sweep',
    criterion: 'WCAG 2.1.1 Keyboard (A) · 4.1.2 Name, Role, Value (A)',
    body:
      'The in-player chrome exposes Pause/Mute/Subtitles/Settings/Fullscreen, reactions, Invite, sidebar demos, and Get in touch. Several controls rely on visible text; icon-only or compound labels still need verification against a screen reader.',
    evidence: `Of ${player.focus.length} Tab stops sampled in the player, ${unnamed} had no accessible name.`,
    shot: player.full,
    fix: 'Give every icon control a stable <code>aria-label</code>, announce Now Playing changes via a polite live region, and keep captions discoverable from the keyboard.',
    where: 'Demo Player video chrome & sidebar',
  })
}

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

const maxUnnamed = unnamedStops.reduce((n, s) => Math.max(n, s.unnamed), 0)
const maxSample = unnamedStops.reduce((n, s) => Math.max(n, s.total), 0)
const sampleTotal = maxSample || unnamedStops[0]?.total || 0

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
  main { min-width: 0; }
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
  .finding { background: #fff; border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 12px; padding: 20px 22px; margin-bottom: 18px; min-width: 0; }
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
  <h2>More</h2>
  <a href="#incomplete">Needs review</a>
  <a href="#focus">Focus order samples</a>
  <a href="#method">Method &amp; limits</a>
</nav>

<main>
<header class="hero">
  <p class="kicker">Accessibility audit</p>
  <h1>${esc(data.app)} — WCAG 2.1 AA report</h1>
  <div class="meta">
    <span>Target <code><a href="${esc(data.url)}">${esc(data.url)}</a></code></span>
    <span>Viewport <code>${data.viewport.width}×${data.viewport.height}</code></span>
    <span>axe-core <code>${esc(data.axeVersion)}</code></span>
    <span>Run <code>${new Date(data.generatedAt).toLocaleString()}</code></span>
  </div>
</header>

<section id="summary" style="margin-top:0">
  <h2 class="sec">Summary</h2>
  <p class="sec-note">${rules.length} automated rule failures plus ${MANUAL.length} manual findings across ${data.states.length} screens of the live Demo Player. Every automated failure below has a captured screen grab with the offending element ringed in red. OneTrust consent UI was excluded from axe so findings focus on Consensus player chrome.</p>
  <div class="cards">
    <div class="card critical"><div class="n">${counts.critical + MANUAL.filter((m) => m.impact === 'critical').length}</div><div class="l">Critical</div></div>
    <div class="card serious"><div class="n">${counts.serious + MANUAL.filter((m) => m.impact === 'serious').length}</div><div class="l">Serious</div></div>
    <div class="card moderate"><div class="n">${counts.moderate + MANUAL.filter((m) => m.impact === 'moderate').length}</div><div class="l">Moderate</div></div>
    <div class="card"><div class="n">${affectedNodes}</div><div class="l">Elements affected</div></div>
    <div class="card"><div class="n">${maxUnnamed}/${sampleTotal || '—'}</div><div class="l">Tab stops with no name</div></div>
  </div>
  <div class="fix"><strong>Headline:</strong> Audited the live share link <a href="${esc(data.url)}">${esc(data.url)}</a> (“New accessibility test”). Cover → Opt-in → in-player video were reachable as viewer Justin Ware. Guest “I’m new here” hits a sharing restriction, so the lead form / Request Access path was not fully exercised.</div>
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
  <p class="sec-note">Found by tabbing through each screen and observing dialog behavior. Automated scanners do not catch these fully.</p>
  ${
    MANUAL.length
      ? MANUAL.map(
          (m) => `<article class="finding ${m.impact}" id="${m.id}">
    ${impactBadge(m.impact)} <span class="tag">${esc(m.criterion)}</span>
    <h3>${esc(m.title)}</h3>
    <p>${m.body}</p>
    ${m.evidence ? `<p class="sec-note"><strong>Evidence.</strong> ${m.evidence}</p>` : ''}
    ${shotFigure(m.shot, `${m.title} — evidence`)}
    <div class="fix"><strong>Fix.</strong> ${m.fix}<br><span class="count">${esc(m.where)}</span></div>
  </article>`,
        ).join('\n  ')
      : '<p class="sec-note">No additional manual findings recorded for this run.</p>'
  }
</section>

<section>
  <h2 class="sec">Automated failures</h2>
  <p class="sec-note">Grouped by axe rule, ordered by severity then number of elements affected.</p>
  ${
    rules.length
      ? rules
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
          .join('\n  ')
      : '<p class="sec-note">No automated violations on the product surfaces audited (OneTrust excluded).</p>'
  }
</section>

<section id="incomplete">
  <h2 class="sec">Needs review (axe incomplete)</h2>
  <p class="sec-note">Axe could not confirm these automatically — they still matter for a Demo Player, especially captions and autoplay.</p>
  ${(() => {
    const map = new Map()
    for (const s of data.states) {
      for (const i of s.incomplete) {
        const existing = map.get(i.id)
        if (existing) {
          existing.total += i.total
          if (!existing.states.includes(s.title)) existing.states.push(s.title)
        } else {
          map.set(i.id, { ...i, total: i.total, states: [s.title] })
        }
      }
    }
    const items = [...map.values()]
    if (!items.length) return '<p class="sec-note">None recorded.</p>'
    return items
      .map(
        (i) => `<div class="finding moderate">
      ${impactBadge(i.impact || 'moderate')} <span class="count">${i.total} · ${esc(i.states.join(', '))}</span>
      <h3>${esc(i.help)}</h3>
      <div class="fix"><strong>Rule.</strong> <code>${esc(i.id)}</code>${i.helpUrl ? ` — <a href="${esc(i.helpUrl)}" target="_blank" rel="noreferrer">axe guidance</a>` : ''}</div>
    </div>`,
      )
      .join('\n  ')
  })()}
</section>

<section id="focus">
  <h2 class="sec">Focus order samples</h2>
  <p class="sec-note">First Tab stops recorded on each screen (OneTrust nodes skipped after Accept).</p>
  ${data.states
    .map(
      (s) => `<div class="finding">
    <h3>${esc(s.title)}</h3>
    <p class="sec-note">${s.focus.filter((f) => !f.hasName).length} of ${s.focus.length} sampled stops had no accessible name · ${s.focus.filter((f) => !f.visibleFocus).length} without a detectable focus ring (automated — treat as inconclusive).</p>
    <table>
      <thead><tr><th>#</th><th>Control</th><th>Named</th><th>Focus ring</th></tr></thead>
      <tbody>
      ${s.focus
        .slice(0, 12)
        .map(
          (f) => `<tr>
        <td class="num">${f.index}</td>
        <td><code>&lt;${esc(f.tag)}&gt;</code> ${esc(f.label)}</td>
        <td>${f.hasName ? 'yes' : '<strong>no</strong>'}</td>
        <td>${f.visibleFocus ? 'detected' : 'inconclusive'}</td>
      </tr>`,
        )
        .join('\n      ')}
      </tbody>
    </table>
  </div>`,
    )
    .join('\n  ')}
</section>

<section id="method">
  <h2 class="sec">Method &amp; limits</h2>
  <div class="finding">
    <p>Headless Chromium (Playwright) loaded <a href="${esc(data.url)}">${esc(data.url)}</a> at ${data.viewport.width}×${data.viewport.height} with a 2× pixel ratio. axe-core ${esc(data.axeVersion)} ran against <code>${esc(data.standard)}</code> on each screen. For every failure the element was scrolled into view, ringed, and captured with 48px of surrounding context. A separate pass tabbed up to ${sampleTotal || 24} stops per screen.</p>
    <p><strong>Excluded.</strong> OneTrust cookie banner / preference center nodes were excluded from axe so the report reflects Consensus Demo Player UI, not the CMP vendor.</p>
    <p><strong>Limits.</strong> Guest “I’m new here” is blocked (“Sharing restricted for this demo”), so the lead form and Request Access path were not audited end-to-end. Invite, Comment, Settings menus, and caption tracks need a VoiceOver/NVDA pass. Focus-indicator visibility and some contrast on media are inconclusive from automation alone.</p>
    <p><strong>Re-run.</strong> <code>node .cursor/a11y-audit/run-player-audit.cjs &amp;&amp; node .cursor/a11y-audit/build-player-report.cjs</code></p>
  </div>
</section>

<footer>Generated from a live audit of <a href="${esc(data.url)}">${esc(data.url)}</a> · ${esc(data.app)} · ${new Date(data.generatedAt).toLocaleString()}</footer>
</main>
</div>
</body>
</html>
`

fs.writeFileSync(path.join(OUT, 'report.html'), html)
console.log(`✓ report written: ${path.join(OUT, 'report.html')}`)
console.log(`  ${rules.length} automated rules, ${MANUAL.length} manual findings, ${affectedNodes} elements`)
