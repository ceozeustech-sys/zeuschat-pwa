import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { generateZeusId } from '../shared/zeusid'
import { registerZeusId, lookupZeusId, startProvision } from '../api/relay'
import { getItem, setItem } from '../shared/secure_store'

export default function Invite({ baseUrl }) {
  const [zeusId, setZeusId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [status, setStatus] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    (async () => {
      const existingId = await getItem('zeus_id')
      const myDevice = await getItem('device_id')
      setZeusId(existingId || generateZeusId())
      setDeviceId(myDevice || '')
    })()
  }, [])

  async function onRegister() {
    const j = await registerZeusId(baseUrl, deviceId, zeusId)
    if (j.status === 'ok') {
      await setItem('zeus_id', zeusId)
      await setItem('device_id', deviceId)
    }
    setStatus(j.status || '')
  }

  async function onLookup() {
    const j = await lookupZeusId(baseUrl, zeusId)
    setStatus(j ? j.device_id : '')
  }

  async function onInviteToken() {
    const j = await startProvision(baseUrl)
    setToken(j.token)
  }

  return (
    <View>
      <Text>{zeusId}</Text>
      <TextInput value={deviceId} onChangeText={setDeviceId} placeholder="Your Device ID" />
      <Button title="Register Code" onPress={onRegister} />
      <Button title="Lookup" onPress={onLookup} />
      <Button title="Invite Token" onPress={onInviteToken} />
      <Text>{token}</Text>
      <Text>{status}</Text>
    </View>
  )
}
