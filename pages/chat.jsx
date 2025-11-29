import { useEffect, useState } from 'react'

function getLS(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function setLS(key, v) { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }

export default function Chat() {
  const [myId, setMyId] = useState('')
  const [peerId, setPeerId] = useState('')
  const [msg, setMsg] = useState('')
  const [list, setList] = useState([])

  useEffect(() => {
    const existing = getLS('device_id', '')
    if (existing) setMyId(existing)
    else {
      const id = genId(); setMyId(id); setLS('device_id', id)
    }
    const peer = getLS('peer_id', '')
    setPeerId(peer || '')
    const conv = getLS('conv', [])
    setList(conv)
  }, [])

  function genId() {
    let s = ''; for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16); return s
  }

  function savePeer(v) { setPeerId(v); setLS('peer_id', v) }

  function send() {
    if (!peerId || !msg) return
    const item = { id: genId(), from: myId, to: peerId, text: msg, ts: Date.now(), ttl: 30000 }
    const next = [item, ...list]
    setList(next); setLS('conv', next)
    setMsg('')
    setTimeout(() => expire(item.id), item.ttl)
  }

  function expire(id) {
    setList(prev => { const next = prev.filter(x => x.id !== id); setLS('conv', next); return next })
  }

  function view(id) { expire(id) }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', background: '#0E1A24', color: '#C9A14A', alignItems: 'stretch' }}>
      <div style={{ flex: 1, padding: 16 }}>
        <h2>ZeusChat (Demo)</h2>
        <p style={{ color: '#fff' }}>Your ID: {myId}</p>
        <label style={{ color: '#fff' }}>Peer ID</label>
        <input value={peerId} onChange={e => savePeer(e.target.value)} placeholder="friend's device id" style={{ width: '100%', padding: 8 }} />
        <div style={{ marginTop: 12 }}>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="type a message" style={{ width: '70%', padding: 8 }} />
          <button onClick={send} style={{ marginLeft: 8, padding: '8px 16px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Send (demo)</button>
        </div>
        <p style={{ color: '#fff', marginTop: 8 }}>Messages expire after viewing or 30s.</p>
        <div style={{ marginTop: 16 }}>
          {list.length === 0 ? <p style={{ color: '#fff' }}>No messages</p> : null}
          {list.map(item => (
            <div key={item.id} style={{ background: '#102030', padding: 12, borderRadius: 8, marginBottom: 8 }}>
              <div style={{ color: '#fff' }}><b>{item.from === myId ? 'You → ' : 'Peer → '}{item.to}</b></div>
              <div style={{ color: '#fff' }}>{item.text}</div>
              <div style={{ color: '#888', fontSize: 12 }}>ttl: {Math.floor((item.ttl - (Date.now() - item.ts)) / 1000)}s</div>
              <button onClick={() => view(item.id)} style={{ marginTop: 6, padding: '4px 8px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>View (expire)</button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <a href="/" style={{ color: '#C9A14A', textDecoration: 'underline' }}>Home</a>
        </div>
      </div>
    </main>
  )
}
