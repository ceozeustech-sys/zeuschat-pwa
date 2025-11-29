import { useEffect, useState } from 'react'
import HeaderBar from '../components/HeaderBar'

function getLS(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function setLS(key, v) { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }

export default function Chat() {
  const [myId, setMyId] = useState('')
  const [peerId, setPeerId] = useState('')
  const [msg, setMsg] = useState('')
  const [list, setList] = useState([])
  const [useServer, setUseServer] = useState(true)
  const [password, setPassword] = useState('')
  const [ttl, setTtl] = useState('30')
  const [myPassHash, setMyPassHash] = useState('')
  const [replies, setReplies] = useState({})
  const [relayOk, setRelayOk] = useState(false)
  const [showReq, setShowReq] = useState({ visible: false, sender: '', blobId: '' })

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
    try {
      const qp = new URLSearchParams(window.location.search); const p = qp.get('peer'); if (p) { setPeerId(p); setLS('peer_id', p) }
    } catch {}
    ;(async () => {
      try { const r = await fetch(`/api/profile/${existing || getLS('device_id','')}`); if (r.ok) { const j = await r.json(); setMyPassHash(j.passwordHashB64 || '') } } catch {}
    })()
    ;(async () => { try { const t = await fetch('/api/relay/test'); setRelayOk(t.ok) } catch { setRelayOk(false) } })()
  }, [])

  function genId() {
    let s = ''; for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16); return s
  }

  function savePeer(v) { setPeerId(v); setLS('peer_id', v) }

  async function send() {
    if (!peerId || !msg) return
    const ttlMs = Math.min(30000, Math.max(10000, parseInt(ttl || '30', 10) * 1000))
    if (useServer) {
      const payload = { device_id: peerId, data: JSON.stringify({ text: msg }), ttl_ms: ttlMs, from: myId }
      const r = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await r.json()
      const item = { id: j.id || genId(), from: myId, to: peerId, text: msg, ts: Date.now(), ttl: ttlMs, status: 'sent' }
      const next = [item, ...list]
      setList(next); setLS('conv', next)
      setMsg('')
    } else {
      const item = { id: genId(), from: myId, to: peerId, text: msg, ts: Date.now(), ttl: ttlMs, status: 'sent' }
      const next = [item, ...list]
      setList(next); setLS('conv', next)
      setMsg('')
      setTimeout(() => expire(item.id), item.ttl)
    }
  }

  function expire(id) {
    setList(prev => { const next = prev.filter(x => x.id !== id); setLS('conv', next); return next })
  }

  function view(id) { expire(id) }

  useEffect(() => {
    const t = setInterval(async () => {
      if (!useServer || !myId) return
      try {
        const r = await fetch(`/api/inbox/${myId}`)
        if (r.status === 204) return
        const j = await r.json()
        if (j && j.id) {
          const pk = await fetch(`/api/peek/${j.id}`)
          if (!pk.ok) return
          const pv = await pk.json()
          const sender = pv.from || 'peer'
          let isKnown = false
          try { const cr = await fetch(`/api/contacts/${myId}`); if (cr.ok) { const cl = await cr.json(); isKnown = !!cl.find(x => x.code === sender) } } catch {}
          if (!isKnown) { setShowReq({ visible: true, sender, blobId: j.id }); return }
          const b = await fetch(`/api/blob/${j.id}`)
          if (b.ok) {
            const p = await b.json()
            let text = ''
            try { const o = JSON.parse(p.data); text = o.text; const sender2 = p.from || 'peer';
              const entered = prompt('Enter your viewing password to open:') || ''
              if (btoa(entered) !== myPassHash) {
                await fetch(`/api/ack/${sender2}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blobId: j.id, reason: 'wrong_password' }) })
                return
              } else {
                await fetch(`/api/ack/${sender2}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blobId: j.id, reason: 'viewed' }) })
              }
            } catch { text = String(p.data || ''); }
            const item = { id: j.id, from: (p.from || peerId || 'peer'), to: myId, text, ts: Date.now(), ttl: 30000 }
            setList(prev => { const next = [item, ...prev]; setLS('conv', next); return next })
          }
        }
      } catch {}
    }, 2000)
    return () => clearInterval(t)
  }, [useServer, myId, peerId])

  useEffect(() => {
    const t = setInterval(async () => {
      if (!useServer || !myId) return
      try { const r = await fetch(`/api/ack/${myId}`); if (r.status === 204) return; const a = await r.json(); if (a && a.blobId) {
        setList(prev => { const next = prev.map(m => m.id === a.blobId ? { ...m, status: a.reason } : m); setLS('conv', next); return next })
      } } catch {}
    }, 2000)
    return () => clearInterval(t)
  }, [useServer, myId])

  return (
    <main style={{ minHeight: '100vh', background: '#0E1A24', color: '#C9A14A' }}>
      <HeaderBar />
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <div style={{ flex: 1, padding: 16 }}>
        <h2>ZeusChat (Demo)</h2>
        <p style={{ color: '#fff' }}>Your ID: {myId} • Relay: {relayOk ? 'OK' : 'Offline'}</p>
        <label style={{ color: '#fff' }}>Peer ID</label>
        <input value={peerId} onChange={e => savePeer(e.target.value)} placeholder="friend's device id" style={{ width: '100%', padding: 8 }} />
        <div style={{ marginTop: 12 }}>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="type a message" style={{ width: '50%', padding: 8 }} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="message password" type="password" style={{ width: '20%', padding: 8, marginLeft: 8 }} />
          <select value={ttl} onChange={e => setTtl(e.target.value)} style={{ marginLeft: 8, padding: 8 }}>
            <option value="10">10s</option>
            <option value="20">20s</option>
            <option value="30">30s</option>
          </select>
          <button onClick={send} style={{ marginLeft: 8, padding: '8px 16px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Send (demo)</button>
        </div>
        <p style={{ color: '#fff', marginTop: 8 }}>Messages expire after viewing or 30s. Mode: {useServer ? 'Server' : 'Local'}</p>
        <div style={{ marginTop: 8 }}>
          <label style={{ color: '#fff' }}><input type="checkbox" checked={useServer} onChange={e => setUseServer(e.target.checked)} /> Use server relay</label>
        </div>
        <div style={{ marginTop: 16 }}>
          {list.length === 0 ? <p style={{ color: '#fff' }}>No messages</p> : null}
          {list.map(item => (
            <div key={item.id} style={{ background: '#102030', padding: 12, borderRadius: 8, marginBottom: 8 }}>
              <div style={{ color: '#fff' }}><b>{item.from === myId ? 'You → ' : 'Peer → '}{item.to}</b></div>
              <div style={{ color: '#fff' }}>{item.text}</div>
              <div style={{ color: '#888', fontSize: 12 }}>ttl: {Math.floor((item.ttl - (Date.now() - item.ts)) / 1000)}s • {item.status === 'viewed' ? '✓✓' : item.status === 'delivered' ? '✓✓' : item.status === 'wrong_password' ? '✗' : '✓'}</div>
              <button onClick={() => view(item.id)} style={{ marginTop: 6, padding: '4px 8px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>View (expire)</button>
              {item.from !== myId ? (
                <div style={{ marginTop: 8 }}>
                  <input value={replies[item.id] || ''} onChange={e => setReplies(prev => ({ ...prev, [item.id]: e.target.value }))} placeholder="reply within time" style={{ width: '60%', padding: 6 }} />
                  <button onClick={() => sendReply(item.from, item.id)} style={{ marginLeft: 8, padding: '6px 12px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Reply</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <a href="/" style={{ color: '#C9A14A', textDecoration: 'underline' }}>Home</a>
        </div>
      </div>
      </div>
    </main>
  )
}
  async function sendReply(targetCode, originalId) {
    const body = replies[originalId] || ''
    if (!body) return
    const ttlMs = Math.min(30000, Math.max(10000, parseInt(ttl || '30', 10) * 1000))
    if (useServer) {
      const payload = { device_id: targetCode, data: JSON.stringify({ text: body }), ttl_ms: ttlMs, from: myId }
      const r = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await r.json()
      const item = { id: j.id || genId(), from: myId, to: targetCode, text: body, ts: Date.now(), ttl: ttlMs, status: 'sent' }
      setList(prev => { const next = [item, ...prev]; setLS('conv', next); return next })
      setReplies(prev => ({ ...prev, [originalId]: '' }))
    }
  }
        {showReq.visible ? (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#102030', color: '#fff', padding: 16, borderRadius: 8, width: 360 }}>
              <div>Message request from {showReq.sender}</div>
              <div style={{ marginTop: 12 }}>
                <button onClick={async () => { await fetch(`/api/contacts/${myId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: showReq.sender }) }); setShowReq({ visible: false, sender: '', blobId: '' }) }} style={{ marginRight: 8, padding: '6px 12px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Save Contact</button>
                <button onClick={async () => { setShowReq({ visible: false, sender: '', blobId: '' }); const b = await fetch(`/api/blob/${showReq.blobId}`); if (b.ok) { const p = await b.json(); let text = ''; try { const o = JSON.parse(p.data); text = o.text } catch { text = String(p.data || '') } const item = { id: showReq.blobId, from: (p.from || 'peer'), to: myId, text, ts: Date.now(), ttl: 30000 }; setList(prev => { const next = [item, ...prev]; setLS('conv', next); return next }) } }} style={{ marginRight: 8, padding: '6px 12px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Accept</button>
                <button onClick={async () => { await fetch(`/api/ack/${showReq.sender}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blobId: showReq.blobId, reason: 'declined' }) }); await fetch(`/api/blob/${showReq.blobId}`); setShowReq({ visible: false, sender: '', blobId: '' }) }} style={{ padding: '6px 12px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Decline</button>
              </div>
            </div>
          </div>
        ) : null}
