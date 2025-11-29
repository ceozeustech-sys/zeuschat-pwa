export default function Offline() {
  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0E1A24', color: '#C9A14A' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/icons/icon-192x192.png" alt="ZeusChat" width="96" height="96" style={{ borderRadius: 16 }} />
        <h1 style={{ marginTop: 12 }}>Offline</h1>
        <p>You are offline. Cached content is available.</p>
        <button onClick={() => location.reload()} style={{ marginTop: 16, padding: '8px 16px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Retry</button>
      </div>
    </main>
  )
}
