import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { makeEmbedding, openai } from '../../../lib/openai';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    if (!question) return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });

    const embedding = await makeEmbedding(question);
    let matches: any[] = [];
    if (embedding) {
      const { data, error } = await supabaseAdmin.rpc('match_record_chunks', {
        query_embedding: embedding,
        match_count: 6,
        similarity_threshold: 0.05
      });
      if (!error && data) matches = data;
    }

    if (!matches.length) {
      return NextResponse.json({ answer: '저장된 기록에서 관련 근거를 찾지 못했습니다. 추측하지 않겠습니다.', sources: [] });
    }

    const context = matches.map((m, i) => `[${i + 1}] ${m.title}\n날짜: ${m.occurred_at ?? '미상'}\n카테고리: ${m.category ?? '미상'}\n내용: ${m.chunk_text}`).join('\n\n');

    if (!openai) {
      return NextResponse.json({ answer: `OPENAI_API_KEY가 없어 AI 답변은 비활성화되어 있습니다. 관련 기록:\n\n${context}`, sources: matches });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '너는 프로젝트 히스토리 아카이브 답변 봇이다. 반드시 제공된 근거 안에서만 한국어로 답한다. 근거가 부족하면 확인되지 않는다고 말한다. 마지막에 참고한 기록 제목을 간단히 표시한다.' },
        { role: 'user', content: `질문: ${question}\n\n근거:\n${context}` }
      ],
      temperature: 0.1
    });

    return NextResponse.json({ answer: completion.choices[0]?.message?.content ?? '답변을 생성하지 못했습니다.', sources: matches });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
