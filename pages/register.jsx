import { useState } from 'react'
import HeaderBar from '../components/HeaderBar'

function genId() { let s = ''; for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16); return s }
function b64(s) { if (typeof window === 'undefined') return ''; return btoa(s) }

export default function Register() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState('phone')
  const [pass, setPass] = useState('')
  const [avatarB64, setAvatarB64] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')
  const [smsSent, setSmsSent] = useState(false)
  const [smsCode, setSmsCode] = useState('')
  const [sentCode, setSentCode] = useState('')
  const [verified, setVerified] = useState(false)

  function onAvatar(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setAvatarB64(String(r.result).split(',')[1] || '')
    r.readAsDataURL(f)
  }

  async function onSendCode() {
    let r
    if (method === 'phone') {
      r = await fetch('/api/sms/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
    } else {
      r = await fetch('/api/email/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    }
    const j = await r.json()
    if (j.status === 'sent') { setSmsSent(true); setStatus('code_sent'); setSentCode(j.code) }
  }

  async function onVerify() {
    let r
    if (method === 'phone') {
      r = await fetch('/api/sms/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code: smsCode }) })
    } else {
      r = await fetch('/api/email/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: smsCode }) })
    }
    const j = await r.json()
    setVerified(j.status === 'ok')
  }

  async function onRegister() {
    const c = genId(); setCode(c)
    const payload = { code: c, name, phone, passwordHashB64: b64(pass), avatarB64 }
    const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await r.json()
    if (j.status === 'ok') {
      localStorage.setItem('device_id', c)
      localStorage.setItem('profile', JSON.stringify({ name, phone, avatarB64 }))
      setStatus('registered')
    } else setStatus('error')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0E1A24', color: '#C9A14A' }}>
      <HeaderBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 420 }}>
        <h2>Register</h2>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" style={{ width: '100%', padding: 8 }} />
        <div style={{ marginTop: 8, color: '#fff' }}>
          <label><input type="radio" name="method" checked={method==='phone'} onChange={() => setMethod('phone')} /> Phone</label>
          <label style={{ marginLeft: 12 }}><input type="radio" name="method" checked={method==='email'} onChange={() => setMethod('email')} /> Email</label>
        </div>
        {method==='phone' ? (
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telephone" style={{ width: '100%', padding: 8, marginTop: 8 }} />
        ) : (
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ width: '100%', padding: 8, marginTop: 8 }} />
        )}
        <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Password" type="password" style={{ width: '100%', padding: 8, marginTop: 8 }} />
        <div style={{ marginTop: 8 }}>
          <button onClick={onSendCode} style={{ padding: '6px 12px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Send Code</button>
          {smsSent ? <span style={{ marginLeft: 8, color: '#fff' }}>Code sent (sim): {sentCode}</span> : null}
        </div>
        <div style={{ marginTop: 8 }}>
          <input value={smsCode} onChange={e => setSmsCode(e.target.value)} placeholder="Enter verification code" style={{ width: '60%', padding: 8 }} />
          <button onClick={onVerify} style={{ marginLeft: 8, padding: '6px 12px', background: '#C9A14A', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Verify</button>
          <span style={{ marginLeft: 8, color: verified ? '#0f0' : '#f00' }}>{verified ? 'Verified' : 'Not verified'}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <input type="file" accept="image/*" onChange={onAvatar} />
        </div>
        <button onClick={onRegister} disabled={!verified || !name || !(method==='phone'?phone:email) || !pass} style={{ marginTop: 12, padding: '8px 16px', background: verified ? '#C9A14A' : '#777', color: '#0E1A24', border: 'none', borderRadius: 6 }}>Create Account</button>
        {code ? <p style={{ color: '#fff' }}>Your code: {code}</p> : null}
        <div style={{ marginTop: 12 }}><a href="/profile" style={{ color: '#C9A14A', textDecoration: 'underline' }}>Go to Profile</a></div>
      </div>
      </div>
    </main>
  )
}
