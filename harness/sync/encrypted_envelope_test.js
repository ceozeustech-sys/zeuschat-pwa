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

function aesGcmDecrypt(key, iv, ciphertext, tag, aad) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv)
  if (aad) d.setAAD(aad)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ciphertext), d.final()])
}

async function reachable() {
  try { const r = await fetch(`${RELAY_URL}/health`); return r.ok } catch { return false }
}

async function run() {
  if (!(await reachable())) {
    console.log('encrypted_envelope_test: skipped (relay not reachable)')
    process.exit(0)
  }
  const deviceKP = genX25519()
  const devicePubDer = deviceKP.publicKey.export({ type: 'spki', format: 'der' })
  const deviceId = crypto.randomBytes(8).toString('hex')

  const start = await fetch(`${RELAY_URL}/provision/start`, { method: 'POST' })
  const sj = await start.json()

  const complete = await fetch(`${RELAY_URL}/provision/complete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: sj.token, device_id: deviceId, pubkey: devicePubDer.toString('base64') })
  })
  if (!complete.ok) throw new Error('complete failed')

  const ephem = genX25519()
  const devicePub = crypto.createPublicKey({ key: devicePubDer, format: 'der', type: 'spki' })
  const shared = deriveShared(ephem.privateKey, devicePub)
  const key = hkdf(shared, Buffer.alloc(0), Buffer.from('ZEUSENV'), 32)
  const iv = crypto.randomBytes(12)
  const aad = Buffer.from('zeuschat')
  const secret = crypto.randomBytes(32)
  const { enc, tag } = aesGcmEncrypt(key, iv, secret, aad)

  const ephemDer = ephem.publicKey.export({ type: 'spki', format: 'der' })
  const envelopeObj = {
    epk: ephemDer.toString('base64'),
    iv: iv.toString('base64'),
    data: enc.toString('base64'),
    tag: tag.toString('base64')
  }
  const envelopeB64 = Buffer.from(JSON.stringify(envelopeObj)).toString('base64')

  const put = await fetch(`${RELAY_URL}/sync/put`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, envelope: envelopeB64 })
  })
  if (!put.ok) throw new Error('sync put failed')

  const get = await fetch(`${RELAY_URL}/sync/${deviceId}`)
  if (!get.ok) throw new Error('sync get failed')
  const gj = await get.json()
  const envGot = JSON.parse(Buffer.from(gj.envelope, 'base64').toString('utf8'))

  const epkPub = crypto.createPublicKey({ key: Buffer.from(envGot.epk, 'base64'), format: 'der', type: 'spki' })
  const sharedRecv = deriveShared(deviceKP.privateKey, epkPub)
  const keyRecv = hkdf(sharedRecv, Buffer.alloc(0), Buffer.from('ZEUSENV'), 32)
  const dec = aesGcmDecrypt(keyRecv, Buffer.from(envGot.iv, 'base64'), Buffer.from(envGot.data, 'base64'), Buffer.from(envGot.tag, 'base64'), aad)
  if (!dec.equals(secret)) throw new Error('envelope decrypt failed')

  const second = await fetch(`${RELAY_URL}/sync/${deviceId}`)
  if (second.status !== 204) throw new Error('second get should be empty')
  console.log('encrypted_envelope_test: ok')
}

run()

