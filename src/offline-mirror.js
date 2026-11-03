// Spiegeldatei für den Offline-Datenstand der Web-App: zweiter, vom Browser-Speicher unabhängiger Ort.
// Die Web-App (IndexedDB im Renderer) schreibt jeden Stand zusätzlich hierher und holt ihn zurück,
// falls IndexedDB leer oder beschädigt ist. Inhalt ist ein String der Web-App (versiegelter JSON-Datensatz),
// diese Datei prüft nur Größe und Form, nicht den Inhalt.
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const MAX_KEY = 500
const MAX_BYTES = 50 * 1024 * 1024

const keyOf = (key) => crypto.createHash('sha1').update(key).digest('hex')

function validKey(key) {
  return typeof key === 'string' && key.length > 0 && key.length <= MAX_KEY
}

function createMirror(dir) {
  const files = (key) => {
    const base = path.join(dir, keyOf(key))
    return { main: `${base}.json`, prev: `${base}.prev.json`, tmp: `${base}.tmp` }
  }
  const isJson = (text) => { try { JSON.parse(text); return true } catch { return false } }

  return {
    // Schreibt atomar (Temp-Datei, dann umbenennen) und behält den vorherigen Stand als .prev.
    write(key, text) {
      if (!validKey(key)) throw new Error('Ungültiger Schlüssel')
      if (typeof text !== 'string' || !text || Buffer.byteLength(text) > MAX_BYTES) throw new Error('Ungültiger Inhalt')
      fs.mkdirSync(dir, { recursive: true })
      const f = files(key)
      fs.writeFileSync(f.tmp, text)
      if (fs.existsSync(f.main)) fs.renameSync(f.main, f.prev)
      fs.renameSync(f.tmp, f.main)
    },
    // Liefert den Inhalt oder null. Ist die Hauptdatei unlesbar/zerstört, gilt der vorherige Stand.
    read(key) {
      if (!validKey(key)) return null
      const f = files(key)
      for (const file of [f.main, f.prev]) {
        try {
          const text = fs.readFileSync(file, 'utf8')
          if (isJson(text)) return text
        } catch { /* nächste Datei */ }
      }
      return null
    },
    remove(key) {
      if (!validKey(key)) return
      const f = files(key)
      for (const file of [f.main, f.prev, f.tmp]) fs.rmSync(file, { force: true })
    },
  }
}

module.exports = { createMirror, MAX_BYTES }
