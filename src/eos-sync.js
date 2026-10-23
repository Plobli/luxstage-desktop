const net = require('node:net')
const { encodeFramed, decode, FrameReader, SlipReader, detectFraming } = require('./osc')

const DEFAULT_PORT = 3037
const CONNECT_TIMEOUT_MS = 5000
const IDLE_TIMEOUT_MS = 4000
// Eos meldet sich beim Verbinden von selbst; kommt nichts, wird OSC 1.0 (Längenpräfix) angenommen.
const DETECT_TIMEOUT_MS = 1500
const MAX_RETRIES = 3

// Holt Patch (Kreis, Adresse, Label, Gerät, Notiz) per OSC vom Pult.
// Ablauf wie die Apps: Filter setzen, /eos/get/patch/count, dann index/<i> je Kreis.
// Eos antwortet je Index mit list + notes + augment3d; gezählt wird je Kreis/Part.
// Bei Stillstand werden offene Indizes erneut angefragt (Eos verwirft Anfragen bei Überlast).
function fetchPatch({ host, port = DEFAULT_PORT, onProgress }) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port })
    let reader = null
    let framing = null
    let detectTimer = null
    const entries = new Map()
    const notes = new Map()
    const answered = new Set()
    const noted = new Set()
    let expected = null
    let retries = 0
    let idleTimer = null
    let settled = false

    const send = (address, ...args) => socket.write(encodeFramed(framing, address, ...args))

    const finish = (error) => {
      if (settled) return
      settled = true
      clearTimeout(idleTimer)
      clearTimeout(detectTimer)
      socket.destroy()
      if (error) return reject(error)
      const patch = [...entries.values()]
        .map(e => ({ ...e, notes: notes.get(e.channel) ?? '' }))
        .sort((a, b) => Number(a.channel) - Number(b.channel))
      resolve({ patch, expected: expected ?? 0, complete: answered.size >= (expected ?? 0) })
    }

    const armIdle = (ms = IDLE_TIMEOUT_MS) => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(onIdle, ms)
    }

    const onIdle = () => {
      if (expected === null) return finish(new Error('Keine Antwort vom Pult (Eos OSC-TCP aktiv?)'))
      if (answered.size < expected && retries < MAX_RETRIES) {
        retries++
        for (let i = answered.size; i < expected; i++) send('/eos/get/patch/index/' + i)
        return armIdle()
      }
      finish()
    }

    const maybeDone = () => {
      if (expected !== null && answered.size >= expected && noted.size >= expected) finish()
    }

    socket.setTimeout(CONNECT_TIMEOUT_MS, () => {
      if (!socket.connecting) return
      finish(new Error(`Pult nicht erreichbar (${host}:${port})`))
    })
    socket.on('error', (err) => finish(new Error(`Verbindung fehlgeschlagen: ${err.message}`)))
    socket.on('close', () => finish())

    const start = (mode) => {
      if (framing) return
      framing = mode
      reader = mode === 'slip' ? new SlipReader() : new FrameReader()
      send('/eos/subscribe', 1)
      send('/eos/filter/add', '/eos/out/get/patch/*')
      send('/eos/get/patch/count')
      armIdle(CONNECT_TIMEOUT_MS)
    }

    socket.on('connect', () => {
      socket.setTimeout(0)
      detectTimer = setTimeout(() => start('length'), DETECT_TIMEOUT_MS)
    })

    socket.on('data', (chunk) => {
      if (!framing) {
        clearTimeout(detectTimer)
        start(detectFraming(chunk))
      }
      for (const raw of reader.push(chunk)) {
        const msg = decode(raw)
        if (!msg) continue
        if (msg.address === '/eos/out/get/patch/count') {
          expected = msg.ints[0] ?? 0
          if (expected === 0) return finish()
          for (let i = 0; i < expected; i++) send('/eos/get/patch/index/' + i)
          armIdle()
          continue
        }
        if (!msg.address.startsWith('/eos/out/get/patch/')) continue
        const parts = msg.address.slice('/eos/out/get/patch/'.length).split('/')
        const channel = parseInt(parts[0], 10)
        const part = parseInt(parts[1], 10)
        if (Number.isNaN(channel) || Number.isNaN(part)) continue
        const key = `${channel}/${part}`
        const kind = parts[2] ?? ''
        if (kind === 'list') {
          // Strings: UID, Label, Hersteller, Modell. Ints: Index, Adresse, ...
          if (!answered.has(key) && part <= 1) {
            const [, label = '', manufacturer = '', model = ''] = msg.strings
            entries.set(String(channel), {
              channel: String(channel),
              address: msg.ints[1] ? String(msg.ints[1]) : '',
              label,
              manufacturer,
              model,
            })
          }
          answered.add(key)
        } else if (kind === 'notes') {
          noted.add(key)
          if (part <= 1 && msg.strings[1]) notes.set(String(channel), msg.strings[1])
        } else if (kind === '') {
          answered.add(key)
          noted.add(key)
        }
        if (expected !== null) onProgress?.(Math.min(answered.size, expected), expected)
        armIdle()
        maybeDone()
      }
    })
  })
}

module.exports = { fetchPatch, DEFAULT_PORT }
