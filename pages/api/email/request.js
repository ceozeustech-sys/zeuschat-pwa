import { setEmailCode } from '../_relay_store'

export default function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return }
  try {
    const { email } = JSON.parse(req.body || '{}')
    if (!email) { res.status(400).json({ error: 'bad_request' }); return }
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setEmailCode(email, code)
    res.status(200).json({ status: 'sent', code })
  } catch { res.status(400).json({ error: 'bad_request' }) }
}
