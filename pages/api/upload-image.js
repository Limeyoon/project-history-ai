import { supabaseAdmin } from '../../lib/supabaseAdmin';

// base64 이미지를 받을 수 있도록 body 크기 제한을 넉넉히 설정
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

const BUCKET = 'history-images';
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

function checkAdmin(req) {
  const password = req.headers['x-admin-password'];
  return (
    !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({
      error:
        'Supabase 서버 설정이 완료되지 않았습니다. 환경변수를 확인하세요.',
    });
  }

  if (!checkAdmin(req)) {
    return res.status(401).json({ error: '관리자 비밀번호가 올바르지 않습니다.' });
  }

  const { fileBase64, contentType } = req.body || {};
  if (!fileBase64 || !contentType) {
    return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
  }

  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    return res
      .status(400)
      .json({ error: 'jpg 또는 png 이미지만 업로드할 수 있습니다.' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res
        .status(400)
        .json({ error: '이미지 용량은 5MB 이하로 올려주세요.' });
    }

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      // 버킷이 없을 때 자주 나는 에러를 사용자가 이해하기 쉽게 안내
      if (/bucket/i.test(uploadError.message || '')) {
        return res.status(500).json({
          error:
            'Storage 버킷(history-images)이 없습니다. Supabase 대시보드 → Storage에서 "history-images" 버킷을 Public으로 먼저 만들어주세요.',
        });
      }
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    return res.status(201).json({ url: publicData.publicUrl });
  } catch (err) {
    return res.status(500).json({ error: '이미지 업로드 중 오류가 발생했습니다.' });
  }
}
