import { peekBlob } from '../_relay_store'

export default function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).end(); return }
  const id = req.query.id
  const payload = peekBlob(id)
  if (!payload) { res.status(404).end(); return }
  res.status(200).json(payload)
}
