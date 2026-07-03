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

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('history_entries')
      .select('*')
      .order('entry_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ entries: data });
  }

  if (req.method === 'POST') {
    if (!checkAdmin(req)) {
      return res.status(401).json({ error: '관리자 비밀번호가 올바르지 않습니다.' });
    }
    const { entry_date, title, content, tags, category } = req.body || {};
    if (!entry_date || !title || !content) {
      return res
        .status(400)
        .json({ error: '날짜, 제목, 내용은 필수입니다.' });
    }
    const { data, error } = await supabaseAdmin
      .from('history_entries')
      .insert([
        {
          entry_date,
          title,
          content,
          category: category || '기타',
          tags: Array.isArray(tags) ? tags : [],
        },
      ])
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ entry: data[0] });
  }

  if (req.method === 'DELETE') {
    if (!checkAdmin(req)) {
      return res.status(401).json({ error: '관리자 비밀번호가 올바르지 않습니다.' });
    }
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });

    const { error } = await supabaseAdmin
      .from('history_entries')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
