import HeaderBar from '../components/HeaderBar'

export default function Acceptable() {
  return (
    <main style={{ minHeight: '100vh', background: '#0E1A24', color: '#C9A14A' }}>
      <HeaderBar />
      <div style={{ padding: 24 }}>
      <h2>Acceptable Use Policy</h2>
      <p>Respect others. Do not send harmful, unlawful, or infringing content. Do not use automated tools to capture or store content beyond intended ephemerality.</p>
      <p>Security: protect your account password and per‑message passwords. Report abuse to hello@zeustechafrica.com.</p>
      <p>Violations may result in account suspension.</p>
      </div>
    </main>
  )
}
