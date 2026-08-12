const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const dist = path.join(root, 'dist')
const skip = new Set(['node_modules', 'dist', '.git', '.vercel', '.DS_Store'])

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(dist, { recursive: true })

function copy(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const name of fs.readdirSync(src)) {
      if (skip.has(name)) continue
      copy(path.join(src, name), path.join(dest, name))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

copy(root, dist)
console.log('✓ dist ready')
