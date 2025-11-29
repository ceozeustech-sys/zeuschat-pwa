import { useEffect, useState } from 'react'
import HeaderBar from '../components/HeaderBar'

export default function Contacts() {
  const [owner, setOwner] = useState('')
  const [list, setList] = useState([])
  const [peer, setPeer] = useState('')
  const [alias, setAlias] = useState('')

  useEffect(() => {
    const c = localStorage.getItem('device_id') || ''
    setOwner(c)
    ;(async () => {
      if (!c) return
      const r = await fetch(`/api/contacts/${c}`)
      if (r.ok) {
        const base = await r.json()
        const withProfiles = await Promise.all(base.map(async entry => {
          try { const pr = await fetch(`/api/profile/${entry.code}`); if (pr.ok) { const p = await pr.json(); return { ...entry, avatarB64: p.avatarB64 || '', status: p.status || 'available' } } } catch {}
          return { ...entry, avatarB64: '', status: 'offline' }
        }))
        setList(withProfiles)
      }
    })()
  }, [])

  async function add() {
    if (!peer) return
    const r = await fetch(`/api/contacts/${owner}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: peer, alias }) })
    if (r.ok) setList(await r.json())
    setPeer(''); setAlias('')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0E1A24', color: '#C9A14A' }}>
      <HeaderBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 480 }}>
        <h2>Contacts</h2>
        <div>
          <input value={peer} onChange={e => setPeer(e.target.value)} placeholder="Friend's code" style={{ width: '60%', padding: 8 }} />
          <input value={alias} onChange={e => setAlias(e.target.value)} placeholder="Alias (optional)" style={{ width: '30%', padding: 8, marginLeft: 8 }} />
          <button onClick={add} style={{ marginLeft: 8, padding: '8px 16px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Add</button>
        </div>
        <div style={{ marginTop: 16 }}>
          {list.map(c => (
            <div key={c.code} style={{ display: 'flex', alignItems: 'center', background: '#102030', padding: 12, borderRadius: 8, marginBottom: 8 }}>
              <img src={c.avatarB64 ? `data:image/png;base64,${c.avatarB64}` : '/icons/icon-192x192.png'} alt="avatar" width="40" height="40" style={{ borderRadius: 20, marginRight: 12 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff' }}>{c.alias || c.code}</div>
                <div style={{ color: '#aaa', fontSize: 12 }}>{c.status}</div>
              </div>
              <a href={`/chat?peer=${encodeURIComponent(c.code)}`} style={{ color: '#C9A14A', textDecoration: 'underline' }}>Chat</a>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}><a href="/" style={{ color: '#C9A14A', textDecoration: 'underline' }}>Home</a></div>
      </div>
      </div>
    </main>
  )
}
