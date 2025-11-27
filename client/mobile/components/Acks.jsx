import React, { useEffect, useState } from 'react'
import { View, Text, Button } from 'react-native'
import { getItem } from '../shared/storage'
import { getAck } from '../api/relay'

export default function Acks({ baseUrl }) {
  const [deviceId, setDeviceId] = useState('')
  const [ack, setAck] = useState('')

  useEffect(() => {
    (async () => {
      const myDev = await getItem('device_id')
      setDeviceId(myDev || '')
    })()
  }, [])

  async function onPoll() {
    if (!deviceId) return
    const a = await getAck(baseUrl, deviceId)
    setAck(a ? `${a.status}:${a.blob_id}` : '')
  }

  return (
    <View>
      <Button title="Poll Acks" onPress={onPoll} />
      <Text>{ack}</Text>
    </View>
  )
}

