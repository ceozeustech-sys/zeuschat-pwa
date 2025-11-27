const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

async function reachable() {
  try { const r = await fetch(`${RELAY_URL}/health`); return r.ok } catch { return false }
}

async function run() {
  if (!(await reachable())) {
    console.log('inbox_test: skipped (relay not reachable)')
    process.exit(0)
  }
  const iv = crypto.randomBytes(12)
  const data = crypto.randomBytes(64)
  const tag = crypto.randomBytes(16)
  const deviceId = crypto.randomBytes(8).toString('hex')
  const post = await fetch(`${RELAY_URL}/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, iv: iv.toString('base64'), data: data.toString('base64'), tag: tag.toString('base64'), ttl_ms: 30000 })
  })
  const j = await post.json()
  const inbox = await fetch(`${RELAY_URL}/inbox/${deviceId}`)
  if (!inbox.ok) throw new Error('inbox pop failed')
  const idj = await inbox.json()
  if (idj.id !== j.id) throw new Error('inbox id mismatch')

  const first = await fetch(`${RELAY_URL}/blob/${j.id}`)
  if (!first.ok) throw new Error('blob fetch failed')
  const second = await fetch(`${RELAY_URL}/blob/${j.id}`)
  if (second.status !== 404) throw new Error('second blob should be 404')
  const empty = await fetch(`${RELAY_URL}/inbox/${deviceId}`)
  if (empty.status !== 204) throw new Error('inbox should be empty')
  console.log('inbox_test: ok')
}

run()
