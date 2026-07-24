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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedQuery(query);
  };

  const toggleCategory = (id) => {
    setActiveCategory((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <Head>
        <title>Project History AI</title>
      </Head>
      <div className="layout">
        <div className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#fff">
                <circle cx="12" cy="7.2" r="1.9" />
                <rect x="10.3" y="10.5" width="3.4" height="9" rx="1.7" />
              </svg>
            </span>
            Project History AI
          </div>
          <Link href="/admin" className="topbar-link topbar-link-edit">
            <span className="edit-icon" aria-hidden="true">✎</span>
            히스토리 등록/관리
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
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="search-submit" type="submit" aria-label="검색">
              →
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
              <span
                className="category-icon"
                style={{ background: c.color }}
              >
                <CategoryIcon icon={c.icon} />
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
                  <h2 className="entry-title">{entry.title}</h2>
                  {entry.image_url && (
                    <img
                      src={entry.image_url}
                      alt={entry.title}
                      className="entry-image"
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
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="tag-row">
                      {entry.tags.map((t) => (
                        <span className="tag" key={t}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
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
    </>
  );
}

function CategoryIcon({ icon }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#fff',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  if (icon === 'design') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (icon === 'exception') {
    return (
      <svg {...common}>
        <path d="M12 3 L22 20 L2 20 Z" />
        <line x1="12" y1="9" x2="12" y2="14" />
        <circle cx="12" cy="17.3" r="0.6" fill="#fff" stroke="none" />
      </svg>
    );
  }

  if (icon === 'typography') {
    return (
      <span style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Aa</span>
    );
  }

  if (icon === 'dev') {
    return (
      <svg {...common}>
        <polyline points="8 6 3 12 8 18" />
        <polyline points="16 6 21 12 16 18" />
      </svg>
    );
  }

  // etc
  return (
    <svg {...common} fill="#fff" stroke="none">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}
