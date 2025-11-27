const crypto = require('crypto')
const { deriveKey, encrypt, decrypt } = require('../../client/shared/crypto/pin_kdf')

function run() {
  const pin = '1234'
  const salt = crypto.randomBytes(16)
  const key = deriveKey(pin, salt)
  const secret = crypto.randomBytes(32)
  const iv = crypto.randomBytes(12)
  const aad = Buffer.from('zeuschat')
  const { enc, tag } = encrypt(key, iv, secret, aad)
  const out = decrypt(key, iv, enc, tag, aad)
  if (!out.equals(secret)) throw new Error('unwrap failed')

  const wrong = deriveKey('9999', salt)
  let failed = false
  try {
    decrypt(wrong, iv, enc, tag, aad)
  } catch (e) {
    failed = true
  }
  if (!failed) throw new Error('wrong pin should fail')
  console.log('pin_harness: ok')
}

run()

