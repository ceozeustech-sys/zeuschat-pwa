const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

async function reachable() { try { const r = await fetch(`${RELAY_URL}/health`); return r.ok } catch { return false } }

function genId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `Z-${s}`
}

async function run() {
  if (!(await reachable())) { console.log('id_test: skipped (relay not reachable)'); process.exit(0) }
  const deviceId = crypto.randomBytes(8).toString('hex')
  const zeusId = genId()
  const reg = await fetch(`${RELAY_URL}/id/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: deviceId, zeus_id: zeusId }) })
  if (!reg.ok) throw new Error('register failed')
  const look = await fetch(`${RELAY_URL}/id/${zeusId}`)
  if (!look.ok) throw new Error('lookup failed')
  const j = await look.json()
  if (j.device_id !== deviceId) throw new Error('lookup mismatch')
  console.log('id_test: ok')
}

run()

