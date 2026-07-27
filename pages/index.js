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
        <title>History Archive</title>
      </Head>
      <div className="layout">
        <div className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  d="M3 6.8c0-.66.54-1.2 1.2-1.2h4.7l1.3 1.4h8.6c.66 0 1.2.54 1.2 1.2v9.6c0 .66-.54 1.2-1.2 1.2H4.2c-.66 0-1.2-.54-1.2-1.2z"
                  fill="#fff"
                />
                <circle
                  cx="14.3"
                  cy="14.3"
                  r="3.1"
                  fill="none"
                  stroke="#2F6FED"
                  strokeWidth="1.8"
                />
                <line
                  x1="16.6"
                  y1="16.6"
                  x2="19"
                  y2="19"
                  stroke="#2F6FED"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            History Archive
          </div>
          <Link href="/admin" className="topbar-link topbar-link-edit">
            <svg
              className="edit-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="#fff"
            >
              <path d="M4 15.5V20h4.5L20.8 7.7c.4-.4.4-1 0-1.4l-3.1-3.1c-.4-.4-1-.4-1.4 0L4 15.5zM17.7 4.4l2.9 2.9-1.9 1.9-2.9-2.9 1.9-1.9z" />
            </svg>
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
              <span className="category-icon">
                <CategoryIcon icon={c.icon} color={c.color} />
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
                    <Link
                      href={`/admin?edit=${entry.id}`}
                      className="entry-edit-link"
                    >
                      ✎ 수정하기
                    </Link>
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
    </>
  );
}

function CategoryIcon({ icon, color }) {
  const shadow = { filter: 'drop-shadow(0 3px 5px rgba(20,20,30,0.18))' };

  if (icon === 'design') {
    // 팔레트 모양의 플랫 아이콘
    return (
      <svg viewBox="0 0 24 24" width="30" height="30" style={shadow}>
        <ellipse cx="12" cy="12" rx="9.5" ry="8" fill={color} />
        <circle cx="16.2" cy="14.3" r="2.6" fill="#fff" />
        <circle cx="8.2" cy="8.8" r="1.4" fill="#fff" />
        <circle cx="12.5" cy="6.8" r="1.4" fill="#fff" />
        <circle cx="16.6" cy="8.8" r="1.4" fill="#fff" />
      </svg>
    );
  }

  if (icon === 'exception') {
    // 핀(마커) 모양의 플랫 아이콘
    return (
      <svg viewBox="0 0 24 24" width="30" height="30" style={shadow}>
        <path
          d="M12 2.2c-4.42 0-8 3.53-8 7.88 0 5.9 8 11.7 8 11.7s8-5.8 8-11.7c0-4.35-3.58-7.88-8-7.88z"
          fill={color}
        />
        <circle cx="12" cy="10" r="3.1" fill="#fff" />
      </svg>
    );
  }

  if (icon === 'typography') {
    // 볼드 T 글자 형태의 플랫 아이콘
    return (
      <svg viewBox="0 0 24 24" width="30" height="30" style={shadow}>
        <rect x="3.5" y="4" width="17" height="4.4" rx="2.2" fill={color} />
        <rect x="9.8" y="4" width="4.4" height="16" rx="2.2" fill={color} />
      </svg>
    );
  }

  if (icon === 'dev') {
    // 코드 브래킷 형태의 플랫(면 채움) 아이콘
    return (
      <svg viewBox="0 0 24 24" width="30" height="30" style={shadow}>
        <polygon points="9.5,4.5 3,12 9.5,19.5 11.6,17.3 6.9,12 11.6,6.7" fill={color} />
        <polygon points="14.5,4.5 21,12 14.5,19.5 12.4,17.3 17.1,12 12.4,6.7" fill={color} />
      </svg>
    );
  }

  // etc — 폴더 형태의 플랫 아이콘
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" style={shadow}>
      <rect x="3.5" y="8.5" width="17" height="11.5" rx="2.4" fill={color} />
      <rect x="3.5" y="5" width="8.5" height="4.4" rx="2.2" fill={color} />
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
