import React, { useEffect, useState } from 'react'
import { View, Image, Text } from 'react-native'
import { colors, spacing } from '../shared/theme'
import { getItem } from '../shared/secure_store'

export default function Splash() {
  const [logoB64, setLogoB64] = useState('')
  useEffect(() => {
    ;(async () => {
      const b64 = await getItem('logo_b64')
      setLogoB64(b64 || '')
    })()
  }, [])
  return (
    <View style={{ flex: 1, backgroundColor: colors.brandNavy, alignItems: 'center', justifyContent: 'center' }}>
      {logoB64 ? (
        <Image source={{ uri: `data:image/png;base64,${logoB64}` }} style={{ width: 300, height: 140, resizeMode: 'contain' }} />
      ) : (
        <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: colors.brandGold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.brandNavy, fontSize: 64, fontWeight: '800' }}>Z</Text>
        </View>
      )}
      <Text style={{ color: colors.brandGold, marginTop: spacing.md }}>MESSAGES YOU SEE – THEN THEY’RE GONE</Text>
    </View>
  )
}
