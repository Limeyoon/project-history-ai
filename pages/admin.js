import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as XLSX from 'xlsx';
import { CATEGORIES } from '../lib/categories';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

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
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState([]);
  const [adminTab, setAdminTab] = useState('전체');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminElementFilter, setAdminElementFilter] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState(null); // { type: 'ok'|'error', msg }
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(null); // { type, msg }
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkExcelFile, setBulkExcelFile] = useState(null);
  const [bulkImageFiles, setBulkImageFiles] = useState([]);
  const bulkImageInputRef = useRef(null);

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

  useEffect(() => {
    if (!unlocked || !router.isReady) return;
    const editId = router.query.edit;
    if (!editId || entries.length === 0) return;
    const target = entries.find((e) => String(e.id) === String(editId));
    if (target) {
      startEdit(target);
      router.replace('/admin', undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, router.isReady, entries]);

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

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = (visibleIds) => {
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds]))
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `선택한 ${selectedIds.length}건을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
      )
    )
      return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/records-bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '삭제 실패');
      } else {
        alert(`${data.deleted}건 삭제 완료`);
        setSelectedIds([]);
        loadEntries();
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (entries.length === 0) return;
    if (
      !confirm(
        `등록된 전체 ${entries.length}건을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
      )
    )
      return;
    const typed = window.prompt(
      '정말 전체 삭제하시려면 아래 입력창에 "전체삭제"를 입력해주세요.'
    );
    if (typed !== '전체삭제') {
      alert('입력값이 일치하지 않아 취소되었습니다.');
      return;
    }
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/records-bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '삭제 실패');
      } else {
        alert(`전체 ${data.deleted}건 삭제 완료`);
        setSelectedIds([]);
        loadEntries();
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const BULK_HEADERS = ['날짜', '카테고리', '제목', '내용', '태그', '참고URL', '작성자', '이미지파일명'];

  const handleDownloadTemplate = () => {
    const sample = [
      BULK_HEADERS,
      [
        '2026-05-13',
        CATEGORIES[0].label,
        '[Button] Primary 버튼 코너 라운드 변경',
        '코너 라운드값을 4px에서 8px로 조정. 브랜드 가이드라인 개정에 따른 변경.',
        'Button, 코너라운드',
        '',
        authorName || '홍길동',
        'button-radius.jpg',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 14 },
      { wch: 36 },
      { wch: 50 },
      { wch: 20 },
      { wch: 24 },
      { wch: 10 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '히스토리');
    XLSX.writeFile(wb, 'history-archive-template.xlsx');
  };

  const excelDateToISO = (value) => {
    if (!value) return '';
    if (value instanceof Date) {
      const yy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    }
    const str = String(value).trim();
    // "2026.5.13" 나 "2026/5/13" 같은 표기도 허용
    const normalized = str.replace(/[./]/g, '-');
    const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }
    return str;
  };

  const resolveCategoryId = (label) => {
    if (!label) return '기타';
    const norm = String(label).trim();
    const found = CATEGORIES.find(
      (c) => c.label === norm || c.id === norm
    );
    return found ? found.id : null;
  };

  const handleBulkExcelSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkExcelFile(file);
    setBulkFileName(file.name);
    setBulkStatus(null);
  };

  const handleBulkImagesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setBulkImageFiles(files);
  };

  const uploadBulkImage = async (file) => {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ fileBase64: base64, contentType: file.type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '이미지 업로드 실패');
    return data.url;
  };

  const handleBulkStart = async () => {
    if (!bulkExcelFile) {
      setBulkStatus({ type: 'error', msg: '먼저 엑셀 파일을 선택해주세요.' });
      return;
    }

    setBulkStatus(null);
    setBulkSubmitting(true);

    try {
      const buffer = await bulkExcelFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        setBulkStatus({ type: 'error', msg: '엑셀 파일에 데이터가 없습니다.' });
        return;
      }

      const entries = [];
      const warnings = [];

      rows.forEach((row, i) => {
        const rowNo = i + 2; // 헤더가 1행이므로 실제 엑셀 행 번호
        const title = String(row['제목'] || '').trim();
        const content = String(row['내용'] || '').trim();
        const entry_date = excelDateToISO(row['날짜']);

        if (!entry_date || !title || !content) {
          warnings.push(`${rowNo}행: 날짜/제목/내용이 비어있어 건너뜀`);
          return;
        }

        let categoryId = resolveCategoryId(row['카테고리']);
        if (categoryId === null) {
          warnings.push(
            `${rowNo}행: 카테고리 "${row['카테고리']}"를 찾을 수 없어 "기타"로 등록`
          );
          categoryId = '기타';
        }

        const tags = String(row['태그'] || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        entries.push({
          entry_date,
          category: categoryId,
          title,
          content,
          tags,
          reference_url: String(row['참고URL'] || '').trim() || null,
          author_name: String(row['작성자'] || authorName || '').trim() || null,
          image_filename: String(row['이미지파일명'] || '').trim(),
        });
      });

      if (entries.length === 0) {
        setBulkStatus({
          type: 'error',
          msg: '등록 가능한 행이 없습니다. ' + warnings.join(' / '),
        });
        return;
      }

      // 이미지 파일명 매칭 + 업로드 (같은 파일은 한 번만 업로드하도록 캐싱)
      const imageMap = {};
      bulkImageFiles.forEach((f) => {
        imageMap[f.name] = f;
      });
      const uploadedCache = {};
      let imageOkCount = 0;

      for (const entry of entries) {
        const fnames = (entry.image_filename || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const resolvedUrls = [];
        for (const fname of fnames) {
          if (imageMap[fname]) {
            try {
              if (!uploadedCache[fname]) {
                uploadedCache[fname] = await uploadBulkImage(imageMap[fname]);
              }
              resolvedUrls.push(uploadedCache[fname]);
            } catch (err) {
              warnings.push(`"${entry.title}": 이미지 업로드 실패 (${err.message})`);
            }
          } else {
            warnings.push(`"${entry.title}": 이미지 파일 "${fname}"을 찾지 못함`);
          }
        }
        if (resolvedUrls.length > 0) {
          entry.image_url = resolvedUrls.join(',');
          imageOkCount += 1;
        }
        delete entry.image_filename;
      }

      const res = await fetch('/api/records-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();

      if (!res.ok) {
        setBulkStatus({ type: 'error', msg: data.error || '업로드 실패' });
        return;
      }

      const parts = [
        `신규 ${data.inserted}건 등록, 기존 ${data.updated || 0}건 덮어쓰기 완료`,
        `(이미지 첨부 ${imageOkCount}건)`,
      ];
      if (warnings.length)
        parts.push(`건너뜀/경고: ${warnings.length}건 — ${warnings.join(' / ')}`);
      setBulkStatus({ type: 'ok', msg: parts.join(' ') });
      loadEntries();
      setBulkExcelFile(null);
      setBulkImageFiles([]);
    } catch (err) {
      setBulkStatus({
        type: 'error',
        msg: '처리 중 오류가 발생했습니다: ' + (err.message || ''),
      });
    } finally {
      setBulkSubmitting(false);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
      if (bulkImageInputRef.current) bulkImageInputRef.current.value = '';
    }
  };

  const ADMIN_TABS = ['전체', ...CATEGORIES.map((c) => c.label)];

  const elementOptions = Array.from(
    new Set(
      entries
        .map((e) => (e.tags || [])[0])
        .filter(Boolean)
    )
  ).sort();

  const filteredEntries = entries.filter((e) => {
    if (adminTab !== '전체') {
      const meta = CATEGORIES.find((c) => c.id === e.category);
      if (!meta || meta.label !== adminTab) return false;
    }
    if (adminElementFilter && (e.tags || [])[0] !== adminElementFilter) {
      return false;
    }
    if (adminSearch.trim()) {
      const q = adminSearch.trim().toLowerCase();
      const hay = `${e.title} ${e.content} ${(e.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const PAGE_SIZE = 20;
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(adminPage, pageCount);
  const pagedEntries = filteredEntries.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  if (!unlocked) {
    return (
      <>
        <Head>
          <title>관리자 로그인 · History Archive</title>
        </Head>
        <div className="layout admin-panel">
          <div className="topbar">
            <div className="brand">
              <span className="brand-mark">
              <img
                src="/icons/logo-white.png"
                alt=""
                width="19"
                height="19"
              />
            </span>
              History Archive
            </div>
            <Link href="/" className="back-link">
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
        <title>기록 등록 · History Archive</title>
      </Head>
      <div className="layout admin-panel">
        <div className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <img
                src="/icons/logo-white.png"
                alt=""
                width="19"
                height="19"
              />
            </span>
            History Archive
          </div>
          <Link href="/" className="back-link">
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
            <div className="file-field">
              <span className="file-field-display">
                {imageFile ? imageFile.name : '선택된 파일 없음'}
              </span>
              <button
                type="button"
                className="file-field-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                파일 선택
              </button>
              <input
                type="file"
                accept="image/png, image/jpeg"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-black btn-full"
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
                className="btn-danger btn-full"
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

        <div className="bulk-upload-box">
          <p style={{ fontWeight: 700, marginBottom: 6 }}>엑셀로 일괄 등록</p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
            여러 건을 한 번에 등록하고 싶을 때 사용하세요. 템플릿을 받아 채운 뒤, 엑셀과 근거 이미지 파일들을 함께 선택하고 등록을 시작하면 됩니다.
          </p>

          <div className="bulk-row">
            <div className="file-field" style={{ flex: 1, maxWidth: 420 }}>
              <span className="file-field-display">
                {bulkFileName || '엑셀 파일 없음'}
              </span>
              <button
                type="button"
                className="file-field-btn"
                onClick={() => bulkFileInputRef.current?.click()}
                disabled={bulkSubmitting}
              >
                엑셀 선택
              </button>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                ref={bulkFileInputRef}
                onChange={handleBulkExcelSelect}
                disabled={bulkSubmitting}
                style={{ display: 'none' }}
              />
            </div>
            <button
              type="button"
              className="btn-template"
              onClick={handleDownloadTemplate}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <polyline points="7 10 12 15 17 10" />
                <path d="M5 19h14" />
              </svg>
              템플릿 다운로드
            </button>
          </div>

          <div className="bulk-row" style={{ marginTop: 10 }}>
            <div className="file-field" style={{ flex: 1, maxWidth: 420 }}>
              <span className="file-field-display">
                {bulkImageFiles.length > 0
                  ? `이미지 ${bulkImageFiles.length}개 선택됨`
                  : '근거 이미지 없음 (선택)'}
              </span>
              <button
                type="button"
                className="file-field-btn"
                onClick={() => bulkImageInputRef.current?.click()}
                disabled={bulkSubmitting}
              >
                이미지 선택
              </button>
              <input
                type="file"
                accept="image/png, image/jpeg"
                multiple
                ref={bulkImageInputRef}
                onChange={handleBulkImagesSelect}
                disabled={bulkSubmitting}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
            열 구성: 날짜(YYYY-MM-DD) · 카테고리 · 제목 · 내용 · 태그(쉼표구분) · 참고URL · 작성자 · 이미지파일명
            <br />
            이미지파일명 열에 적은 파일명과 정확히 같은 이름의 이미지를 "이미지 선택"에서 함께 골라주세요(장당 5MB 이하, jpg/png). 한 행에 여러 장을 넣고 싶으면 파일명을 쉼표(,)로 구분하면 캐러셀로 보여줘요.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              type="button"
              className="btn btn-black btn-full"
              onClick={handleBulkStart}
              disabled={bulkSubmitting || !bulkExcelFile}
            >
              {bulkSubmitting ? '등록 중…' : '일괄 등록 시작'}
            </button>
          </div>

          {bulkStatus && bulkStatus.type === 'error' && (
            <p className="status-msg error">{bulkStatus.msg}</p>
          )}
        </div>

        {bulkSubmitting && (
          <div className="bulk-overlay">
            <div className="bulk-overlay-box">
              <div className="bulk-spinner" />
              <p>등록 중입니다… 잠시만 기다려주세요.</p>
            </div>
          </div>
        )}

        {bulkStatus && bulkStatus.type === 'ok' && (
          <div className="bulk-overlay">
            <div className="bulk-overlay-box">
              <p style={{ fontWeight: 700, marginBottom: 8 }}>등록 완료</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{bulkStatus.msg}</p>
              <button
                type="button"
                className="btn"
                style={{ marginTop: 16 }}
                onClick={() => setBulkStatus(null)}
              >
                확인
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 48 }}>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>
            등록된 기록 ({filteredEntries.length} / {entries.length})
          </p>

          <div className="admin-tabs">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`admin-tab ${adminTab === tab ? 'active' : ''}`}
                onClick={() => { setAdminTab(tab); setAdminPage(1); }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0 18px' }}>
            <input
              type="text"
              className="admin-search-input"
              placeholder="제목·내용·태그 검색"
              value={adminSearch}
              onChange={(e) => { setAdminSearch(e.target.value); setAdminPage(1); }}
            />
            <select
              className="admin-element-select"
              value={adminElementFilter}
              onChange={(e) => { setAdminElementFilter(e.target.value); setAdminPage(1); }}
            >
              <option value="">엘리먼트 전체 ({elementOptions.length}개)</option>
              {elementOptions.map((el) => (
                <option key={el} value={el}>
                  {el}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0 18px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={
                  filteredEntries.length > 0 &&
                  filteredEntries.every((e) => selectedIds.includes(e.id))
                }
                onChange={() =>
                  toggleSelectAllVisible(filteredEntries.map((e) => e.id))
                }
              />
              전체 선택
            </label>
            <button
              type="button"
              className="btn-danger"
              style={{ borderRadius: 999, padding: '7px 16px', fontSize: 13 }}
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || bulkDeleting}
            >
              선택 삭제 ({selectedIds.length})
            </button>
            <button
              type="button"
              className="btn-danger"
              style={{ borderRadius: 999, padding: '7px 16px', fontSize: 13 }}
              onClick={handleDeleteAll}
              disabled={entries.length === 0 || bulkDeleting}
            >
              전체 삭제 ({entries.length})
            </button>
            {bulkDeleting && (
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>삭제 중…</span>
            )}
          </div>

          {pagedEntries.map((e) => (
            <div className="admin-list-item" key={e.id}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 4 }}
                  checked={selectedIds.includes(e.id)}
                  onChange={() => toggleSelectOne(e.id)}
                />
                <div>
                  <div>{e.title}</div>
                  <div className="meta">
                    {e.entry_date} · {e.category}
                    {e.image_url ? ' · 이미지 있음' : ''}
                    {e.reference_url ? ' · URL 있음' : ''}
                  </div>
                  <div className="meta">
                    {[
                      e.created_by ? `등록: ${e.created_by}` : null,
                      e.updated_by && e.updated_by !== e.created_by
                        ? `최근 수정: ${e.updated_by}`
                        : null,
                      e.updated_at ? `최종 수정일: ${formatDate(e.updated_at)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
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

          {pageCount > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                이전
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === safePage ? 'active' : ''}
                  onClick={() => setAdminPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAdminPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage === pageCount}
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
