// Offline-Cache: Antworten der Web-App auf der Platte merken, bei Netzausfall daraus bedienen.
// Lesen funktioniert offline, Schreiben braucht weiter Netz.
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const MAX_BYTES = 500 * 1024 * 1024
const NETWORK_TIMEOUT_MS = 8000

// Nie aus dem Cache bedienen: sonst meldet die Web-App „online“ trotz Ausfall.
const NEVER = [/^\/api\/status$/, /^\/api\/auth\//]
// Nach Anmeldung/Abmeldung gehören Daten dem alten Nutzer: API-Cache leeren.
const RESET_ON = /^\/api\/auth\/(login|handoff)$/

const keyOf = (s) => crypto.createHash('sha1').update(s).digest('hex')

// Wie wird eine Anfrage behandelt? 'asset' (Cache zuerst), 'fresh' (Netz zuerst), 'skip' (durchreichen).
function classify({ url, method, accept = '', range = '' }, origins) {
  const u = new URL(url)
  if (!origins.includes(u.origin)) return 'skip'
  if (method !== 'GET' || range || accept.includes('text/event-stream')) return 'skip'
  if (NEVER.some((re) => re.test(u.pathname))) return 'skip'
  if (u.pathname.startsWith('/assets/')) return 'asset'
  return 'fresh'
}

function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true })
  const bin = (k) => path.join(dir, `${k}.bin`)
  const meta = (k) => path.join(dir, `${k}.json`)

  return {
    get(key) {
      const k = keyOf(key)
      try {
        const m = JSON.parse(fs.readFileSync(meta(k), 'utf8'))
        return { ...m, body: fs.readFileSync(bin(k)) }
      } catch {
        return null
      }
    },
    put(key, { status, contentType, body }) {
      const k = keyOf(key)
      const kind = key.includes('/api/') ? 'api' : 'static'
      fs.writeFileSync(bin(k), body)
      fs.writeFileSync(meta(k), JSON.stringify({ status, contentType, kind, url: key }))
    },
    // Löscht nur API-Antworten (Seiten und Dateien bleiben).
    clearApi() {
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json')) continue
        try {
          if (JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).kind !== 'api') continue
        } catch { /* kaputter Eintrag */ }
        fs.rmSync(path.join(dir, f), { force: true })
        fs.rmSync(path.join(dir, f.replace(/\.json$/, '.bin')), { force: true })
      }
    },
    clearAll() {
      fs.rmSync(dir, { recursive: true, force: true })
      fs.mkdirSync(dir, { recursive: true })
    },
    // Älteste Dateien zuerst löschen, bis das Limit wieder passt.
    prune(max = MAX_BYTES) {
      const files = fs.readdirSync(dir).map((f) => {
        const s = fs.statSync(path.join(dir, f))
        return { f, size: s.size, t: s.mtimeMs }
      })
      let total = files.reduce((n, x) => n + x.size, 0)
      for (const x of files.sort((a, b) => a.t - b.t)) {
        if (total <= max) break
        fs.rmSync(path.join(dir, x.f), { force: true })
        total -= x.size
      }
    },
  }
}

// Fallback für Seitenaufrufe (SPA): jede Route liefert dieselbe index.html.
const pageKey = (origin) => `${origin}/__page__`

function toResponse(entry) {
  return new Response(entry.body, {
    status: entry.status,
    headers: { 'content-type': entry.contentType || 'application/octet-stream', 'x-luxstage-cache': 'hit' },
  })
}

// Verbindet den Cache mit Electron: übernimmt https-Anfragen der Sitzung.
function install({ protocol, net, store, getOrigins }) {
  store.prune()

  protocol.handle('https', async (request) => {
    const passThrough = () => net.fetch(request, { bypassCustomProtocolHandlers: true })
    const origins = getOrigins()
    const kind = classify({
      url: request.url,
      method: request.method,
      accept: request.headers.get('accept') || '',
      range: request.headers.get('range') || '',
    }, origins)
    const u = new URL(request.url)

    if (kind === 'skip') {
      const res = await passThrough()
      if (RESET_ON.test(u.pathname) && origins.includes(u.origin) && res.ok) store.clearApi()
      return res
    }

    // Seitenaufrufe erkennt man am Accept-Header (mode ist in Electron immer „cors“).
    const isPage = (request.headers.get('accept') || '').includes('text/html') && !u.pathname.startsWith('/api/')
    const key = isPage ? pageKey(u.origin) : request.url

    if (kind === 'asset') {
      const hit = store.get(key)
      if (hit) return toResponse(hit)
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT_MS)
    request.signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
    try {
      const res = await net.fetch(request.url, {
        headers: request.headers,
        signal: ctrl.signal,
        bypassCustomProtocolHandlers: true,
      })
      clearTimeout(timer)
      if (res.status === 200) {
        const copy = res.clone()
        copy.arrayBuffer().then((buf) => {
          try {
            store.put(key, {
              status: 200,
              contentType: copy.headers.get('content-type'),
              body: Buffer.from(buf),
            })
          } catch { /* Platte voll o. ä.: ohne Cache weiter */ }
        }).catch(() => {})
      }
      // Server-Ausfall (Proxy, Neustart): lieber alten Stand zeigen.
      if (res.status >= 502 && res.status <= 504) {
        const hit = store.get(key)
        if (hit) return toResponse(hit)
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      const hit = store.get(key)
      if (hit) return toResponse(hit)
      throw err
    }
  })
}

module.exports = { install, createStore, classify, keyOf, MAX_BYTES }
