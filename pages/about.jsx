import HeaderBar from '../components/HeaderBar'

export default function About() {
  return (
    <main style={{ minHeight: '100vh', background: '#0E1A24', color: '#C9A14A' }}>
      <HeaderBar />
      <div style={{ padding: 24 }}>
      <h1>About ZeusChat</h1>
      <p>A sovereign African messaging platform — where privacy isn’t a feature, it’s the default. Where every message respects the sender’s intent, and no third party — not even us — can see your data.</p>
      <h3>Built for</h3>
      <ul>
        <li>Individuals who fear surveillance, data leaks, or screenshots.</li>
        <li>Businesses handling sensitive contracts, pricing, or health data.</li>
        <li>Governments & NGOs needing audit‑proof, tamper‑resistant comms.</li>
        <li>Youth & creatives who want cool, exclusive, African‑flavored digital identity.</li>
      </ul>
      <p>ZeusChat is built by ZEUSTECH — innovation at the level of creation.</p>
      <p><a href="mailto:hello@zeustechafrica.com" style={{ color: '#C9A14A', textDecoration: 'underline' }}>Contact</a></p>
      </div>
    </main>
  )
}
