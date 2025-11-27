const crypto = require('crypto')

function b64(buf) { return Buffer.from(buf).toString('base64') }

async function run() {
  const { hkdfSha256 } = await import('../../client/mobile/shared/hkdf.js')
  const pass = 'secret'
  const salt = crypto.randomBytes(16)
  const js = await hkdfSha256(pass, b64(salt), 'ZEUSPIN', 32)
  const node = crypto.hkdfSync('sha256', Buffer.from(pass), salt, Buffer.from('ZEUSPIN'), 32)
  if (js !== b64(node)) throw new Error('hkdf fallback mismatch')
  console.log('hkdf_fallback_test: ok')
}

run()

