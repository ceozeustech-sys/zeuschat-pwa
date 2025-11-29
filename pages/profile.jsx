import { useEffect, useState } from 'react'
import HeaderBar from '../components/HeaderBar'

export default function Profile() {
  const [code, setCode] = useState('')
  const [profile, setProfile] = useState({ name: '', phone: '', avatarB64: '', status: 'available' })
  const [status, setStatus] = useState('')

  useEffect(() => {
    const c = localStorage.getItem('device_id') || ''
    setCode(c)
    ;(async () => {
      if (!c) return
      const r = await fetch(`/api/profile/${c}`)
      if (r.ok) setProfile(await r.json())
    })()
  }, [])

  function onAvatar(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setProfile(p => ({ ...p, avatarB64: String(r.result).split(',')[1] || '' }))
    r.readAsDataURL(f)
  }

  async function save() {
    if (!code) return
    const r = await fetch(`/api/profile/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    if (r.ok) { setStatus('saved'); localStorage.setItem('profile', JSON.stringify(profile)) } else setStatus('error')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0E1A24', color: '#C9A14A' }}>
      <HeaderBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 420 }}>
        <h2>Profile</h2>
        <p style={{ color: '#fff' }}>Code: {code}</p>
        <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Full Name" style={{ width: '100%', padding: 8 }} />
        <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="Telephone" style={{ width: '100%', padding: 8, marginTop: 8 }} />
        <div style={{ marginTop: 8 }}>
          <input type="file" accept="image/*" onChange={onAvatar} />
        </div>
        <div style={{ marginTop: 8, color: '#fff' }}>
          <label>Status</label>
          <select value={profile.status || 'available'} onChange={e => setProfile({ ...profile, status: e.target.value })} style={{ marginLeft: 8, padding: 8 }}>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="working">Working</option>
            <option value="sleeping">Sleeping</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <button onClick={save} style={{ marginTop: 12, padding: '8px 16px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Save</button>
        <div style={{ marginTop: 12 }}><a href="/contacts" style={{ color: '#C9A14A', textDecoration: 'underline' }}>Manage Contacts</a></div>
        {status ? <p style={{ color: '#fff' }}>{status}</p> : null}
      </div>
      </div>
    </main>
  )
}
