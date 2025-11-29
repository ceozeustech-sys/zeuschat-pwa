import HeaderBar from '../components/HeaderBar'

export default function Privacy() {
  return (
    <main style={{ minHeight: '100vh', background: '#0E1A24', color: '#C9A14A' }}>
      <HeaderBar />
      <div style={{ padding: 24 }}>
      <h2>Privacy Policy</h2>
      <p>ZeusChat by ZEUSTECH is an ephemeral messaging service. We minimize data collection, do not retain message content after view or TTL expiry, and store only necessary account information (name, phone, profile, code).</p>
      <p>Security: messages are protected with per‑message passwords and short TTLs. Attachments are time‑limited. Screenshots are discouraged and watermarked; native apps enforce capture prevention.</p>
      <p>Data Use: registration details are used for verification and account management. We do not sell personal data.</p>
      <p>Your Rights: you may update profile data and request account deletion. Contact: hello@zeustechafrica.com.</p>
      </div>
    </main>
  )
}
