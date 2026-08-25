export default function handler(req, res) {
  const { passcode } = req.body || {};
  const expected = process.env.ADMIN_PASSCODE;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  if (!expected) {
    return res.status(500).json({ ok: false, message: 'Admin env not configured' });
  }

  if (passcode === expected) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, message: 'Incorrect passcode' });
}
