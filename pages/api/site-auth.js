export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  if (!process.env.SITE_PASSWORD) {
    return res.status(500).json({
      error: 'SITE_PASSWORD 환경변수가 설정되지 않았습니다.',
    });
  }

  const { password } = req.body || {};
  if (password === process.env.SITE_PASSWORD) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
}
