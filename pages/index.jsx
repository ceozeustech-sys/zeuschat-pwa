import { useEffect, useState } from 'react'

export default function Home() {
  const [swReady, setSwReady] = useState(false)
  const [swControlled, setSwControlled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [promptEvt, setPromptEvt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(() => setSwReady(true))
      setSwControlled(!!navigator.serviceWorker.controller)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setSwControlled(!!navigator.serviceWorker.controller)
      })
    }
    function onBIP(e) {
      e.preventDefault()
      setPromptEvt(e)
      setCanInstall(true)
    }
    function onInstalled() { setInstalled(true) }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function doInstall() {
    if (!promptEvt) return
    await promptEvt.prompt()
    setCanInstall(false)
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0E1A24', color: '#C9A14A' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>ZeusChat PWA</h1>
        <p>Messages you see – then they’re gone</p>
        <div style={{ marginTop: 16, color: '#FFFFFF' }}>
          <div>Service Worker Ready: {swReady ? 'Yes' : 'No'}</div>
          <div>Service Worker Controlling Page: {swControlled ? 'Yes' : 'No'}</div>
          <div>Install Available: {canInstall ? 'Yes' : 'No'}</div>
          <div>Installed: {installed ? 'Yes' : 'No'}</div>
        </div>
        {canInstall ? (
          <button onClick={doInstall} style={{ marginTop: 16, padding: '8px 16px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Install</button>
        ) : null}
      </div>
    </main>
  )
}
