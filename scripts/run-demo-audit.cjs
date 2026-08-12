/* eslint-disable no-console */
/**
 * Generalized Consensus Demo Player a11y audit.
 * Usage: DEMO_SLUG=af5f0eba6 DEMO_URL=https://play.goconsensus.com/af5f0eba6 node run-demo-audit.cjs
 * Writes out/<slug>/results.json with shots in out/<slug>/shots/.
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('/Users/justinware/Dynamic_Translations/node_modules/playwright')

const AXE_PATH = '/Users/justinware/Ware-house2/node_modules/axe-core/axe.min.js'
const SLUG = process.env.DEMO_SLUG || 'af5f0eba6'
const TARGET = process.env.DEMO_URL || `https://play.goconsensus.com/${SLUG}`
const APP_NAME = process.env.APP_NAME || 'Consensus Demo Player'
const DEMO_LABEL = process.env.DEMO_LABEL || SLUG
const OUT = path.join(__dirname, 'out', SLUG)
const SHOTS = path.join(OUT, 'shots')
const VIEWPORT = { width: 1440, height: 900 }
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
const MAX_NODE_SHOTS = 5
const TAB_STOPS = 20

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(SHOTS, { recursive: true })

const slugify = (s) =>
  s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60)

const flattenTarget = (target) => {
  let t = target
  while (Array.isArray(t)) t = t[t.length - 1]
  return typeof t === 'string' ? t : null
}

const OT_SELECTORS = '#onetrust-consent-sdk, #onetrust-banner-sdk, .ot-floating-button, #onetrust-pc-sdk'

async function hideOneTrust(page) {
  await page.evaluate((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.style.display = 'none'
      el.setAttribute('aria-hidden', 'true')
    })
  }, OT_SELECTORS)
}

async function acceptCookies(page) {
  const accept = page.locator('#onetrust-accept-btn-handler')
  if (await accept.count()) {
    await accept.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(1200)
  }
  await hideOneTrust(page)
}

async function runAxe(page) {
  await page.addScriptTag({ path: AXE_PATH })
  return page.evaluate(
    (tags) =>
      window.axe.run(document, {
        runOnly: { type: 'tag', values: tags },
        resultTypes: ['violations', 'incomplete'],
        exclude: [
          ['#onetrust-consent-sdk'],
          ['#onetrust-banner-sdk'],
          ['.ot-floating-button'],
          ['#onetrust-pc-sdk'],
        ],
      }),
    AXE_TAGS,
  )
}

async function grabNode(page, selector, file) {
  const locator = page.locator(selector).first()
  const box = await locator.boundingBox().catch(() => null)
  if (!box || box.width < 1 || box.height < 1) return null
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  const fresh = await locator.boundingBox().catch(() => null)
  if (!fresh) return null

  await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return
    const r = el.getBoundingClientRect()
    const ring = document.createElement('div')
    ring.id = '__a11y_ring__'
    Object.assign(ring.style, {
      position: 'fixed',
      left: `${r.left - 3}px`,
      top: `${r.top - 3}px`,
      width: `${r.width + 6}px`,
      height: `${r.height + 6}px`,
      border: '3px solid #E5484D',
      borderRadius: '4px',
      boxShadow: '0 0 0 3px rgba(229,72,77,.28)',
      pointerEvents: 'none',
      zIndex: '2147483647',
    })
    document.body.appendChild(ring)
  }, selector)

  const pad = 48
  const clip = {
    x: Math.max(0, fresh.x - pad),
    y: Math.max(0, fresh.y - pad),
    width: Math.min(VIEWPORT.width, fresh.width + pad * 2),
    height: Math.min(VIEWPORT.height, Math.max(60, fresh.height + pad * 2)),
  }
  const rel = path.join('shots', file)
  await page.screenshot({ path: path.join(OUT, rel), clip }).catch(() => {})
  await page.evaluate(() => document.getElementById('__a11y_ring__')?.remove())
  return fs.existsSync(path.join(OUT, rel)) ? rel : null
}

/** Independent contrast measurement of themed controls (verifies the grey-theme claim). */
async function measureTheme(page) {
  return page.evaluate(() => {
    const srgb = (c) => {
      const v = c / 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    }
    const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
    const parse = (s) => (s.match(/\d+(\.\d+)?/g) || []).map(Number)
    const ratio = (fg, bg) => {
      const [r1, g1, b1] = parse(fg)
      const [r2, g2, b2] = parse(bg)
      if ([r1, g1, b1, r2, g2, b2].some((n) => n === undefined)) return null
      const L1 = lum(r1, g1, b1)
      const L2 = lum(r2, g2, b2)
      const hi = Math.max(L1, L2)
      const lo = Math.min(L1, L2)
      return +(((hi + 0.05) / (lo + 0.05)).toFixed(2))
    }
    const findBg = (el) => {
      let n = el
      while (n) {
        const bg = getComputedStyle(n).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
        n = n.parentElement
      }
      return 'rgb(255, 255, 255)'
    }
    const out = []
    const buttons = [...document.querySelectorAll('button')].filter(
      (b) => !b.closest('#onetrust-consent-sdk, #onetrust-pc-sdk, #onetrust-banner-sdk'),
    )
    for (const el of buttons.slice(0, 12)) {
      const text = (el.innerText || '').trim().slice(0, 40)
      if (!text) continue
      const cs = getComputedStyle(el)
      const bg = findBg(el)
      const r = ratio(cs.color, bg)
      if (r === null) continue
      out.push({ label: text, color: cs.color, background: bg, ratio: r, passesAA: r >= 4.5 })
    }
    return out
  })
}

/** Probe rating controls for the zero-size hit-target bug. */
async function probeRatingControls(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('input, [role="checkbox"], [role="radio"]')].filter(
      (el) => !el.closest('#onetrust-consent-sdk, #onetrust-pc-sdk, #onetrust-banner-sdk'),
    )
    return els.slice(0, 20).map((el) => {
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        role: el.getAttribute('role') || '',
        width: Math.round(r.width),
        height: Math.round(r.height),
        zeroSize: r.width === 0 || r.height === 0,
        tabIndex: el.tabIndex,
        name: el.getAttribute('name') || '',
        testid: el.getAttribute('data-testid') || '',
        accessibleName:
          el.getAttribute('aria-label') ||
          (el.labels && el.labels[0] ? (el.labels[0].innerText || '').trim() : '') ||
          '',
      }
    })
  })
}

async function auditFocusOrder(page, stateId) {
  const stops = []
  await page.evaluate(() => document.body.focus())
  for (let i = 0; i < TAB_STOPS * 2 && stops.length < TAB_STOPS; i += 1) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      if (el.closest('#onetrust-consent-sdk, #onetrust-banner-sdk, .ot-floating-button, #onetrust-pc-sdk')) {
        return { skip: true }
      }
      const cs = getComputedStyle(el)
      const outlineVisible =
        cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && cs.outlineColor !== 'transparent'
      const shadowVisible = cs.boxShadow !== 'none' && cs.boxShadow !== ''
      return {
        tag: el.tagName.toLowerCase(),
        label:
          el.getAttribute('aria-label') ||
          (el.textContent || '').trim().slice(0, 60) ||
          el.getAttribute('title') ||
          '(no accessible name)',
        hasName: Boolean(
          el.getAttribute('aria-label') ||
            (el.textContent || '').trim() ||
            el.getAttribute('title') ||
            el.getAttribute('aria-labelledby'),
        ),
        visibleFocus: outlineVisible || shadowVisible,
      }
    })
    if (!info) break
    if (info.skip) continue
    stops.push({ index: stops.length + 1, ...info })
  }
  return stops
}

async function captureState(page, state) {
  console.log(`\n▶ ${state.id}`)
  await state.setup(page)
  await page.waitForTimeout(800)

  const detected = await page.evaluate(() => (document.body.innerText || '').slice(0, 4000))
  const title = state.resolveTitle ? state.resolveTitle(detected) : state.title
  const note = state.resolveNote ? state.resolveNote(detected) : state.note

  const fullFile = path.join('shots', `${state.id}-full.png`)
  await page.screenshot({ path: path.join(OUT, fullFile), fullPage: true })

  const results = await runAxe(page)
  console.log(`  violations ${results.violations.length} · incomplete ${results.incomplete.length}`)

  const violations = []
  for (const v of results.violations) {
    const nodes = []
    for (const [i, node] of v.nodes.slice(0, MAX_NODE_SHOTS).entries()) {
      const selector = flattenTarget(node.target)
      let shot = null
      if (selector) shot = await grabNode(page, selector, `${state.id}-${slugify(v.id)}-${i + 1}.png`)
      nodes.push({
        selector: selector || String(node.target),
        html: node.html,
        failureSummary: node.failureSummary || '',
        impact: node.impact,
        shot,
      })
    }
    violations.push({
      id: v.id,
      impact: v.impact,
      help: v.help,
      description: v.description,
      helpUrl: v.helpUrl,
      tags: v.tags,
      total: v.nodes.length,
      nodes,
    })
  }

  const theme = state.measureTheme ? await measureTheme(page) : []
  const ratingControls = state.probeRating ? await probeRatingControls(page) : []
  const focus = state.checkFocus ? await auditFocusOrder(page, state.id) : []

  return {
    id: state.id,
    title,
    note,
    full: fullFile,
    violations,
    incomplete: results.incomplete.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      total: v.nodes.length,
    })),
    focus,
    theme,
    ratingControls,
    bodyTextSample: detected.slice(0, 500),
  }
}

const STATES = [
  {
    id: 'identity-cookies',
    title: 'Identity screen — cookie banner open',
    note: 'First paint with the OneTrust consent dialog over the “who are you” identity picker.',
    setup: async (page) => {
      await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(4500)
    },
    checkFocus: true,
  },
  {
    id: 'identity',
    title: 'Identity screen — viewer picker',
    note: 'After accepting cookies: “I’m new here” / named viewers, Contact me, Opt In toggle, legal footer.',
    setup: async (page) => {
      await acceptCookies(page)
      await page.waitForTimeout(600)
    },
    checkFocus: true,
    measureTheme: true,
    probeRating: true,
  },
  {
    id: 'opt-in',
    title: 'Opt-in consent modal',
    note: 'Consent gate shown after selecting a known viewer.',
    setup: async (page) => {
      const viewer = page.getByRole('button', { name: /Test User|Justin Ware/i }).first()
      if (await viewer.count()) await viewer.click({ timeout: 6000 }).catch(() => {})
      await page.waitForTimeout(2200)
    },
    checkFocus: true,
  },
  {
    id: 'post-continue',
    title: 'After opt-in',
    note: '',
    setup: async (page) => {
      const cont = page.getByRole('button', { name: /Opt-in and Continue/i }).first()
      if (await cont.count()) await cont.click({ timeout: 6000 }).catch(() => {})
      await page.waitForTimeout(6500)
      await hideOneTrust(page)
    },
    resolveTitle: (text) => {
      if (/expired/i.test(text)) return 'Post opt-in — demo expired notice'
      if (/topics are most important/i.test(text)) return 'Topic Rating screen'
      return 'After opt-in'
    },
    resolveNote: (text) => {
      if (/expired/i.test(text))
        return 'This share link now returns “This demo has expired.” — Topic Rating and the interactive product tour were not reachable in this pass.'
      if (/topics are most important/i.test(text))
        return 'Topic rating grid (Very / Somewhat / Not important) with Select all controls.'
      return 'State after submitting the opt-in consent.'
    },
    checkFocus: true,
    measureTheme: true,
    probeRating: true,
  },
]

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  const states = []
  for (const state of STATES) {
    try {
      states.push(await captureState(page, state))
    } catch (err) {
      console.error(`  ! ${state.id} failed: ${err.message}`)
    }
  }

  const axeVersion = await page.evaluate(() => window.axe?.version || 'unknown').catch(() => 'unknown')
  await browser.close()

  fs.writeFileSync(
    path.join(OUT, 'results.json'),
    JSON.stringify(
      {
        app: APP_NAME,
        demoSlug: SLUG,
        demoLabel: DEMO_LABEL,
        url: TARGET,
        generatedAt: new Date().toISOString(),
        viewport: VIEWPORT,
        axeVersion,
        standard: 'WCAG 2.1 A/AA + axe best practices',
        states,
      },
      null,
      2,
    ),
  )
  console.log(`\n✓ ${path.join(OUT, 'results.json')}`)
})()
