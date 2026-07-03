'use client';

import { useEffect, useMemo, useState } from 'react';

const categories = [
  { key: '디자인 시스템', title: '자주 질문하는\n디자인 시스템', desc: '가이드, 컴포넌트, 토큰 등', icon: '◆', tone: 'blue' },
  { key: '광고주 예외', title: '광고주 예외 케이스', desc: '예외 케이스와 특이사항', icon: '▣', tone: 'purple' },
  { key: '폰트', title: '폰트', desc: '타이포그래피와 적용 규칙', icon: 'Aa', tone: 'green' },
  { key: '개발', title: '개발', desc: '개발 가이드, 이슈, 해결', icon: '<>', tone: 'orange' },
  { key: '기타', title: '기타', desc: '그 외 자주 묻는 정보', icon: '…', tone: 'gray' }
];

type RecordItem = {
  id: string;
  title: string;
  body: string;
  occurred_at?: string | null;
  category?: string | null;
  tags?: string[] | null;
  source_url?: string | null;
  record_images?: { path: string }[];
};

export default function Page() {
  const [active, setActive] = useState('디자인 시스템');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState({ title: '', body: '', occurred_at: '', category: '디자인 시스템', tags: '', source_url: '' });

  async function load() {
    setError('');
    const res = await fetch('/api/records', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? '기록을 불러오지 못했습니다.');
    else setRecords(json.records ?? []);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!active) return records;
    return records.filter((r) => r.category === active || r.tags?.includes(active));
  }, [records, active]);

  async function uploadImage(file: File) {
    const signed = await fetch('/api/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, contentType: file.type }) });
    const sjson = await signed.json();
    if (!signed.ok) throw new Error(sjson.error ?? '이미지 업로드 URL 생성 실패');
    const up = await fetch(sjson.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!up.ok) throw new Error('이미지 업로드 실패');
    return sjson.path as string;
  }

  async function saveRecord() {
    setSaving(true); setError('');
    try {
      const image_paths = [] as string[];
      for (const file of images) image_paths.push(await uploadImage(file));
      const res = await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, image_paths }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '저장 실패');
      setForm({ title: '', body: '', occurred_at: '', category: '디자인 시스템', tags: '', source_url: '' });
      setImages([]); setFormOpen(false); await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function ask() {
    if (!question.trim()) return;
    setAsking(true); setAnswer(''); setError('');
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '질문 실패');
      setAnswer(json.answer);
    } catch (e: any) { setError(e.message); }
    finally { setAsking(false); }
  }

  function publicImageUrl(path: string) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${base}/storage/v1/object/public/history-images/${path}`;
  }

  return <>
    <header className="top"><div className="brand"><span className="logo"/>Project History AI</div><div className="avatar">S</div></header>
    <main className="wrap">
      <section className="cards">
        {categories.map((c) => <button key={c.key} className={`card ${active===c.key?'active':''}`} onClick={() => setActive(c.key)}>
          <div className={`icon ${c.tone}`}>{c.icon}</div><h3>{c.title}</h3><p>{c.desc}</p>
        </button>)}
      </section>

      <section className="hero">
        <h1>무엇을 도와드릴까요?</h1>
        <p>프로젝트 히스토리를 검색하고 AI가 근거 기반으로 답변합니다.</p>
        <div className="search"><input value={question} onChange={(e)=>setQuestion(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter') ask();}} placeholder="질문을 입력해 주세요..."/><button onClick={ask}>{asking?'검색 중':'→'}</button></div>
        {answer && <div className="answer">{answer}</div>}
      </section>

      {error && <div className="answer" style={{borderColor:'#f2c48d', color:'#7a4a00'}}>{error}</div>}

      <section className="cta"><button className="primary" onClick={()=>setFormOpen(!formOpen)}>+ 히스토리 등록</button><p>새로운 프로젝트 히스토리와 참조 이미지를 등록하세요.</p></section>

      <section className={`form ${formOpen?'open':''}`}>
        <div className="grid"><div className="field"><label>발생 날짜</label><input type="date" value={form.occurred_at} onChange={(e)=>setForm({...form, occurred_at:e.target.value})}/></div><div className="field"><label>카테고리</label><select value={form.category} onChange={(e)=>setForm({...form, category:e.target.value})}>{categories.map(c=><option key={c.key}>{c.key}</option>)}</select></div></div>
        <div className="field"><label>제목</label><input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="예: 2023년 Shop App 디자인 시스템 파일 수령"/></div>
        <div className="field"><label>상세 내용</label><textarea value={form.body} onChange={(e)=>setForm({...form,body:e.target.value})} placeholder="확인된 히스토리만 작성해 주세요."/></div>
        <div className="grid"><div className="field"><label>태그</label><input value={form.tags} onChange={(e)=>setForm({...form,tags:e.target.value})} placeholder="Shop App, VCG, Phase0"/></div><div className="field"><label>관련 링크</label><input value={form.source_url} onChange={(e)=>setForm({...form,source_url:e.target.value})} placeholder="Figma/Jira/Confluence 등"/></div></div>
        <div className="field"><label>참조 이미지</label><div className="files"><input type="file" accept="image/*" multiple onChange={(e)=>setImages(Array.from(e.target.files ?? []))}/><div className="thumbs">{images.map((f,i)=><img key={i} className="thumb" src={URL.createObjectURL(f)} alt="preview"/>)}</div></div></div>
        <button className="primary" onClick={saveRecord} disabled={saving}>{saving?'저장 중...':'저장'}</button>
      </section>

      <section className="records">
        {filtered.map((r)=><article className="record" key={r.id}><div className="meta">{r.occurred_at ?? '날짜 미상'} · {r.category}</div><h3>{r.title}</h3><p>{r.body}</p>{r.source_url && <a href={r.source_url} target="_blank">관련 링크</a>}<div className="images">{r.record_images?.map((img)=><img key={img.path} src={publicImageUrl(img.path)} alt="reference"/>)}</div></article>)}
      </section>
    </main>
  </>;
}
