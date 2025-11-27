import React, { useState } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { startProvision, completeProvision } from '../api/relay'
import { getItem } from '../shared/storage'

export default function QRInvite({ baseUrl }) {
  const [token, setToken] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [incoming, setIncoming] = useState('')
  const [status, setStatus] = useState('')

  async function onGen() {
    const j = await startProvision(baseUrl)
    setToken(j.token)
    const myDev = await getItem('device_id')
    setDeviceId(myDev || '')
  }

  async function onAccept() {
    const pubKeyB64 = ''
    const j = await completeProvision(baseUrl, incoming, deviceId, pubKeyB64)
    setStatus(j.status || '')
  }

  return (
    <View>
      <Button title="Generate Invite" onPress={onGen} />
      <Text>{token}</Text>
      <TextInput value={incoming} onChangeText={setIncoming} placeholder="Enter scanned token" />
      <Button title="Accept Invite" onPress={onAccept} />
      <Text>{status}</Text>
    </View>
  )
}

