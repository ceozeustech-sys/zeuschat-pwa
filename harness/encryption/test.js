const crypto = require('crypto')

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
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  if (aad) cipher.setAAD(aad)
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return { enc, tag }
}

function aesGcmDecrypt(key, iv, ciphertext, tag, aad) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  if (aad) decipher.setAAD(aad)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

function nextChainKey(chainKey) {
  return hkdf(chainKey, Buffer.alloc(0), Buffer.from('ZEUSCHAIN'), 32)
}

function messageKey(chainKey) {
  return hkdf(chainKey, Buffer.alloc(0), Buffer.from('ZEUSMSG'), 32)
}

function runHarness() {
  const alice = genX25519()
  const bob = genX25519()
  const sAB = deriveShared(alice.privateKey, bob.publicKey)
  const sBA = deriveShared(bob.privateKey, alice.publicKey)
  if (!sAB.equals(sBA)) throw new Error('ECDH mismatch')
  let chainA = hkdf(sAB, Buffer.alloc(0), Buffer.from('ZEUSINIT'), 32)
  let chainB = hkdf(sBA, Buffer.alloc(0), Buffer.from('ZEUSINIT'), 32)

  const aad = Buffer.from('zeuschat')
  const store = new Map()

  for (let i = 0; i < 3; i++) {
    const mk = messageKey(chainA)
    const iv = crypto.randomBytes(12)
    const pt = Buffer.from(`hello-${i}`)
    const { enc, tag } = aesGcmEncrypt(mk, iv, pt, aad)
    const id = crypto.randomBytes(8).toString('hex')
    store.set(id, { iv, enc, tag, viewed: false, ttl: 3000 })
    chainA = nextChainKey(chainA)

    const mkRecv = messageKey(chainB)
    const blob = store.get(id)
    const dec = aesGcmDecrypt(mkRecv, blob.iv, blob.enc, blob.tag, aad)
    if (!dec.equals(pt)) throw new Error('Decryption failed')
    store.delete(id)
    chainB = nextChainKey(chainB)
  }

  for (const [id, blob] of store.entries()) {
    setTimeout(() => {
      if (store.has(id)) store.delete(id)
    }, blob.ttl)
  }

  console.log('encryption_harness: ok')
}

runHarness()
