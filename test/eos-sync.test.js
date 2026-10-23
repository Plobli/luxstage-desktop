const test = require('node:test')
const assert = require('node:assert/strict')
const net = require('node:net')
const { encode, decode, FrameReader } = require('../src/osc')
const { fetchPatch } = require('../src/eos-sync')

// Baut eine Eos-Antwort mit gemischten Typen: Strings (UID, Label, Hersteller, Modell), Ints (Index, Adresse).
function listReply(channel, index, address, label, manufacturer, model) {
  const addr = `/eos/out/get/patch/${channel}/1/list/0/21`
  const parts = [str(addr), str(',issssi'), i32(index), str('uid' + channel), str(label), str(manufacturer), str(model), i32(address)]
  return frame(Buffer.concat(parts))
}
function notesReply(channel, text) {
  return frame(Buffer.concat([str(`/eos/out/get/patch/${channel}/1/notes`), str(',ss'), str('uid' + channel), str(text)]))
}
const str = (s) => { const b = Buffer.from(s); const p = Buffer.alloc(Math.ceil((b.length + 1) / 4) * 4); b.copy(p); return p }
const i32 = (n) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b }
const frame = (p) => Buffer.concat([i32(p.length), p])

test('encode/decode roundtrip', () => {
  const [packet] = new FrameReader().push(encode('/eos/filter/add', '/eos/out/get/patch/*'))
  assert.deepEqual(decode(packet), { address: '/eos/filter/add', strings: ['/eos/out/get/patch/*'], ints: [], floats: [] })
})

test('FrameReader setzt zerstückelte Pakete zusammen', () => {
  const data = encode('/eos/ping', 'x')
  const reader = new FrameReader()
  assert.equal(reader.push(data.subarray(0, 5)).length, 0)
  assert.equal(reader.push(data.subarray(5)).length, 1)
})

test('fetchPatch liest Patch von Mock-Pult', async () => {
  const server = net.createServer((sock) => {
    const reader = new FrameReader()
    sock.on('data', (chunk) => {
      for (const raw of reader.push(chunk)) {
        const msg = decode(raw)
        if (msg.address === '/eos/get/patch/count') {
          sock.write(frame(Buffer.concat([str('/eos/out/get/patch/count'), str(',i'), i32(2)])))
        } else if (msg.address === '/eos/get/patch/index/0') {
          sock.write(listReply(101, 0, 513, 'Front', 'ETC', 'Source_Four'))
          sock.write(notesReply(101, 'Gobo'))
        } else if (msg.address === '/eos/get/patch/index/1') {
          sock.write(listReply(5, 1, 1, '', '', ''))
          sock.write(notesReply(5, ''))
        }
      }
    })
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const result = await fetchPatch({ host: '127.0.0.1', port: server.address().port })
  server.close()
  assert.equal(result.complete, true)
  assert.deepEqual(result.patch.map(p => p.channel), ['5', '101'])
  assert.deepEqual(result.patch[1], { channel: '101', address: '513', label: 'Front', manufacturer: 'ETC', model: 'Source_Four', notes: 'Gobo' })
})

test('fetchPatch meldet unerreichbares Pult', async () => {
  await assert.rejects(fetchPatch({ host: '127.0.0.1', port: 1 }), /fehlgeschlagen|nicht erreichbar/)
})

test('SLIP-Framing: Roundtrip und Erkennung', () => {
  const { encodeFramed, SlipReader, detectFraming } = require('../src/osc')
  const data = encodeFramed('slip', '/eos/out/user', 9)
  assert.equal(detectFraming(data), 'slip')
  const [packet] = new SlipReader().push(data)
  assert.deepEqual(decode(packet), { address: '/eos/out/user', strings: [], ints: [9], floats: [] })
})
