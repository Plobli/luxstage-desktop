const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createMirror, MAX_BYTES } = require('../src/offline-mirror')

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lux-mirror-'))
const key = 'luxstage.app|anna|show-1'

test('mirror: schreiben und lesen, unbekannter Schlüssel liefert null', () => {
  const m = createMirror(tmp())
  assert.equal(m.read(key), null)
  m.write(key, JSON.stringify({ a: 1 }))
  assert.equal(m.read(key), '{"a":1}')
  assert.equal(m.read('anderer|schluessel'), null)
})

test('mirror: überschreiben behält den vorherigen Stand, keine Temp-Datei bleibt liegen', () => {
  const dir = tmp()
  const m = createMirror(dir)
  m.write(key, '{"v":1}')
  m.write(key, '{"v":2}')
  assert.equal(m.read(key), '{"v":2}')
  const names = fs.readdirSync(dir)
  assert.ok(names.some((n) => n.endsWith('.prev.json')))
  assert.ok(!names.some((n) => n.endsWith('.tmp')))
})

test('mirror: zerstörte Hauptdatei fällt auf den vorherigen Stand zurück', () => {
  const dir = tmp()
  const m = createMirror(dir)
  m.write(key, '{"v":1}')
  m.write(key, '{"v":2}')
  const main = fs.readdirSync(dir).find((n) => n.endsWith('.json') && !n.endsWith('.prev.json'))
  fs.writeFileSync(path.join(dir, main), '{"v":2') // abgeschnitten
  assert.equal(m.read(key), '{"v":1}')
})

test('mirror: ohne gültige Datei null', () => {
  const dir = tmp()
  const m = createMirror(dir)
  m.write(key, '{"v":1}')
  for (const n of fs.readdirSync(dir)) fs.writeFileSync(path.join(dir, n), 'kaputt')
  assert.equal(m.read(key), null)
})

test('mirror: ungültige Schlüssel und Inhalte werden abgelehnt', () => {
  const m = createMirror(tmp())
  assert.throws(() => m.write('', '{}'))
  assert.throws(() => m.write(42, '{}'))
  assert.throws(() => m.write('x'.repeat(501), '{}'))
  assert.throws(() => m.write(key, ''))
  assert.throws(() => m.write(key, { a: 1 }))
  assert.throws(() => m.write(key, 'x'.repeat(MAX_BYTES + 1)))
  assert.equal(m.read(null), null)
})

test('mirror: Schlüssel mit Pfadzeichen landen nicht außerhalb des Ordners', () => {
  const dir = tmp()
  const m = createMirror(dir)
  m.write('../../etc/passwd', '{"x":1}')
  assert.deepEqual(fs.readdirSync(dir).filter((n) => !/^[0-9a-f]{40}(\.prev)?\.json$/.test(n)), [])
  assert.equal(m.read('../../etc/passwd'), '{"x":1}')
})

test('mirror: remove löscht alle Dateien des Schlüssels', () => {
  const dir = tmp()
  const m = createMirror(dir)
  m.write(key, '{"v":1}')
  m.write(key, '{"v":2}')
  m.remove(key)
  assert.equal(m.read(key), null)
  assert.deepEqual(fs.readdirSync(dir), [])
})
