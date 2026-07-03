import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CATEGORIES } from '../lib/categories';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    entry_date: '',
    category: CATEGORIES[0].id,
    title: '',
    content: '',
    tags: '',
  });
  const [status, setStatus] = useState(null); // { type: 'ok'|'error', msg }
  const [submitting, setSubmitting] = useState(false);

  const loadEntries = () => {
    fetch('/api/records')
      .then((res) => res.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (unlocked) loadEntries();
  }, [unlocked]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          entry_date: form.entry_date,
          category: form.category,
          title: form.title,
          content: form.content,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error || '등록 실패' });
      } else {
        setStatus({ type: 'ok', msg: '기록이 등록되었습니다.' });
        setForm({
          entry_date: '',
          category: CATEGORIES[0].id,
          title: '',
          content: '',
          tags: '',
        });
        loadEntries();
      }
    } catch (err) {
      setStatus({ type: 'error', msg: '네트워크 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    const res = await fetch(`/api/records?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || '삭제 실패');
    } else {
      loadEntries();
    }
  };

  if (!unlocked) {
    return (
      <>
        <Head>
          <title>관리자 로그인 · Project History AI</title>
        </Head>
        <div className="layout admin-panel">
          <div className="topbar">
            <div className="brand">
              <span className="brand-mark" />
              Project History AI
            </div>
            <Link href="/" className="topbar-link">
              ← 아카이브로
            </Link>
          </div>
          <h1 className="hero-title" style={{ fontSize: 24, textAlign: 'left' }}>
            관리자 인증
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setUnlocked(true);
            }}
            style={{ marginTop: 20 }}
          >
            <div className="field">
              <label>관리자 비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button className="btn" type="submit">
              입장
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>기록 등록 · Project History AI</title>
      </Head>
      <div className="layout admin-panel">
        <div className="topbar">
          <div className="brand">
            <span className="brand-mark" />
            Project History AI
          </div>
          <Link href="/" className="topbar-link">
            ← 아카이브로
          </Link>
        </div>

        <h1 className="hero-title" style={{ fontSize: 24, textAlign: 'left', marginBottom: 20 }}>
          새 기록 등록
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>날짜</label>
            <input
              type="date"
              required
              value={form.entry_date}
              onChange={(e) =>
                setForm({ ...form, entry_date: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>카테고리</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>제목</label>
            <input
              type="text"
              required
              placeholder="예: 2대 파트너사 계약 체결"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label>내용</label>
            <textarea
              required
              rows={6}
              placeholder="무슨 일이 있었는지, 배경과 결정 사항을 적어주세요."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <div className="field">
            <label>태그 (쉼표로 구분)</label>
            <input
              type="text"
              placeholder="예: 계약, 파트너십, 예산"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? '등록 중…' : '기록 등록'}
          </button>
          {status && (
            <p className={`status-msg ${status.type}`}>{status.msg}</p>
          )}
        </form>

        <div style={{ marginTop: 48 }}>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>
            등록된 기록 ({entries.length})
          </p>
          {entries.map((e) => (
            <div className="admin-list-item" key={e.id}>
              <div>
                <div>{e.title}</div>
                <div className="meta">
                  {e.entry_date} · {e.category}
                </div>
              </div>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(e.id)}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
