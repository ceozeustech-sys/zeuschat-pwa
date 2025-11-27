const crypto = require('crypto')

function deriveKey(pin, salt) {
  return crypto.scryptSync(pin, salt, 32)
}

function encrypt(key, iv, data, aad) {
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  if (aad) c.setAAD(aad)
  const enc = Buffer.concat([c.update(data), c.final()])
  const tag = c.getAuthTag()
  return { enc, tag }
}

function decrypt(key, iv, enc, tag, aad) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv)
  if (aad) d.setAAD(aad)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(enc), d.final()])
}

module.exports = { deriveKey, encrypt, decrypt }

