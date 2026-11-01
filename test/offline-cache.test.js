const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createStore, classify } = require('../src/offline-cache')

const origins = ['https://team.luxstage.app']
const base = { method: 'GET', accept: '' }

test('classify: Assets zuerst aus dem Cache', () => {
  assert.equal(classify({ ...base, url: 'https://team.luxstage.app/assets/App-abc.js' }, origins), 'asset')
})

test('classify: API und Seiten Netz zuerst', () => {
  assert.equal(classify({ ...base, url: 'https://team.luxstage.app/api/shows' }, origins), 'fresh')
  assert.equal(classify({ ...base, url: 'https://team.luxstage.app/shows/1' }, origins), 'fresh')
})

test('classify: Status, Anmeldung, Schreiben, Stream, Range, fremde Hosts durchreichen', () => {
  for (const url of ['https://team.luxstage.app/api/status', 'https://team.luxstage.app/api/auth/validate']) {
    assert.equal(classify({ ...base, url }, origins), 'skip')
  }
  assert.equal(classify({ ...base, method: 'POST', url: 'https://team.luxstage.app/api/shows' }, origins), 'skip')
  assert.equal(classify({ ...base, accept: 'text/event-stream', url: 'https://team.luxstage.app/api/x' }, origins), 'skip')
  assert.equal(classify({ ...base, range: 'bytes=0-9', url: 'https://team.luxstage.app/assets/a.mp4' }, origins), 'skip')
  assert.equal(classify({ ...base, url: 'https://fremd.example/api/shows' }, origins), 'skip')
})

test('store: speichern, lesen, API leeren', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-'))
  const s = createStore(dir)
  s.put('https://team.luxstage.app/api/shows', { status: 200, contentType: 'application/json', body: Buffer.from('[1]') })
  s.put('https://team.luxstage.app/assets/a.js', { status: 200, contentType: 'text/javascript', body: Buffer.from('x') })
  assert.equal(s.get('https://team.luxstage.app/api/shows').body.toString(), '[1]')
  s.clearApi()
  assert.equal(s.get('https://team.luxstage.app/api/shows'), null)
  assert.equal(s.get('https://team.luxstage.app/assets/a.js').contentType, 'text/javascript')
})

test('store: prune löscht Älteste zuerst', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-'))
  const s = createStore(dir)
  s.put('https://t/a', { status: 200, contentType: 'x', body: Buffer.alloc(1000) })
  const old = Date.now() / 1000 - 100
  for (const f of fs.readdirSync(dir)) fs.utimesSync(path.join(dir, f), old, old)
  s.put('https://t/b', { status: 200, contentType: 'x', body: Buffer.alloc(1000) })
  s.prune(1200)
  assert.equal(s.get('https://t/a'), null)
  assert.ok(s.get('https://t/b'))
})
