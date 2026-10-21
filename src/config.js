const { app } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const file = () => path.join(app.getPath('userData'), 'config.json')

function load() {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8'))
  } catch {
    return {}
  }
}

function save(patch) {
  const next = { ...load(), ...patch }
  fs.mkdirSync(path.dirname(file()), { recursive: true })
  fs.writeFileSync(file(), JSON.stringify(next, null, 2))
  return next
}

// "demo" -> https://demo.luxstage.app; volle URLs (z. B. http://localhost:5173) bleiben erhalten.
function normalizeServerUrl(input) {
  const value = String(input || '').trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).origin
    } catch {
      return null
    }
  }
  if (/^[a-z0-9-]+$/i.test(value)) return `https://${value.toLowerCase()}.luxstage.app`
  return null
}

module.exports = { load, save, normalizeServerUrl }
