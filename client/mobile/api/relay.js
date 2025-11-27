export async function startProvision(baseUrl) {
  const r = await fetch(`${baseUrl}/provision/start`, { method: 'POST' })
  return r.json()
}

export async function completeProvision(baseUrl, token, deviceId, pubKeyB64) {
  const r = await fetch(`${baseUrl}/provision/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, device_id: deviceId, pubkey: pubKeyB64 })
  })
  return r.json()
}

export async function getDevice(baseUrl, deviceId) {
  const r = await fetch(`${baseUrl}/device/${deviceId}`)
  return r.json()
}

export async function sendBlob(baseUrl, deviceId, ivB64, dataB64, tagB64, ttlMs) {
  const r = await fetch(`${baseUrl}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, iv: ivB64, data: dataB64, tag: tagB64, ttl_ms: ttlMs })
  })
  return r.json()
}

export async function fetchInbox(baseUrl, deviceId) {
  const r = await fetch(`${baseUrl}/inbox/${deviceId}`)
  if (r.status === 204) return null
  return r.json()
}

export async function getBlob(baseUrl, id) {
  const r = await fetch(`${baseUrl}/blob/${id}`)
  if (!r.ok) return null
  return r.json()
}

export async function syncPut(baseUrl, deviceId, envelopeB64) {
  const r = await fetch(`${baseUrl}/sync/put`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, envelope: envelopeB64 })
  })
  return r.json()
}

export async function syncGet(baseUrl, deviceId) {
  const r = await fetch(`${baseUrl}/sync/${deviceId}`)
  if (r.status === 204) return null
  return r.json()
}

export async function registerZeusId(baseUrl, deviceId, zeusId) {
  const r = await fetch(`${baseUrl}/id/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, zeus_id: zeusId })
  })
  return r.json()
}

export async function lookupZeusId(baseUrl, zeusId) {
  const r = await fetch(`${baseUrl}/id/${zeusId}`)
  if (!r.ok) return null
  return r.json()
}

export async function gateBlob(baseUrl, id, passHashB64) {
  const r = await fetch(`${baseUrl}/gate/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pass_hash: passHashB64 })
  })
  if (!r.ok) return null
  return r.json()
}

export async function getAck(baseUrl, deviceId) {
  const r = await fetch(`${baseUrl}/ack/${deviceId}`)
  if (r.status === 204) return null
  return r.json()
}
