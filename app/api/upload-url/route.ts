import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const { fileName, contentType } = await req.json();
    if (!fileName) return NextResponse.json({ error: 'fileName is required' }, { status: 400 });

    const safeName = String(fileName).replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const path = `${Date.now()}-${safeName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('history-images')
      .createSignedUploadUrl(path);

    if (error) throw error;

    return NextResponse.json({
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      contentType: contentType || 'application/octet-stream'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '업로드 URL 생성 실패' }, { status: 500 });
  }
}
