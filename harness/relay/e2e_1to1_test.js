const crypto = require('crypto')

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8080'

function gen() { return crypto.generateKeyPairSync('x25519') }
function dh(aPriv, bPub) { return crypto.diffieHellman({ privateKey: aPriv, publicKey: bPub }) }
function hkdf(s, salt, info, len) { return crypto.hkdfSync('sha256', s, salt, info, len) }
function enc(k, iv, p, aad) { const c = crypto.createCipheriv('aes-256-gcm', k, iv); if (aad) c.setAAD(aad); const e = Buffer.concat([c.update(p), c.final()]); const t = c.getAuthTag(); return { e, t } }
function dec(k, iv, e, t, aad) { const d = crypto.createDecipheriv('aes-256-gcm', k, iv); if (aad) d.setAAD(aad); d.setAuthTag(t); return Buffer.concat([d.update(e), d.final()]) }

async function reachable() { try { const r = await fetch(`${RELAY_URL}/health`); return r.ok } catch { return false } }

async function run() {
  if (!(await reachable())) { console.log('e2e_1to1_test: skipped (relay not reachable)'); process.exit(0) }
  const alice = gen(), bob = gen()
  const sAB = dh(alice.privateKey, bob.publicKey)
  const chain = hkdf(sAB, Buffer.alloc(0), Buffer.from('ZEUSINIT'), 32)
  const mk = hkdf(chain, Buffer.alloc(0), Buffer.from('ZEUSMSG'), 32)
  const iv = crypto.randomBytes(12)
  const aad = Buffer.from('zeuschat')
  const pt = Buffer.from('e2e')
  const { e, t } = enc(mk, iv, pt, aad)
  const deviceId = crypto.randomBytes(8).toString('hex')
  const post = await fetch(`${RELAY_URL}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: deviceId, iv: iv.toString('base64'), data: e.toString('base64'), tag: t.toString('base64'), ttl_ms: 30000 }) })
  const j = await post.json()
  const inbox = await fetch(`${RELAY_URL}/inbox/${deviceId}`)
  if (!inbox.ok) throw new Error('inbox failed')
  const idj = await inbox.json()
  const first = await fetch(`${RELAY_URL}/blob/${idj.id}`)
  if (!first.ok) throw new Error('blob fetch failed')
  const b = await first.json()
  const eRecv = Buffer.from(b.data, 'base64')
  const decPT = dec(mk, Buffer.from(b.iv, 'base64'), eRecv, Buffer.from(b.tag, 'base64'), aad)
  if (!decPT.equals(pt)) throw new Error('decrypt failed')
  const again = await fetch(`${RELAY_URL}/blob/${idj.id}`)
  if (again.status !== 404) throw new Error('second blob should be 404')
  console.log('e2e_1to1_test: ok')
}

run()

