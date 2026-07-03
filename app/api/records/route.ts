import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { makeEmbedding } from '../../../lib/openai';

export const dynamic = 'force-dynamic';

type Payload = {
  title: string;
  body: string;
  occurred_at?: string;
  category?: string;
  tags?: string;
  source_url?: string;
  image_paths?: string[];
};

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('records')
    .select('*, record_images(*)')
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data ?? [] });
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Payload;
    if (!payload.title || !payload.body) {
      return NextResponse.json({ error: '제목과 상세 내용은 필수입니다.' }, { status: 400 });
    }

    const tags = payload.tags ? payload.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const { data: record, error } = await supabaseAdmin
      .from('records')
      .insert({
        title: payload.title,
        body: payload.body,
        occurred_at: payload.occurred_at || null,
        category: payload.category || '기타',
        tags,
        source_url: payload.source_url || null
      })
      .select('*')
      .single();

    if (error) throw error;

    if (payload.image_paths?.length) {
      const rows = payload.image_paths.map((path) => ({ record_id: record.id, path }));
      const img = await supabaseAdmin.from('record_images').insert(rows);
      if (img.error) throw img.error;
    }

    const embedding = await makeEmbedding(`${payload.title}\n${payload.body}\n${tags.join(', ')}`);
    if (embedding) {
      const chunk = await supabaseAdmin.from('record_chunks').insert({
        record_id: record.id,
        chunk_text: `${payload.title}\n${payload.body}`,
        embedding
      });
      if (chunk.error) throw chunk.error;
    }

    return NextResponse.json({ record });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
