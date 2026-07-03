'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type RecordItem = {
  id: string;
  title: string;
  content: string;
  occurred_at: string | null;
  category: string | null;
  tags: string | null;
  images?: string[];
};

const categories = [
  { title: '자주 질문하는 디자인 시스템', desc: '가이드, 컴포넌트, 토큰 등', key: '디자인 시스템', icon: '◆' },
  { title: '광고주 예외 케이스', desc: '예외 케이스와 특이사항', key: '광고주 예외', icon: '□' },
  { title: '폰트', desc: '타이포그래피와 적용 규칙', key: '폰트', icon: 'Aa' },
  { title: '개발', desc: '개발 가이드, 이슈, 해결', key: '개발', icon: '<>' },
  { title: '기타', desc: '그 외 자주 묻는 정보', key: '기타', icon: '…' }
];

export default function Page() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({ title: '', content: '', occurred_at: '', category: '디자인 시스템', tags: '' });

  async function loadRecords(q = '') {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/records${q ? `?q=${encodeURIComponent(q)}` : ''}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '불러오기에 실패했습니다.');
      setRecords(json.records || []);
      if (q && (json.records || []).length === 0) setMessage('저장된 기록에서 관련 결과를 찾지 못했습니다.');
    } catch (e: any) {
      setMessage(e.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRecords(); }, []);

  const recordCount = records.length;

  function chooseCategory(key: string) {
    setQuery(key);
    loadRecords(key);
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 8);
    setSelectedFiles(arr);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(arr.map((file) => URL.createObjectURL(file)));
  }

  async function uploadImages() {
    const paths: string[] = [];
    for (const file of selectedFiles) {
      const signRes = await fetch('/api/images/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error || '이미지 업로드 준비 실패');

      const uploadRes = await fetch(sign.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!uploadRes.ok) throw new Error('이미지 업로드 실패');
      paths.push(sign.path);
    }
    return paths;
  }

  async function saveRecord(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const imagePaths = await uploadImages();
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, imagePaths })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '저장 실패');
      setForm({ title: '', content: '', occurred_at: '', category: '디자인 시스템', tags: '' });
      setSelectedFiles([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
      setFormOpen(false);
      await loadRecords(query);
      setMessage('히스토리가 저장되었습니다.');
    } catch (e: any) {
      setMessage(e.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function search(e: FormEvent) {
    e.preventDefault();
    loadRecords(query);
  }

  return (
    <>
      <header className="header">
        <div className="logo"><div className="logoMark" />Project History AI</div>
        <div className="avatar">S</div>
      </header>

      <main className="main">
        <section className="cards">
          {categories.map((cat, i) => (
            <button key={cat.title} className={`card ${i === 0 ? 'active' : ''}`} onClick={() => chooseCategory(cat.key)}>
              <div className="icon">{cat.icon}</div>
              <h3>{cat.title}</h3>
              <p>{cat.desc}</p>
            </button>
          ))}
        </section>

        <section className="hero">
          <h1>무엇을 도와드릴까요?</h1>
          <p>저장된 프로젝트 히스토리에서 제목, 내용, 카테고리, 태그를 검색합니다.</p>
          <form className="search" onSubmit={search}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="질문 또는 키워드를 입력해 주세요..." />
            <button aria-label="검색">→</button>
          </form>
        </section>

        {message && <div className="notice">{message}</div>}

        <section className="cta">
          <button className="primary" onClick={() => setFormOpen((v) => !v)}>+ 히스토리 등록</button>
          <span>새로운 프로젝트 히스토리와 참조 이미지를 등록하세요. 현재 {recordCount}건 저장됨.</span>
        </section>

        <form className={`form ${formOpen ? 'open' : ''}`} onSubmit={saveRecord}>
          <div className="grid">
            <div className="field"><label>발생 날짜</label><input type="date" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} /></div>
            <div className="field"><label>카테고리</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c.key}>{c.key}</option>)}</select></div>
          </div>
          <div className="field"><label>제목</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 2023년 Shop App 디자인 시스템 파일 수령" required /></div>
          <div className="field"><label>상세 내용</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="무슨 일이 있었는지, 근거와 맥락을 적어주세요." required /></div>
          <div className="field"><label>태그</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Shop App, VCG, Phase0" /></div>
          <div className="field upload"><label>참조 이미지</label><input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />{previews.length > 0 && <div className="preview">{previews.map((src) => <img key={src} src={src} alt="preview" />)}</div>}</div>
          <button className="primary" disabled={loading}>{loading ? '처리 중...' : '저장'}</button>
        </form>

        <section className="records">
          {records.map((record) => (
            <article className="record" key={record.id}>
              <div className="meta">{record.occurred_at || '날짜 없음'} · {record.category || '카테고리 없음'}</div>
              <h3>{record.title}</h3>
              <p>{record.content}</p>
              {record.tags && <div className="meta">태그: {record.tags}</div>}
              {!!record.images?.length && <div className="images">{record.images.map((img) => <a key={img} href={img} target="_blank"><img src={img} alt="첨부 이미지" /></a>)}</div>}
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
