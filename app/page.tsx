'use client';

import { useEffect, useState } from 'react';

type RecordItem = {
  id: string;
  title: string;
  body: string;
  occurred_at: string | null;
  category: string | null;
  tags: string[] | null;
  image_urls: string[] | null;
  created_at: string;
};

const categories = [
  { title: '자주 질문하는 디자인 시스템', desc: '가이드, 컴포넌트, 토큰 등', icon: '◆' },
  { title: '광고주 예외 케이스', desc: '예외 케이스와 특이사항', icon: '▣' },
  { title: '폰트', desc: '타이포그래피와 적용 규칙', icon: 'Aa' },
  { title: '개발', desc: '개발 가이드, 이슈, 해결', icon: '<>' },
  { title: '기타', desc: '그 외 자주 묻는 정보', icon: '···' }
];

export default function Page() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [sources, setSources] = useState<RecordItem[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    occurred_at: '',
    category: '디자인 시스템',
    tags: ''
  });
  const [files, setFiles] = useState<File[]>([]);

  async function loadRecords() {
    setError('');
    const res = await fetch('/api/records', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || '기록을 불러오지 못했습니다.');
      return;
    }
    setRecords(json.records || []);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  async function search() {
    setError('');
    setMessage('');
    setSources([]);

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || '검색에 실패했습니다.');
      return;
    }
    setMessage(json.answer || '검색 완료');
    setSources(json.sources || []);
  }

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const signRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type })
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error || '업로드 URL 생성 실패');

      const uploadRes = await fetch(sign.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!uploadRes.ok) throw new Error('이미지 업로드 실패');

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/history-images/${sign.path}`;
      urls.push(publicUrl);
    }
    return urls;
  }

  async function saveRecord() {
    try {
      setSaving(true);
      setError('');
      const imageUrls = await uploadImages();

      const payload = {
        title: form.title,
        body: form.body,
        occurred_at: form.occurred_at,
        category: form.category,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        image_urls: imageUrls
      };

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '저장 실패');

      setForm({ title: '', body: '', occurred_at: '', category: '디자인 시스템', tags: '' });
      setFiles([]);
      setOpenForm(false);
      await loadRecords();
    } catch (e: any) {
      setError(e.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  const visibleRecords = sources.length > 0 ? sources : records;

  return (
    <main>
      <header className="topbar">
        <div className="brandMark" />
        <strong>Project History AI</strong>
        <div className="avatar">S</div>
      </header>

      <section className="hero">
        <div className="cards">
          {categories.map((c, idx) => (
            <button className={`category ${idx === 0 ? 'active' : ''}`} key={c.title} onClick={() => setQuestion(c.title)}>
              <span>{c.icon}</span>
              <strong>{c.title}</strong>
              <p>{c.desc}</p>
            </button>
          ))}
        </div>

        <h1>무엇을 도와드릴까요?</h1>
        <p className="sub">저장된 프로젝트 히스토리에서 제목, 내용, 카테고리를 검색합니다.</p>

        <div className="searchBox">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="예: 디자인 시스템, VCG, 폰트" onKeyDown={(e) => e.key === 'Enter' && search()} />
          <button onClick={search}>→</button>
        </div>

        {message && <div className="notice">{message}</div>}
        {error && <div className="error">{error}</div>}
      </section>

      <section className="registerBand">
        <button onClick={() => setOpenForm((v) => !v)}>+ 히스토리 등록</button>
        <p>새로운 프로젝트 히스토리와 참조 이미지를 등록하세요. 현재 {records.length}건 저장됨.</p>
      </section>

      {openForm && (
        <section className="formCard">
          <div className="formGrid">
            <input placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input type="date" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['디자인 시스템', '광고주 예외 케이스', '폰트', '개발', '기타'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="태그: Shop App, VCG" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <textarea placeholder="상세 내용을 입력하세요." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <label className="fileDrop">
            <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            이미지 첨부 {files.length ? `(${files.length}개 선택됨)` : '(선택)'}
          </label>
          <button className="saveBtn" disabled={saving || !form.title || !form.body} onClick={saveRecord}>{saving ? '저장 중...' : '저장'}</button>
        </section>
      )}

      <section className="records">
        {visibleRecords.map((r) => (
          <article className="record" key={r.id}>
            <p className="meta">{r.occurred_at || '날짜 없음'} · {r.category || '기타'}</p>
            <h3>{r.title}</h3>
            <p>{r.body}</p>
            {!!r.tags?.length && <p className="tags">태그: {r.tags.join(', ')}</p>}
            {!!r.image_urls?.length && (
              <div className="images">
                {r.image_urls.map((url) => <img key={url} src={url} alt="참조 이미지" />)}
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
