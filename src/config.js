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

// "demo" -> https://demo.luxstage.app; "demo.luxstage.app" -> https://...; localhost[:port] -> http://...
// Eine Eingabe mit http(s):// bleibt erhalten.
function normalizeServerUrl(input) {
  let value = String(input || '').trim().replace(/\/+$/, '')
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) {
    if (/^[a-z0-9-]+$/i.test(value)) value = `${value.toLowerCase()}.luxstage.app`
    const local = /^(localhost|127\.0\.0\.1|\[::1\]|[^/]+\.local)(:\d+)?(\/|$)/i.test(value)
    value = `${local ? 'http' : 'https'}://${value}`
  }
  try {
    const url = new URL(value)
    return url.hostname.includes('.') || url.hostname === 'localhost' || url.hostname === '[::1]' ? url.origin : null
  } catch {
    return null
  }
}

module.exports = { load, save, normalizeServerUrl }
