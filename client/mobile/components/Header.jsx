import React, { useEffect, useState } from 'react'
import { View, Text, Image } from 'react-native'
import { colors, spacing } from '../shared/theme'
import { getItem } from '../shared/secure_store'

export default function Header() {
  const [logoB64, setLogoB64] = useState('')
  useEffect(() => {
    ;(async () => {
      const b64 = await getItem('logo_b64')
      setLogoB64(b64 || '')
    })()
  }, [])
  return (
    <View style={{ alignItems: 'center', padding: spacing.lg, backgroundColor: colors.brandNavy }}>
      {logoB64 ? (
        <Image source={{ uri: `data:image/png;base64,${logoB64}` }} style={{ width: 260, height: 120, resizeMode: 'contain' }} />
      ) : (
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.brandGold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.brandNavy, fontSize: 48, fontWeight: '700' }}>Z</Text>
        </View>
      )}
      <Text style={{ color: colors.brandGold, marginTop: spacing.sm }}>MESSAGES YOU SEE – THEN THEY’RE GONE</Text>
    </View>
  )
}
