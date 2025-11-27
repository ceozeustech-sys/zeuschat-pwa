export async function hkdfSha256(password, saltB64, info, length) {
  const saltBytes = saltB64 ? fromB64(saltB64) : ''
  const passBytes = []
  for (let i = 0; i < password.length; i++) passBytes.push(password.charCodeAt(i) & 0xff)
  const saltArr = []
  for (let i = 0; i < saltBytes.length; i++) saltArr.push(saltBytes.charCodeAt(i) & 0xff)
  const input = new Uint8Array(passBytes)
  const salt = new Uint8Array(saltArr)
  const subtle = globalThis.crypto && globalThis.crypto.subtle
  if (subtle && subtle.importKey) {
    const key = await subtle.importKey('raw', input, { name: 'HKDF' }, false, ['deriveBits'])
    const bits = await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(info) }, key, length * 8)
    const out = new Uint8Array(bits)
    return b64(out)
  }
  const out = hkdfJs(input, salt, toBytes(info), length)
  return b64(out)
}

function b64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b0 = bytes[i++] || 0
    const b1 = bytes[i++] || 0
    const b2 = bytes[i++] || 0
    const trip = (b0 << 16) | (b1 << 8) | b2
    out += chars[(trip >> 18) & 63]
    out += chars[(trip >> 12) & 63]
    out += i - 2 > bytes.length ? '=' : chars[(trip >> 6) & 63]
    out += i - 1 > bytes.length ? '=' : chars[trip & 63]
  }
  const mod = bytes.length % 3
  if (mod === 1) out = out.slice(0, -2) + '=='
  if (mod === 2) out = out.slice(0, -1) + '='
  return out
}

function toBytes(s) {
  const a = []
  for (let i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 0xff)
  return new Uint8Array(a)
}

function hkdfJs(ikm, salt, info, length) {
  const prk = hmacSha256(salt, ikm)
  const blocks = []
  let prev = new Uint8Array(0)
  while (blocks.reduce((n, b) => n + b.length, 0) < length) {
    const data = concat(prev, info, new Uint8Array([blocks.length + 1]))
    prev = hmacSha256(prk, data)
    blocks.push(prev)
  }
  const okm = new Uint8Array(length)
  let off = 0
  for (const b of blocks) {
    const take = Math.min(b.length, length - off)
    okm.set(b.subarray(0, take), off)
    off += take
    if (off >= length) break
  }
  return okm
}

function hmacSha256(key, msg) {
  const blockSize = 64
  let k = key
  if (k.length > blockSize) k = sha256(k)
  if (k.length < blockSize) {
    const tmp = new Uint8Array(blockSize)
    tmp.set(k)
    k = tmp
  }
  const o = new Uint8Array(blockSize)
  const i = new Uint8Array(blockSize)
  for (let idx = 0; idx < blockSize; idx++) {
    o[idx] = k[idx] ^ 0x5c
    i[idx] = k[idx] ^ 0x36
  }
  const inner = sha256(concat(i, msg))
  return sha256(concat(o, inner))
}

function sha256(msg) {
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ])
  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19])
  const l = msg.length
  const ml = l * 8
  const withOne = new Uint8Array(l + 1)
  withOne.set(msg)
  withOne[l] = 0x80
  let padLen = ((withOne.length + 8 + 64 - 1) & ~63) - withOne.length
  const padded = new Uint8Array(withOne.length + padLen + 8)
  padded.set(withOne)
  for (let i = 0; i < 8; i++) padded[padded.length - 1 - i] = (ml >>> (i * 8)) & 0xff
  const w = new Uint32Array(64)
  for (let pos = 0; pos < padded.length; pos += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = (padded[pos + t*4] << 24) | (padded[pos + t*4 + 1] << 16) | (padded[pos + t*4 + 2] << 8) | (padded[pos + t*4 + 3])
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ror(w[t-15],7) ^ ror(w[t-15],18) ^ (w[t-15] >>> 3)
      const s1 = ror(w[t-1],17) ^ ror(w[t-1],19) ^ (w[t-1] >>> 10)
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0
    }
    let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7]
    for (let t = 0; t < 64; t++) {
      const S1 = ror(e,6) ^ ror(e,11) ^ ror(e,25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0
      const S0 = ror(a,2) ^ ror(a,13) ^ ror(a,22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    H[0] = (H[0] + a) >>> 0
    H[1] = (H[1] + b) >>> 0
    H[2] = (H[2] + c) >>> 0
    H[3] = (H[3] + d) >>> 0
    H[4] = (H[4] + e) >>> 0
    H[5] = (H[5] + f) >>> 0
    H[6] = (H[6] + g) >>> 0
    H[7] = (H[7] + h) >>> 0
  }
  const out = new Uint8Array(32)
  for (let i = 0; i < 8; i++) {
    out[i*4] = (H[i] >>> 24) & 0xff
    out[i*4+1] = (H[i] >>> 16) & 0xff
    out[i*4+2] = (H[i] >>> 8) & 0xff
    out[i*4+3] = H[i] & 0xff
  }
  return out
}

function ror(x, n) { return (x >>> n) | (x << (32 - n)) }

function concat(a, b, c) {
  const len = a.length + b.length + (c ? c.length : 0)
  const out = new Uint8Array(len)
  out.set(a, 0)
  out.set(b, a.length)
  if (c) out.set(c, a.length + b.length)
  return out
}

function fromB64(s) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const lookup = {}
  for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i
  const out = []
  let i = 0
  while (i < s.length) {
    const c0 = lookup[s[i++]]
    const c1 = lookup[s[i++]]
    const c2 = s[i] === '=' ? -1 : lookup[s[i]]; i++
    const c3 = s[i] === '=' ? -1 : lookup[s[i]]; i++
    const trip = ((c0 & 63) << 18) | ((c1 & 63) << 12) | ((c2 & 63) << 6) | (c3 & 63)
    out.push((trip >> 16) & 0xff)
    if (c2 !== -1) out.push((trip >> 8) & 0xff)
    if (c3 !== -1) out.push(trip & 0xff)
  }
  let str = ''
  for (let j = 0; j < out.length; j++) str += String.fromCharCode(out[j])
  return str
}
