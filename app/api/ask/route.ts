import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({
        answer: '검색어를 입력해 주세요.',
        sources: []
      });
    }

    const q = String(question).trim();

    const { data, error } = await supabaseAdmin
      .from('records')
      .select('*')
      .or(`title.ilike.%${q}%,body.ilike.%${q}%,category.ilike.%${q}%`)
      .order('occurred_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({
        answer: '저장된 기록에서 관련 결과를 찾지 못했습니다.',
        sources: []
      });
    }

    return NextResponse.json({
      answer: `총 ${data.length}개의 관련 기록을 찾았습니다.`,
      sources: data
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
