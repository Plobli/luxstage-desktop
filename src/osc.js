// OSC 1.0 über TCP (Eos, Port 3037): jedes Paket mit 4-Byte-Längenpräfix (big-endian).

function oscString(value) {
  const bytes = Buffer.from(String(value), 'utf8')
  const padded = Buffer.alloc(Math.ceil((bytes.length + 1) / 4) * 4)
  bytes.copy(padded)
  return padded
}

function int32(value) {
  const buf = Buffer.alloc(4)
  buf.writeInt32BE(value)
  return buf
}

function encodePacket(address, ...args) {
  const tags = ',' + args.map(a => (typeof a === 'string' ? 's' : 'i')).join('')
  const parts = [oscString(address), oscString(tags)]
  for (const a of args) parts.push(typeof a === 'string' ? oscString(a) : int32(a))
  return Buffer.concat(parts)
}

const END = 0xc0
const ESC = 0xdb
const ESC_END = 0xdc
const ESC_ESC = 0xdd

// OSC 1.1: SLIP-Framing (RFC 1055), END vor und nach dem Paket.
function slipFrame(packet) {
  const out = [END]
  for (const byte of packet) {
    if (byte === END) out.push(ESC, ESC_END)
    else if (byte === ESC) out.push(ESC, ESC_ESC)
    else out.push(byte)
  }
  out.push(END)
  return Buffer.from(out)
}

function lengthFrame(packet) {
  return Buffer.concat([int32(packet.length), packet])
}

// framing: 'length' (OSC 1.0) oder 'slip' (OSC 1.1)
function encode(address, ...args) {
  return lengthFrame(encodePacket(address, ...args))
}

function encodeFramed(framing, address, ...args) {
  const packet = encodePacket(address, ...args)
  return framing === 'slip' ? slipFrame(packet) : lengthFrame(packet)
}

function readString(buf, state) {
  const end = buf.indexOf(0, state.offset)
  if (end === -1) return null
  const value = buf.toString('utf8', state.offset, end)
  state.offset += Math.ceil((end - state.offset + 1) / 4) * 4
  return value
}

// Liefert { address, strings, ints, floats }; Strings und Zahlen getrennt indiziert (wie in den Apps).
function decode(buf) {
  const state = { offset: 0 }
  const address = readString(buf, state)
  if (address === null) return null
  const tags = readString(buf, state) ?? ','
  const strings = []
  const ints = []
  const floats = []
  for (const tag of tags.slice(1)) {
    if (tag === 's') {
      const s = readString(buf, state)
      if (s === null) break
      strings.push(s)
    } else if (tag === 'i' || tag === 'r' || tag === 'c') {
      if (state.offset + 4 > buf.length) break
      ints.push(buf.readInt32BE(state.offset))
      state.offset += 4
    } else if (tag === 'f') {
      if (state.offset + 4 > buf.length) break
      floats.push(buf.readFloatBE(state.offset))
      state.offset += 4
    } else if (tag === 'T' || tag === 'F' || tag === 'N' || tag === 'I') {
      // keine Nutzdaten
    } else if (tag === 'h' || tag === 'd' || tag === 't') {
      state.offset += 8
    } else {
      break
    }
  }
  return { address, strings, ints, floats }
}

// Sammelt TCP-Stücke und gibt vollständige Pakete zurück.
class FrameReader {
  constructor() { this.buffer = Buffer.alloc(0) }

  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    const packets = []
    while (this.buffer.length >= 4) {
      const size = this.buffer.readUInt32BE(0)
      if (this.buffer.length < 4 + size) break
      packets.push(this.buffer.subarray(4, 4 + size))
      this.buffer = this.buffer.subarray(4 + size)
    }
    return packets
  }
}

class SlipReader {
  constructor() { this.current = []; this.escaped = false }

  push(chunk) {
    const packets = []
    for (const byte of chunk) {
      if (this.escaped) {
        this.current.push(byte === ESC_END ? END : byte === ESC_ESC ? ESC : byte)
        this.escaped = false
      } else if (byte === ESC) {
        this.escaped = true
      } else if (byte === END) {
        if (this.current.length) packets.push(Buffer.from(this.current))
        this.current = []
      } else {
        this.current.push(byte)
      }
    }
    return packets
  }
}

// Eos sendet beim Verbinden sofort Status; das erste Byte verrät das Framing (SLIP beginnt mit 0xC0).
function detectFraming(firstChunk) {
  return firstChunk[0] === END ? 'slip' : 'length'
}

module.exports = { encode, encodeFramed, decode, FrameReader, SlipReader, detectFraming }
