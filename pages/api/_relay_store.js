const inbox = new Map()
const blobs = new Map()
const users = new Map() // code -> { name, phone, passwordHashB64, avatarB64, status }
const contacts = new Map() // ownerCode -> [{ code, alias }]
const acks = new Map() // code -> { blobId, reason }
const sms = new Map() // phone -> code
const emails = new Map() // email -> code

function genId() {
  let s = ''
  for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16)
  return s
}

export function sendTo(code, payload, ttlMs) {
  const id = genId()
  blobs.set(id, { id, payload, exp: Date.now() + (ttlMs || 30000) })
  const q = inbox.get(code) || []
  q.push(id)
  inbox.set(code, q)
  setTimeout(() => {
    const b = blobs.get(id)
    if (b && Date.now() > b.exp) blobs.delete(id)
  }, ttlMs || 30000)
  return id
}

export function popInbox(code) {
  const q = inbox.get(code) || []
  if (q.length === 0) return null
  const id = q.shift()
  inbox.set(code, q)
  return id
}

export function getOnce(id) {
  const b = blobs.get(id)
  if (!b) return null
  blobs.delete(id)
  return b.payload
}
export function peekBlob(id) {
  const b = blobs.get(id)
  return b ? b.payload : null
}

export function registerUser(code, profile) { users.set(code, { status: 'available', ...profile }); if (!contacts.has(code)) contacts.set(code, []) }
export function getUser(code) { return users.get(code) || null }
export function setProfile(code, patch) { const u = users.get(code) || {}; const nu = { ...u, ...patch }; users.set(code, nu); return nu }
export function addContact(owner, entry) { const list = contacts.get(owner) || []; const exists = list.find(c => c.code === entry.code); if (!exists) list.push(entry); contacts.set(owner, list); return list }
export function getContacts(owner) { return contacts.get(owner) || [] }
export function pushAck(code, blobId, reason) { acks.set(code, { blobId, reason, ts: Date.now() }) }
export function popAck(code) { const a = acks.get(code); if (!a) return null; acks.delete(code); return a }

export function setSmsCode(phone, code) { sms.set(phone, code) }
export function verifySms(phone, code) { const c = sms.get(phone); if (!c) return false; const ok = String(c) === String(code); if (ok) sms.delete(phone); return ok }
export function setEmailCode(email, code) { emails.set(email, code) }
export function verifyEmail(email, code) { const c = emails.get(email); if (!c) return false; const ok = String(c) === String(code); if (ok) emails.delete(email); return ok }
