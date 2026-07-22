import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CATEGORIES } from '../lib/categories';

const EMPTY_FORM = {
  id: null,
  entry_date: '',
  category: CATEGORIES[0].id,
  title: '',
  content: '',
  tags: '',
  image_url: '',
  reference_url: '',
};

export default function Admin() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState(null); // { type: 'ok'|'error', msg }
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const isEditing = Boolean(form.id);

  useEffect(() => {
    const saved = window.localStorage.getItem('ph_author_name');
    if (saved) setAuthorName(saved);
  }, []);

  const handleAuthorNameChange = (value) => {
    setAuthorName(value);
    window.localStorage.setItem('ph_author_name', value);
  };

  const loadEntries = () => {
    fetch('/api/records')
      .then((res) => res.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (unlocked) loadEntries();
  }, [unlocked]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (entry) => {
    setForm({
      id: entry.id,
      entry_date: entry.entry_date,
      category: entry.category,
      title: entry.title,
      content: entry.content,
      tags: (entry.tags || []).join(', '),
      image_url: entry.image_url || '',
      reference_url: entry.reference_url || '',
    });
    setImageFile(null);
    setImagePreview(entry.image_url || '');
    setStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setStatus({ type: 'error', msg: 'jpg 또는 png 파일만 업로드할 수 있습니다.' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // "data:image/png;base64,AAAA..." -> "AAAA..."
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return form.image_url || null;
    setUploadingImage(true);
    try {
      const fileBase64 = await fileToBase64(imageFile);
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          fileBase64,
          contentType: imageFile.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '이미지 업로드 실패');
      return data.url;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authorName.trim()) {
      setStatus({ type: 'error', msg: '작성자 이름을 입력해주세요.' });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const uploadedUrl = await uploadImageIfNeeded();

      const payload = {
        entry_date: form.entry_date,
        category: form.category,
        title: form.title,
        content: form.content,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        image_url: uploadedUrl,
        reference_url: form.reference_url.trim() || null,
        author_name: authorName.trim(),
      };

      const res = await fetch('/api/records', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify(isEditing ? { ...payload, id: form.id } : payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error || '저장 실패' });
      } else {
        setStatus({
          type: 'ok',
          msg: isEditing ? '기록이 수정되었습니다.' : '기록이 등록되었습니다.',
        });
        resetForm();
        loadEntries();
      }
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || '오류가 발생했습니다.' });
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
      if (form.id === id) resetForm();
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
          {isEditing ? '기록 수정' : '새 기록 등록'}
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
            <label>작성자</label>
            <input
              type="text"
              required
              placeholder="예: 홍길동"
              value={authorName}
              onChange={(e) => handleAuthorNameChange(e.target.value)}
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
          <div className="field">
            <label>참고 URL (선택)</label>
            <input
              type="url"
              placeholder="예: https://drive.google.com/..."
              value={form.reference_url}
              onChange={(e) =>
                setForm({ ...form, reference_url: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label>참고 이미지 (jpg, png · 5MB 이하)</label>
            <input
              type="file"
              accept="image/png, image/jpeg"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {imagePreview && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={imagePreview}
                  alt="미리보기"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 220,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                  }}
                />
                <button
                  type="button"
                  className="btn-danger"
                  style={{
                    marginTop: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                    setForm({ ...form, image_url: '' });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  이미지 제거
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn"
              type="submit"
              disabled={submitting || uploadingImage}
            >
              {uploadingImage
                ? '이미지 업로드 중…'
                : submitting
                ? '저장 중…'
                : isEditing
                ? '수정 저장'
                : '기록 등록'}
            </button>
            {isEditing && (
              <button
                type="button"
                className="btn-danger"
                style={{ borderRadius: 10, padding: '12px 20px' }}
                onClick={resetForm}
              >
                수정 취소
              </button>
            )}
          </div>
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
                  {e.image_url ? ' · 이미지 있음' : ''}
                  {e.reference_url ? ' · URL 있음' : ''}
                </div>
                <div className="meta">
                  {e.created_by ? `등록: ${e.created_by}` : '등록자 미상'}
                  {e.updated_by && e.updated_by !== e.created_by
                    ? ` · 최근 수정: ${e.updated_by}`
                    : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  style={{ background: 'transparent', color: 'var(--text)', border: '1.5px solid var(--border)' }}
                  onClick={() => startEdit(e)}
                >
                  수정
                </button>
                <button
                  className="btn-danger"
                  style={{ borderRadius: 10, padding: '10px 16px', fontSize: 13 }}
                  onClick={() => handleDelete(e.id)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
