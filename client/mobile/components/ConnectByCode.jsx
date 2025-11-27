import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { lookupZeusId, sendBlob } from '../api/relay'
import { hkdfSha256 } from '../shared/hkdf'
import { getItem } from '../shared/secure_store'

function rb(n) {
  const a = new Array(n)
  for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256)
  return a
}

function toBytes(s) {
  const a = []
  for (let i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 0xff)
  return a
}

function b64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b0 = bytes[i++] || 0
    const b1 = bytes[i++] || 0
    const b2 = bytes[i++] || 0
    const trip = (b0 << 16) | (b1 << 8) | b2
    out += chars[(trip >> 18) & 63]
    out += chars[(trip >> 12) & 63]
    out += i - 2 > bytes.length ? '=' : chars[(trip >> 6) & 63]
    out += i - 1 > bytes.length ? '=' : chars[trip & 63]
  }
  const mod = bytes.length % 3
  if (mod === 1) out = out.slice(0, -2) + '=='
  if (mod === 2) out = out.slice(0, -1) + '='
  return out
}

export default function ConnectByCode({ baseUrl }) {
  const [code, setCode] = useState('')
  const [target, setTarget] = useState('')
  const [msg, setMsg] = useState('')
  const [status, setStatus] = useState('')
  const [myDeviceId, setMyDeviceId] = useState('')
  const [ttl, setTtl] = useState('5000')
  const [password, setPassword] = useState('')

  useEffect(() => {
    (async () => {
      const myDev = await getItem('device_id')
      setMyDeviceId(myDev || '')
    })()
  }, [])

  async function onLookup() {
    const j = await lookupZeusId(baseUrl, code)
    setTarget(j ? j.device_id : '')
  }

  async function onSend() {
    if (!target) return
    const iv = rb(12)
    const tag = rb(16)
    const data = msg ? toBytes(msg) : rb(16)
    const salt = rb(16)
    const t = parseInt(ttl || '5000', 10)
    const ph = password ? await hkdfSha256(password, b64(salt), 'ZEUSGATE', 32) : undefined
    const payload = { device_id: target, iv: b64(iv), data: b64(data), tag: b64(tag), ttl_ms: t }
    if (myDeviceId) payload.sender_id = myDeviceId
    if (ph) payload.pass_hash = ph
    if (ph) payload.salt = b64(salt)
    const r = await fetch(`${baseUrl}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const res = await r.json()
    setStatus(res.id ? 'sent' : 'error')
  }

  return (
    <View>
      <TextInput value={code} onChangeText={setCode} placeholder="ZEUS-ID" />
      <Button title="Lookup" onPress={onLookup} />
      <Text>{target}</Text>
      <TextInput value={msg} onChangeText={setMsg} placeholder="Message" />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password (required to view)" />
      <TextInput value={ttl} onChangeText={setTtl} placeholder="TTL ms (5000/10000/30000)" />
      <Button title="Send" onPress={onSend} />
      <Text>{status}</Text>
      <Text>{myDeviceId}</Text>
    </View>
  )
}
