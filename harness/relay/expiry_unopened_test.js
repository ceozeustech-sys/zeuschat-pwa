const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

async function reachable() { try { const r = await fetch(`${RELAY_URL}/health`); return r.ok } catch { return false } }

async function run() {
  if (!(await reachable())) { console.log('expiry_unopened_test: skipped (relay not reachable)'); process.exit(0) }
  const iv = crypto.randomBytes(12)
  const data = crypto.randomBytes(16)
  const tag = crypto.randomBytes(16)
  const post = await fetch(`${RELAY_URL}/relay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ iv: iv.toString('base64'), data: data.toString('base64'), tag: tag.toString('base64'), ttl_ms: 500 }) })
  const j = await post.json()
  await new Promise(r => setTimeout(r, 700))
  const res = await fetch(`${RELAY_URL}/blob/${j.id}`)
  if (res.status !== 404) throw new Error('unopened should expire')
  console.log('expiry_unopened_test: ok')
}

run()

