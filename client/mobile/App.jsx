import React, { useState } from 'react'
import { View, TextInput } from 'react-native'
import { getItem, setItem } from './shared/secure_store'
import { colors } from './shared/theme'
import PinGate from './components/PinGate'
import Provision from './components/Provision'
import EphemeralViewer from './components/EphemeralViewer'
import Invite from './components/Invite'
import ConnectByCode from './components/ConnectByCode'
import QRInvite from './components/QRInvite'
import CaptureGuard from './components/CaptureGuard'
import ComplianceMode from './components/ComplianceMode'
import Header from './components/Header'
import Acks from './components/Acks'
import Splash from './components/Splash'

export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const baseUrl = 'http://localhost:8080'
  React.useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1200)
    return () => clearTimeout(t)
  }, [])
  React.useEffect(() => {
    ;(async () => {
      const existingDev = await getItem('device_id')
      if (!existingDev) {
        const id = genId()
        await setItem('device_id', id)
      }
      const existingZeus = await getItem('zeus_id')
      if (!existingZeus) {
        // leave generation to Invite screen until user registers
      }
    })()
  }, [])
  return (
    <View>
      {showSplash ? (
        <Splash />
      ) : unlocked ? (
        <CaptureGuard>
          <View style={{ backgroundColor: colors.brandNavy }}>
            <Header />
            <Provision baseUrl={baseUrl} />
            <EphemeralViewer baseUrl={baseUrl} />
            <Invite baseUrl={baseUrl} />
            <ConnectByCode baseUrl={baseUrl} />
            <QRInvite baseUrl={baseUrl} />
            <ComplianceMode />
            <Acks baseUrl={baseUrl} />
          </View>
        </CaptureGuard>
      ) : (
        <PinGate onUnlock={() => setUnlocked(true)} />
      )}
    </View>
  )
}

function genId() {
  let s = ''
  for (let i = 0; i < 16; i++) {
    s += Math.floor(Math.random() * 16).toString(16)
  }
  return s
}
