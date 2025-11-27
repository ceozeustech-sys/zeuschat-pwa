const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

async function reachable() {
  try {
    const res = await fetch(`${RELAY_URL}/health`)
    return res.ok
  } catch { return false }
}

async function post(ttl_ms) {
  const iv = crypto.randomBytes(12)
  const data = crypto.randomBytes(16)
  const tag = crypto.randomBytes(16)
  const r = await fetch(`${RELAY_URL}/relay`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iv: iv.toString('base64'), data: data.toString('base64'), tag: tag.toString('base64'), ttl_ms })
  })
  return r.json()
}

async function run() {
  if (!(await reachable())) {
    console.log('ttl_test: skipped (relay not reachable)')
    process.exit(0)
  }
  const a = await post(30000)
  const b = await post(60000)
  const c = await post(90000)
  const d = await post(180000)

  const resA = await fetch(`${RELAY_URL}/blob/${a.id}`)
  const resB = await fetch(`${RELAY_URL}/blob/${b.id}`)
  const resC = await fetch(`${RELAY_URL}/blob/${c.id}`)
  const resD = await fetch(`${RELAY_URL}/blob/${d.id}`)
  if (!resA.ok || !resB.ok || !resC.ok || !resD.ok) throw new Error('fetch failed')

  console.log('ttl_test: ok')
}

run()
