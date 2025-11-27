import React, { useState } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { fetchInbox, gateBlob, getAck } from '../api/relay'
import { hkdfSha256 } from '../shared/hkdf'

export default function EphemeralViewer({ baseUrl }) {
  const [deviceId, setDeviceId] = useState('')
  const [blobId, setBlobId] = useState('')
  const [status, setStatus] = useState('')
  const [salt, setSalt] = useState('')
  const [password, setPassword] = useState('')

  async function onInbox() {
    const j = await fetchInbox(baseUrl, deviceId)
    setBlobId(j ? j.id : '')
    setSalt(j && j.salt ? j.salt : '')
  }

  async function onView() {
    if (!blobId) return
    const ph = await hkdfSha256(password || '', salt, 'ZEUSGATE', 32)
    const b = await gateBlob(baseUrl, blobId, ph)
    if (b) {
      setStatus('viewed')
    } else {
      setStatus('deleted')
    }
  }

  return (
    <View>
      <TextInput value={deviceId} onChangeText={setDeviceId} placeholder="Device ID" />
      <Button title="Inbox" onPress={onInbox} />
      <Text>{blobId}</Text>
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" />
      <Button title="View" onPress={onView} />
      <Text>{status}</Text>
    </View>
  )
}
