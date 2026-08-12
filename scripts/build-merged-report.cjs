/* eslint-disable no-console */
/**
 * Builds the multi-demo merged a11y pack (3 tabs) at public/a11y-audit/merged.html.
 * Tabs: Demos audited · Backlog · Shared component bugs
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
    claudeDocs: ['consensus-player-a11y-audit-be2376b21.md', 'consensus-player-a11y-audit-by-team.md'],
    coverage: 'Cover → Opt-In → video player reached',
  },
  {
    slug: 'af5f0eba6',
    label: 'Dylan Standard personalized with tours',
    url: 'https://play.goconsensus.com/af5f0eba6',
    results: path.join(OUT, 'af5f0eba6', 'results.json'),
    backlog: path.join(MERGED, 'backlog-af5f0eba6.json'),
    shotRoot: 'af5f0eba6/',
    backlogDoc: 'merged/backlog-af5f0eba6.md',
    claudeDocs: ['consensus-player-a11y-audit-af5f0eba6-by-team.md'],
    coverage: 'Identity → Opt-In → Topic Rating reached; product tour gated behind rating + cross-origin iframe',
  },
]

const SRC_LABELS = {
  'claude-by-team': 'Claude · by team',
  'claude-be2376': 'Claude · be2376',
  'claude-af5f0eba6': 'Claude · af5f0eba6',
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

  return `<article class="demo-block" id="demo-${esc(d.slug)}">
  <header class="demo-head">
    <h2>${esc(d.label)}</h2>
    <div class="meta">
      <span>URL <code><a href="${esc(d.url)}" target="_blank" rel="noreferrer">${esc(d.url)}</a></code></span>
      <span>axe <code>${esc(d.results.axeVersion)}</code></span>
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

  <h3 class="sub">Screens captured</h3>
  <div class="states">
  ${(d.results.states || [])
    .map(
      (s) => `<div class="finding">
      <h4>${esc(s.title)}</h4>
      <p class="sec-note">${esc(s.note)} — ${s.violations.length} axe rules, ${s.violations.reduce(
        (n, v) => n + v.total,
        0,
      )} elements</p>
      ${
        d.shotExists(s.full)
          ? `<figure class="shot"><a href="${d.shotHref(s.full)}" target="_blank" rel="noreferrer"><img src="${d.shotHref(
              s.full,
            )}" alt="${esc(s.title)}" loading="lazy"></a></figure>`
          : ''
      }
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
    <li>Cursor — live Playwright + axe-core run (<code>${esc(d.results.axeVersion)}</code>)</li>
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
    title: 'Topic-rating controls at 0×0 with no accessible name',
    demos: 'af5f0eba6 (Cursor-confirmed), a754d887d + be2376b21 (Claude)',
    note: 'Three demos. Keyboard users cannot rate topics; rating is required to proceed.',
  },
  {
    title: 'Modal close (X) button unlabeled',
    demos: 'be2376b21, af5f0eba6 (both Cursor axe-confirmed)',
    note: 'Single shared modal-header component.',
  },
  {
    title: 'Opt-In toggle unlabeled (and 0×0 on af5f0eba6)',
    demos: 'be2376b21, af5f0eba6',
    note: 'Shared switch component; axe label rule fires on both.',
  },
  {
    title: 'Corrupted / duplicated legal disclaimer copy',
    demos: 'All three demos',
    note: 'Template or string-concatenation bug; read in full by screen readers.',
  },
  {
    title: 'Required-field indication is visual only',
    demos: 'be2376b21, af5f0eba6',
    note: 'No required / aria-required on asterisked fields.',
  },
  {
    title: 'Missing landmarks, generic document titles, heading-order gaps',
    demos: 'Both audited demos',
    note: 'Structural fixes at the player shell.',
  },
]

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
</header>

<div class="tabs" role="tablist" aria-label="Audit report sections">
  <button class="tab" role="tab" id="tab-demos" aria-controls="panel-demos" aria-selected="true" data-target="panel-demos"><span class="dot"></span>Demos audited</button>
  <button class="tab backlog" role="tab" id="tab-backlog" aria-controls="panel-backlog" aria-selected="false" data-target="panel-backlog"><span class="dot"></span>Backlog</button>
  <button class="tab shared" role="tab" id="tab-shared" aria-controls="panel-shared" aria-selected="false" data-target="panel-shared"><span class="dot"></span>Shared component bugs</button>
</div>

<section class="panel active" id="panel-demos" role="tabpanel" aria-labelledby="tab-demos">
  <p class="jump">Jump to: ${jumpDemos}</p>
  ${demos.map(renderDemoSection).join('\n')}
</section>

<section class="panel" id="panel-backlog" role="tabpanel" aria-labelledby="tab-backlog">
  <header class="demo-head">
    <h2>Fix backlog</h2>
    <p class="sec-note">All Design vs Engineering tickets across both demos — P0 → P1 → P2 within each demo.</p>
  </header>
  <p class="jump">Jump to: ${jumpBacklogs}</p>
  ${demos.map(renderBacklogSection).join('\n')}
</section>

<section class="panel" id="panel-shared" role="tabpanel" aria-labelledby="tab-shared">
  <header class="demo-head">
    <h2>Bugs that reproduce across demos</h2>
    <p class="sec-note">These are single shared-component or shared-template defects. Fixing each once clears the same finding on every demo — highest leverage work in the whole pack.</p>
  </header>
  <table>
    <thead><tr><th>Finding</th><th>Seen on</th><th>Why it matters</th></tr></thead>
    <tbody>
      ${SHARED.map(
        (s) => `<tr><td><strong>${esc(s.title)}</strong></td><td>${esc(s.demos)}</td><td>${esc(s.note)}</td></tr>`,
      ).join('')}
    </tbody>
  </table>
  <div class="fix" style="margin-top:20px"><strong>Recommended order.</strong> 1) Rating hit-target + radio semantics · 2) Modal close + Opt-In toggle labels · 3) Required-field indication · 4) Legal-copy template bug · 5) Landmarks, titles, heading order · 6) Per-demo theme/contrast config safety net.</div>
</section>

<footer>
  Pack lives at <code>/a11y-audit/</code> ·
  <a href="report.html">Cursor-only report (single video)</a>
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
  // In-panel jump links that need the backlog/demos tab open first
  document.querySelectorAll('.jump a[href^="#backlog-"]').forEach((a) => {
    a.addEventListener('click', () => select('panel-backlog'));
  });
  document.querySelectorAll('.jump a[href^="#demo-"]').forEach((a) => {
    a.addEventListener('click', () => select('panel-demos'));
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
  }
</script>
</body>
</html>`

fs.writeFileSync(path.join(OUT, 'merged.html'), html)
// Keep nested index in sync if present
if (fs.existsSync(MERGED)) {
  fs.writeFileSync(path.join(MERGED, 'index.html'), html)
}
console.log(`✓ ${path.join(OUT, 'merged.html')}`)
console.log(`  3 tabs · ${demos.length} demos · ${totals.items} backlog items · ${totals.p0} P0`)
