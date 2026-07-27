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

  const { entries } = req.body || {};
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: '등록할 항목이 없습니다.' });
  }

  const rows = [];
  const rejected = [];

  entries.forEach((e, i) => {
    if (!e.entry_date || !e.title || !e.content) {
      rejected.push({ row: i + 1, reason: '날짜, 제목, 내용은 필수입니다.' });
      return;
    }
    rows.push({
      entry_date: e.entry_date,
      title: e.title,
      content: e.content,
      category: e.category || '기타',
      tags: Array.isArray(e.tags) ? e.tags : [],
      image_url: null,
      reference_url: e.reference_url || null,
      created_by: e.author_name || null,
      updated_by: e.author_name || null,
    });
  });

  if (rows.length === 0) {
    return res.status(400).json({ error: '유효한 항목이 없습니다.', rejected });
  }

  const { data, error } = await supabaseAdmin
    .from('history_entries')
    .insert(rows)
    .select();

  if (error) return res.status(500).json({ error: error.message, rejected });

  return res.status(201).json({
    inserted: data.length,
    rejected,
  });
}
