import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { getItem, setItem, removeItem } from '../shared/secure_store'
import { hkdfSha256 } from '../shared/hkdf'

export default function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [hasPin, setHasPin] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    (async () => {
      const existingHash = await getItem('pin_hash')
      const legacyPin = await getItem('pin')
      if (existingHash) {
        setHasPin(true)
        return
      }
      if (legacyPin) {
        const salt = rb(16)
        const saltB64 = b64(salt)
        const ph = await hkdfSha256(legacyPin, saltB64, 'ZEUSPIN', 32)
        await setItem('pin_hash', ph)
        await setItem('pin_salt', saltB64)
        await removeItem('pin')
        setHasPin(true)
        return
      }
      setHasPin(false)
    })()
  }, [])

  async function onSet() {
    if (!pin) { setStatus('enter a PIN'); return }
    const salt = rb(16)
    const saltB64 = b64(salt)
    const ph = await hkdfSha256(pin, saltB64, 'ZEUSPIN', 32)
    await setItem('pin_hash', ph)
    await setItem('pin_salt', saltB64)
    setHasPin(true)
    setStatus('PIN set')
    onUnlock()
  }

  async function onCheck() {
    const saltB64 = await getItem('pin_salt')
    const storedHash = await getItem('pin_hash')
    if (!saltB64 || !storedHash) { setStatus('no PIN set'); return }
    const ph = await hkdfSha256(pin, saltB64, 'ZEUSPIN', 32)
    if (ph && ph === storedHash) {
      setStatus('unlocked')
      onUnlock()
    } else {
      setStatus('wrong PIN')
    }
  }

  return (
    <View>
      <Text>{hasPin ? 'Enter PIN' : 'Set PIN'}</Text>
      <TextInput value={pin} onChangeText={setPin} secureTextEntry keyboardType="number-pad" />
      {hasPin ? (
        <Button title="Unlock" onPress={onCheck} />
      ) : (
        <Button title="Set PIN" onPress={onSet} />
      )}
      <Text>{status}</Text>
    </View>
  )
}

function rb(n) {
  const a = new Array(n)
  for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256)
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
