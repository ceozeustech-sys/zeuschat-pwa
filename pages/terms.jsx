import HeaderBar from '../components/HeaderBar'

export default function Terms() {
  return (
    <main style={{ minHeight: '100vh', background: '#0E1A24', color: '#C9A14A' }}>
      <HeaderBar />
      <div style={{ padding: 24 }}>
      <h2>Terms of Service</h2>
      <p>By using ZeusChat, you agree to ephemeral messaging rules: content expires on view or within 30 seconds; the sender may set shorter durations.</p>
      <p>Prohibited Use: illegal content, harassment, spam, and attempts to bypass ephemerality (e.g., automated capture) are forbidden.</p>
      <p>Accounts: users must register with accurate details and complete phone verification.</p>
      <p>Liability: ZEUSTECH provides the service “as is” and limits liability to the extent permitted by law.</p>
      </div>
    </main>
  )
}
