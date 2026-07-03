import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type RecordImage = { path: string };

type RecordRow = {
  id: string;
  title: string;
  content: string;
  occurred_at: string | null;
  category: string | null;
  tags: string | null;
  created_at: string;
  record_images?: RecordImage[];
};

function imageUrl(path: string) {
  const { data } = supabaseAdmin.storage.from('history-images').getPublicUrl(path);
  return data.publicUrl;
}

function normalizeRecord(record: RecordRow) {
  return {
    ...record,
    images: (record.record_images || []).map((img) => imageUrl(img.path))
  };
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() || '';

    let query = supabaseAdmin
      .from('records')
      .select('*, record_images(path)')
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (q) {
      const safe = q.replaceAll('%', '').replaceAll(',', ' ');
      query = query.or(`title.ilike.%${safe}%,content.ilike.%${safe}%,category.ilike.%${safe}%,tags.ilike.%${safe}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ records: (data || []).map((r) => normalizeRecord(r as RecordRow)) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, occurred_at, category, tags, imagePaths } = body;

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 상세 내용은 필수입니다.' }, { status: 400 });
    }

    const { data: record, error } = await supabaseAdmin
      .from('records')
      .insert({
        title,
        content,
        occurred_at: occurred_at || null,
        category: category || null,
        tags: tags || ''
      })
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(imagePaths) && imagePaths.length) {
      const rows = imagePaths.map((path: string) => ({ record_id: record.id, path }));
      const { error: imgError } = await supabaseAdmin.from('record_images').insert(rows);
      if (imgError) throw imgError;
    }

    return NextResponse.json({ record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save record' }, { status: 500 });
  }
}
