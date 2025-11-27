const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

function genX25519() {
  return crypto.generateKeyPairSync('x25519')
}

function deriveShared(aPriv, bPub) {
  return crypto.diffieHellman({ privateKey: aPriv, publicKey: bPub })
}

function hkdf(secret, salt, info, len) {
  return crypto.hkdfSync('sha256', secret, salt, info, len)
}

function aesGcmEncrypt(key, iv, plaintext, aad) {
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  if (aad) c.setAAD(aad)
  const enc = Buffer.concat([c.update(plaintext), c.final()])
  const tag = c.getAuthTag()
  return { enc, tag }
}

function messageKey(chainKey) {
  return hkdf(chainKey, Buffer.alloc(0), Buffer.from('ZEUSMSG'), 32)
}

async function run() {
  try {
    const res = await fetch(`${RELAY_URL}/health`)
    if (!res.ok) throw new Error('not ok')
  } catch (e) {
    console.log('media_test: skipped (relay not reachable)')
    process.exit(0)
  }

  const alice = genX25519()
  const bob = genX25519()
  const sAB = deriveShared(alice.privateKey, bob.publicKey)
  const chainA = hkdf(sAB, Buffer.alloc(0), Buffer.from('ZEUSINIT'), 32)
  const mk = messageKey(chainA)
  const iv = crypto.randomBytes(12)
  const aad = Buffer.from('zeuschat')
  const media = crypto.randomBytes(1024)
  const { enc, tag } = aesGcmEncrypt(mk, iv, media, aad)

  const post = await fetch(`${RELAY_URL}/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iv: iv.toString('base64'), data: enc.toString('base64'), tag: tag.toString('base64'), ttl_ms: 60000 })
  })
  const j = await post.json()

  const first = await fetch(`${RELAY_URL}/blob/${j.id}`)
  if (!first.ok) throw new Error('first fetch failed')
  const blob = await first.json()
  const got = Buffer.from(blob.data, 'base64')
  if (!got.equals(enc)) throw new Error('payload mismatch')
  const second = await fetch(`${RELAY_URL}/blob/${j.id}`)
  if (second.status !== 404) throw new Error('second fetch should be 404')
  console.log('media_test: ok')
}

run()
