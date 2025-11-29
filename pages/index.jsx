import { useEffect, useState } from 'react'

export default function Home() {
  const [swReady, setSwReady] = useState(false)
  const [swControlled, setSwControlled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [promptEvt, setPromptEvt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [installs, setInstalls] = useState(0)
  const [offlineHits, setOfflineHits] = useState(0)

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
    function onInstalled() {
      setInstalled(true)
      try {
        const n = parseInt(localStorage.getItem('install_count') || '0', 10) + 1
        localStorage.setItem('install_count', String(n))
        setInstalls(n)
      } catch {}
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    try {
      const n = parseInt(localStorage.getItem('install_count') || '0', 10)
      setInstalls(n)
      const o = parseInt(localStorage.getItem('offline_hits') || '0', 10)
      setOfflineHits(o)
    } catch {}
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

  function retry() {
    location.reload()
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
          <div>Installs: {installs}</div>
          <div>Offline Views: {offlineHits}</div>
        </div>
        {canInstall ? (
          <button onClick={doInstall} style={{ marginTop: 16, padding: '8px 16px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Install</button>
        ) : null}
        <div style={{ marginTop: 12 }}>
          <button onClick={retry} style={{ padding: '6px 12px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Retry</button>
        </div>
        <div style={{ marginTop: 18 }}>
          <a href="/health" style={{ color: '#C9A14A', textDecoration: 'underline', marginRight: 12 }}>Status</a>
          <a href="/about" style={{ color: '#C9A14A', textDecoration: 'underline', marginRight: 12 }}>About</a>
          <a href="/chat" style={{ color: '#C9A14A', textDecoration: 'underline', marginRight: 12 }}>Demo Chat</a>
          <a href="mailto:hello@zeustechafrica.com" style={{ color: '#C9A14A', textDecoration: 'underline' }}>Contact</a>
        </div>
      </div>
    </main>
  )
}
