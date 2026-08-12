/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { chromium } = require('/Users/justinware/Dynamic_Translations/node_modules/playwright')

const AXE_PATH = '/Users/justinware/Ware-house2/node_modules/axe-core/axe.min.js'
const TARGET = process.env.TARGET_URL || 'http://localhost:5173'
const APP_NAME = process.env.APP_NAME || 'Demo Flow Builder'
const OUT = path.join(__dirname, 'out')
const SHOTS = path.join(OUT, 'shots')
const VIEWPORT = { width: 1440, height: 900 }
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
const MAX_NODE_SHOTS = 5
const TAB_STOPS = 24

fs.mkdirSync(SHOTS, { recursive: true })

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60)

/** axe targets can be nested arrays (iframe paths); take the deepest selector. */
const flattenTarget = (target) => {
  let t = target
  while (Array.isArray(t)) t = t[t.length - 1]
  return typeof t === 'string' ? t : null
}

async function runAxe(page) {
  await page.addScriptTag({ path: AXE_PATH })
  return page.evaluate(
    (tags) =>
      window.axe.run(document, {
        runOnly: { type: 'tag', values: tags },
        resultTypes: ['violations', 'incomplete'],
      }),
    AXE_TAGS,
  )
}

/** Draw a highlight ring on an element, screenshot a padded region around it, then clean up. */
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
    height: Math.min(900, fresh.height + pad * 2),
  }

  const rel = path.join('shots', file)
  await page.screenshot({ path: path.join(OUT, rel), clip }).catch(() => {})
  await page.evaluate(() => document.getElementById('__a11y_ring__')?.remove())
  return fs.existsSync(path.join(OUT, rel)) ? rel : null
}

/** Tab through the page recording each stop and whether it shows a visible focus indicator. */
async function auditFocusOrder(page, stateId) {
  const stops = []
  await page.evaluate(() => document.body.focus())
  for (let i = 0; i < TAB_STOPS; i += 1) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      const outlineVisible =
        cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && cs.outlineColor !== 'transparent'
      const shadowVisible = cs.boxShadow !== 'none' && cs.boxShadow !== ''
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName.toLowerCase(),
        label:
          el.getAttribute('aria-label') ||
          (el.textContent || '').trim().slice(0, 60) ||
          el.getAttribute('title') ||
          '(no accessible name)',
        role: el.getAttribute('role') || '',
        hasName: Boolean(
          el.getAttribute('aria-label') ||
            (el.textContent || '').trim() ||
            el.getAttribute('title') ||
            el.getAttribute('aria-labelledby'),
        ),
        visibleFocus: outlineVisible || shadowVisible,
        offscreen: r.width === 0 || r.height === 0,
        html: el.outerHTML.slice(0, 220),
      }
    })
    if (!info) break
    const file = `${stateId}-focus-${i + 1}.png`
    let shot = null
    const box = await page
      .evaluate(() => {
        const r = document.activeElement.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      })
      .catch(() => null)
    if (box && box.width > 0 && box.height > 0) {
      const pad = 40
      const clip = {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: Math.min(VIEWPORT.width, box.width + pad * 2),
        height: Math.min(900, box.height + pad * 2),
      }
      await page.screenshot({ path: path.join(OUT, 'shots', file), clip }).catch(() => {})
      if (fs.existsSync(path.join(OUT, 'shots', file))) shot = path.join('shots', file)
    }
    stops.push({ index: i + 1, ...info, shot })
  }
  return stops
}

async function captureState(page, state) {
  console.log(`\n▶ state: ${state.id}`)
  const consoleErrors = []
  const onMsg = (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
  }
  page.on('console', onMsg)

  await state.setup(page)
  await page.waitForTimeout(700)

  const fullFile = path.join('shots', `${state.id}-full.png`)
  await page.screenshot({ path: path.join(OUT, fullFile), fullPage: true })

  const results = await runAxe(page)
  console.log(`  violations: ${results.violations.length}, incomplete: ${results.incomplete.length}`)

  const violations = []
  for (const v of results.violations) {
    const nodes = []
    for (const [i, node] of v.nodes.slice(0, MAX_NODE_SHOTS).entries()) {
      const selector = flattenTarget(node.target)
      let shot = null
      if (selector) {
        shot = await grabNode(page, selector, `${state.id}-${slug(v.id)}-${i + 1}.png`)
      }
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

  const incomplete = results.incomplete.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags,
    total: v.nodes.length,
  }))

  const focus = state.checkFocus ? await auditFocusOrder(page, state.id) : []
  page.off('console', onMsg)

  return {
    id: state.id,
    title: state.title,
    note: state.note,
    full: fullFile,
    violations,
    incomplete,
    focus,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
  }
}

const STATES = [
  {
    id: 'onboarding',
    title: 'First load — onboarding dialog',
    note: 'The modal that asks how you want to build the Discovery Demo.',
    setup: async (page) => {
      await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(1200)
    },
    checkFocus: true,
  },
  {
    id: 'canvas',
    title: 'Flow canvas — manual build',
    note: 'Main authoring surface after dismissing onboarding: sidebar, header, React Flow canvas.',
    setup: async (page) => {
      const manual = page.locator('[aria-label*="manual" i], [aria-label*="Build" i]').first()
      if (await manual.count()) {
        await manual.click({ timeout: 5000 }).catch(() => {})
      } else {
        const buttons = page.locator('[role="dialog"] button')
        if (await buttons.count()) await buttons.last().click({ timeout: 5000 }).catch(() => {})
      }
      await page.waitForTimeout(1500)
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(500)
    },
    checkFocus: true,
  },
]

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
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

  const payload = {
    app: APP_NAME,
    url: TARGET,
    generatedAt: new Date().toISOString(),
    viewport: VIEWPORT,
    axeVersion,
    standard: 'WCAG 2.1 A/AA + axe best practices',
    states,
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(payload, null, 2))
  console.log(`\n✓ results written to ${path.join(OUT, 'results.json')}`)
})()
