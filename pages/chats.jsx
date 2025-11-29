import { useEffect, useState } from 'react'
import HeaderBar from '../components/HeaderBar'

function groupLatest(conv, myId) {
  const byPeer = new Map()
  for (const m of conv) {
    const peer = m.from === myId ? m.to : m.from
    const existing = byPeer.get(peer)
    if (!existing || m.ts > existing.ts) byPeer.set(peer, m)
  }
  return Array.from(byPeer.entries()).map(([peer, m]) => ({ peer, last: m }))
}

export default function Chats() {
  const [myId, setMyId] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    const c = localStorage.getItem('device_id') || ''
    setMyId(c)
    const conv = JSON.parse(localStorage.getItem('conv') || '[]')
    setItems(groupLatest(conv, c))
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#ECECEC', color: '#222' }}>
      <HeaderBar />
      <div style={{ display: 'flex' }}>
      <div style={{ width: 340, borderRight: '1px solid #ddd', background: '#fff' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 600 }}>Chats</div>
        <div>
          {items.map(it => (
            <a key={it.peer} href={`/chat?peer=${encodeURIComponent(it.peer)}`} style={{ display: 'flex', alignItems: 'center', padding: 12, textDecoration: 'none', color: '#222', borderBottom: '1px solid #f0f0f0' }}>
              <img src={'/icons/icon-192x192.png'} alt="avatar" width="36" height="36" style={{ borderRadius: 18, marginRight: 12 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{it.peer}</div>
                <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.last.text}</div>
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>{new Date(it.last.ts).toLocaleTimeString()}</div>
            </a>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Select a chat</div>
      </div>
    </main>
  )
}
