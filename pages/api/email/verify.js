import { verifyEmail } from '../_relay_store'

export default function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return }
  try {
    const { email, code } = JSON.parse(req.body || '{}')
    if (!email || !code) { res.status(400).json({ error: 'bad_request' }); return }
    const ok = verifyEmail(email, code)
    res.status(ok ? 200 : 400).json({ status: ok ? 'ok' : 'invalid' })
  } catch { res.status(400).json({ error: 'bad_request' }) }
}
