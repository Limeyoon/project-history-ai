import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CATEGORIES, categoryMeta } from '../lib/categories';

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/records')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
        } else {
          setEntries(data.entries || []);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('기록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();
    return entries.filter((e) => {
      if (activeCategory && e.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = [e.title, e.content, e.category, ...(e.tags || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, submittedQuery, activeCategory]);

  const hasActiveFilter = Boolean(activeCategory || submittedQuery.trim());

  const handleDeleteEntry = async (id) => {
    if (!confirm('이 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    const pw = window.prompt('관리자 비밀번호를 입력해주세요.');
    if (!pw) return;
    try {
      const res = await fetch(`/api/records?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': pw },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '삭제에 실패했습니다. 비밀번호를 확인해주세요.');
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const [elementFilter, setElementFilter] = useState('');

  const tagGroups = useMemo(() => {
    const map = {};
    entries
      .filter((e) => !activeCategory || e.category === activeCategory)
      .forEach((e) => {
        (e.tags || []).forEach((t) => {
          if (!map[t]) map[t] = [];
          map[t].push(e);
        });
      });
    return Object.entries(map)
      .map(([tag, list]) => ({
        tag,
        items: [...list].sort(
          (a, b) => new Date(b.entry_date) - new Date(a.entry_date)
        ),
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [entries, activeCategory]);

  const displayedGroups = elementFilter
    ? tagGroups.filter((g) => g.tag === elementFilter)
    : tagGroups.filter((g) => g.items.length >= 2);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedQuery(query);
  };

  const toggleCategory = (id) => {
    setActiveCategory((prev) => (prev === id ? null : id));
    setElementFilter('');
  };

  return (
    <>
      <Head>
        <title>History Archive</title>
      </Head>
      <div className="layout">
        <div className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <img
                src="https://img.icons8.com/sf-black-filled/64/folder-invoices.png"
                alt=""
                width="18"
                height="18"
              />
            </span>
            History Archive
          </div>
          <Link
            href="/admin"
            className="topbar-link topbar-link-edit"
          >
            히스토리 추가
          </Link>
        </div>

        <div className="hero">
          <h1 className="hero-title">무엇을 도와드릴까요?</h1>
          <p className="hero-sub">
            저장된 프로젝트 히스토리에서 제목, 내용, 카테고리, 태그를 검색합니다.
            {' '}현재 {entries.length}건 저장됨.
          </p>
          <form className="search-box" onSubmit={handleSearchSubmit}>
            <input
              className="search-input"
              type="text"
              placeholder="궁금한 내용을 검색해보세요"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSubmittedQuery(e.target.value);
              }}
            />
            <button className="search-submit" type="submit" aria-label="검색">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.2" y2="16.2" />
              </svg>
            </button>
          </form>
        </div>

        <div className="category-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`category-card ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => toggleCategory(c.id)}
              type="button"
            >
              <span className="category-icon">
                <img
                  src={c.icon}
                  alt={c.label}
                  width="34"
                  height="34"
                  style={c.iconFilter ? { filter: c.iconFilter } : undefined}
                />
              </span>
              <div className="category-title">{c.label}</div>
            </button>
          ))}
        </div>

        {loadError && <div className="notice">{loadError}</div>}

        {hasActiveFilter && (
          <div className="entries">
            {!loadError && filtered.length === 0 && !loading && (
              <div className="empty-state">
                검색 조건에 맞는 기록이 없습니다.
              </div>
            )}
            {filtered.map((entry) => {
              const meta = categoryMeta(entry.category);
              return (
                <article className="entry-card" key={entry.id}>
                  <div className="entry-top">
                    <div className="entry-top-left">
                      <span
                        className="entry-category-pill"
                        style={{ background: `${meta.color}1a`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="entry-date">
                        {formatDate(entry.entry_date)}
                      </span>
                    </div>
                    <div className="entry-actions">
                      <Link
                        href={`/admin?edit=${entry.id}`}
                        className="entry-edit-link"
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        className="entry-delete-link"
                        onClick={() => handleDeleteEntry(entry.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <h2 className="entry-title">{entry.title}</h2>
                  {entry.image_url && (
                    <ImageCarousel
                      urls={entry.image_url.split(',')}
                      alt={entry.title}
                      className="entry-image"
                      onOpen={setLightboxUrl}
                    />
                  )}
                  <p className="entry-content">{entry.content}</p>
                  {entry.reference_url && (
                    <a
                      href={entry.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="entry-reference-link"
                    >
                      참고 URL 열기 ↗
                    </a>
                  )}
                  {(() => {
                    const normalize = (s) => (s || '').replace(/\s+/g, '').toLowerCase();
                    const visibleTags = (entry.tags || []).filter(
                      (t) => normalize(t) !== normalize(entry.category)
                    );
                    if (visibleTags.length === 0) return null;
                    return (
                      <div className="tag-row">
                        {visibleTags.map((t) => (
                          <span className="tag" key={t}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  {(entry.created_by || entry.updated_by) && (
                    <p className="entry-author-meta">
                      {entry.created_by ? `등록: ${entry.created_by}` : ''}
                      {entry.updated_by &&
                      entry.updated_by !== entry.created_by
                        ? `${entry.created_by ? ' · ' : ''}최근 수정: ${
                            entry.updated_by
                          } (${formatDate(entry.updated_at)})`
                        : ''}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {hasActiveFilter && !loading && (
          <p className="search-meta search-meta-bottom">
            {activeCategory ? `${activeCategory} · ` : ''}
            {submittedQuery ? `"${submittedQuery}" · ` : ''}
            {filtered.length}건 검색됨
          </p>
        )}
      </div>

      {lightboxUrl && (
        <div className="lightbox" onClick={() => setLightboxUrl(null)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightboxUrl(null)}
            aria-label="닫기"
          >
            ✕
          </button>
          <img src={lightboxUrl} alt="" className="lightbox-img" />
        </div>
      )}
    </>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

function ImageCarousel({ urls, alt, className, onOpen }) {
  const list = (urls || []).map((u) => u.trim()).filter(Boolean);
  const [idx, setIdx] = useState(0);

  if (list.length === 0) return null;

  const go = (e, delta) => {
    e.stopPropagation();
    setIdx((i) => (i + delta + list.length) % list.length);
  };

  if (list.length === 1) {
    return (
      <img
        src={list[0]}
        alt={alt}
        className={className}
        onClick={() => onOpen && onOpen(list[0])}
      />
    );
  }

  return (
    <div className="carousel">
      <img
        src={list[idx]}
        alt={alt}
        className={className}
        onClick={() => onOpen && onOpen(list[idx])}
      />
      <button
        type="button"
        className="carousel-nav prev"
        onClick={(e) => go(e, -1)}
        aria-label="이전 이미지"
      >
        ‹
      </button>
      <button
        type="button"
        className="carousel-nav next"
        onClick={(e) => go(e, 1)}
        aria-label="다음 이미지"
      >
        ›
      </button>
      <div className="carousel-dots">
        {list.map((_, i) => (
          <span
            key={i}
            className={`carousel-dot ${i === idx ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIdx(i);
            }}
          />
        ))}
      </div>
      <span className="carousel-count">
        {idx + 1} / {list.length}
      </span>
    </div>
  );
}
