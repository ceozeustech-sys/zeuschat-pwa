import React, { useEffect, useState } from 'react'
import { View, Text, Switch } from 'react-native'
import { getItem, setItem } from '../shared/secure_store'

export default function ComplianceMode() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    (async () => {
      const v = await getItem('compliance_mode')
      setEnabled(v === '1')
    })()
  }, [])
  async function toggle(v) {
    setEnabled(v)
    await setItem('compliance_mode', v ? '1' : '0')
  }
  return (
    <View>
      <Text>Compliance Mode</Text>
      <Switch value={enabled} onValueChange={toggle} />
    </View>
  )
}
