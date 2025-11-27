const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

async function run() {
  try {
    const res = await fetch(`${RELAY_URL}/health`)
    if (!res.ok) throw new Error('not ok')
  } catch (e) {
    console.log('provision_test: skipped (relay not reachable)')
    process.exit(0)
  }

  const start = await fetch(`${RELAY_URL}/provision/start`, { method: 'POST' })
  const j = await start.json()
  const token = j.token

  const kp = crypto.generateKeyPairSync('x25519')
  const pub = kp.publicKey.export({ type: 'spki', format: 'der' })
  const deviceId = crypto.randomBytes(8).toString('hex')

  const complete = await fetch(`${RELAY_URL}/provision/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, device_id: deviceId, pubkey: pub.toString('base64') })
  })
  if (!complete.ok) throw new Error('complete failed')

  const get = await fetch(`${RELAY_URL}/device/${deviceId}`)
  if (!get.ok) throw new Error('device not found')
  const dj = await get.json()
  if (dj.id !== deviceId) throw new Error('device mismatch')

  const again = await fetch(`${RELAY_URL}/provision/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, device_id: deviceId, pubkey: pub.toString('base64') })
  })
  if (again.status !== 400) throw new Error('token reuse should fail')

  console.log('provision_test: ok')
}

run()

