const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

async function reachable() {
  try { const r = await fetch(`${RELAY_URL}/health`); return r.ok } catch { return false }
}

async function run() {
  if (!(await reachable())) {
    console.log('audit_test: skipped (relay not reachable)')
    process.exit(0)
  }
  const post = await fetch(`${RELAY_URL}/relay`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iv: [1], data: [2], tag: [3], ttl_ms: 500 })
  })
  const j = await post.json()
  const first = await fetch(`${RELAY_URL}/blob/${j.id}`)
  if (!first.ok) throw new Error('blob fetch failed')
  await new Promise(r => setTimeout(r, 700))
  const audit = await fetch(`${RELAY_URL}/audit`)
  if (!audit.ok) throw new Error('audit failed')
  const records = await audit.json()
  const actions = records.filter(r => r.id === j.id).map(r => r.action).sort()
  const hasUpload = actions.includes('upload')
  const hasView = actions.includes('view')
  const hasExpire = actions.includes('expire')
  if (!hasUpload || !hasView || !hasExpire) throw new Error('audit entries missing')
  console.log('audit_test: ok')
}

run()

