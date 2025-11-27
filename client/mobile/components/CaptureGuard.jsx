import React, { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { enableSecure, observeCapture } from '../shared/capture'
import { colors } from '../shared/theme'
import { getItem } from '../shared/secure_store'

export default function CaptureGuard({ children }) {
  const [captured, setCaptured] = useState(false)
  const [watermark, setWatermark] = useState('')
  useEffect(() => {
    enableSecure()
    const off = observeCapture(c => setCaptured(!!c))
    ;(async () => {
      const v = await getItem('compliance_mode')
      setCaptured(v === '1')
      const id = await getItem('zeus_id')
      setWatermark(id || '')
    })()
    return () => off()
  }, [])
  return (
    <View style={{ backgroundColor: colors.brandNavy }}>
      {children}
      {captured ? <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: colors.brandNavy, opacity: 0.95, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.brandGold }}>{watermark}</Text></View> : null}
    </View>
  )
}
