import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('records')
      .select('*')
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ records: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '기록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const payload = {
      title: body.title,
      body: body.body,
      occurred_at: body.occurred_at || null,
      category: body.category || '기타',
      tags: Array.isArray(body.tags) ? body.tags : [],
      image_urls: Array.isArray(body.image_urls) ? body.image_urls : []
    };

    const { data, error } = await supabaseAdmin
      .from('records')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ record: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '기록 저장에 실패했습니다.' }, { status: 500 });
  }
}
