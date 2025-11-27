import React, { useState } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { startProvision, completeProvision, getDevice, syncGet } from '../api/relay'

export default function Provision({ baseUrl }) {
  const [token, setToken] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [status, setStatus] = useState('')

  async function onStart() {
    const j = await startProvision(baseUrl)
    setToken(j.token)
  }

  async function onComplete() {
    const pubKeyB64 = ''
    const j = await completeProvision(baseUrl, token, deviceId, pubKeyB64)
    setStatus(j.status || '')
  }

  async function onCheck() {
    const d = await getDevice(baseUrl, deviceId)
    setStatus(d.id || '')
  }

  async function onSyncGet() {
    const env = await syncGet(baseUrl, deviceId)
    setStatus(env ? 'envelope' : '')
  }

  return (
    <View>
      <Button title="Start Provision" onPress={onStart} />
      <Text>Token</Text>
      <Text>{token}</Text>
      <TextInput value={deviceId} onChangeText={setDeviceId} placeholder="Device ID" />
      <Button title="Complete" onPress={onComplete} />
      <Button title="Check Device" onPress={onCheck} />
      <Button title="Sync Get" onPress={onSyncGet} />
      <Text>{status}</Text>
    </View>
  )
}

