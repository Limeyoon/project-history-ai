import { supabaseAdmin } from '../../lib/supabaseAdmin';

function checkAdmin(req) {
  const password = req.headers['x-admin-password'];
  return (
    !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD
  );
}

export default async function handler(req, res) {
  if (!supabaseAdmin) {
    return res.status(500).json({
      error:
        'Supabase 서버 설정이 완료되지 않았습니다. 환경변수(SUPABASE_SERVICE_ROLE_KEY 등)를 확인하세요.',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  if (!checkAdmin(req)) {
    return res.status(401).json({ error: '관리자 비밀번호가 올바르지 않습니다.' });
  }

  const { ids, all } = req.body || {};

  if (all === true) {
    // 안전장치: confirmText를 프론트에서 이미 확인했다는 전제 하에 전체 삭제
    const { error, count } = await supabaseAdmin
      .from('history_entries')
      .delete({ count: 'exact' })
      .not('id', 'is', null);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ deleted: count ?? 0 });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '삭제할 항목이 없습니다.' });
  }

  const { error, count } = await supabaseAdmin
    .from('history_entries')
    .delete({ count: 'exact' })
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ deleted: count ?? ids.length });
}
