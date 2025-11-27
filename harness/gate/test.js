const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

async function reachable() { try { const r = await fetch(`${RELAY_URL}/health`); return r.ok } catch { return false } }

function b64(buf) { return Buffer.from(buf).toString('base64') }

async function run() {
  if (!(await reachable())) { console.log('gate_test: skipped (relay not reachable)'); process.exit(0) }
  const sender = crypto.randomBytes(8).toString('hex')
  const recipient = crypto.randomBytes(8).toString('hex')
  const iv = crypto.randomBytes(12)
  const data = crypto.randomBytes(16)
  const tag = crypto.randomBytes(16)
  const pass = 'secret'
  const passHash = b64(Buffer.from(pass))
  const send = await fetch(`${RELAY_URL}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: recipient, iv: b64(iv), data: b64(data), tag: b64(tag), ttl_ms: 10000, sender_id: sender, pass_hash: passHash }) })
  const j = await send.json()
  const inbox = await fetch(`${RELAY_URL}/inbox/${recipient}`)
  const got = await inbox.json()
  const wrong = await fetch(`${RELAY_URL}/gate/${got.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pass_hash: b64(Buffer.from('wrong')) }) })
  if (wrong.status !== 403) throw new Error('expected 403 on wrong password')
  const ack = await fetch(`${RELAY_URL}/ack/${sender}`)
  if (ack.status !== 200) throw new Error('expected ack available')
  const aj = await ack.json()
  if (aj.status !== 'no_delivery' || aj.blob_id !== got.id) throw new Error('ack mismatch')
  const again = await fetch(`${RELAY_URL}/blob/${got.id}`)
  if (again.status !== 404) throw new Error('blob should be deleted')
  console.log('gate_test: ok')
}

run()

