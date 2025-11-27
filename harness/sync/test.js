const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

async function reachable() {
  try { const r = await fetch(`${RELAY_URL}/health`); return r.ok } catch { return false }
}

async function run() {
  if (!(await reachable())) {
    console.log('sync_test: skipped (relay not reachable)')
    process.exit(0)
  }
  const deviceId = crypto.randomBytes(8).toString('hex')
  const env = crypto.randomBytes(64)
  const put = await fetch(`${RELAY_URL}/sync/put`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, envelope: env.toString('base64') })
  })
  if (!put.ok) throw new Error('sync put failed')
  const first = await fetch(`${RELAY_URL}/sync/${deviceId}`)
  if (!first.ok) throw new Error('sync get failed')
  const j = await first.json()
  const got = Buffer.from(j.envelope, 'base64')
  if (!got.equals(env)) throw new Error('envelope mismatch')
  const second = await fetch(`${RELAY_URL}/sync/${deviceId}`)
  if (second.status !== 204) throw new Error('second get should be empty')
  console.log('sync_test: ok')
}

run()

