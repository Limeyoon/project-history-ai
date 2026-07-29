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

  const tagGroups = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      (e.tags || []).forEach((t) => {
        if (!map[t]) map[t] = [];
        map[t].push(e);
      });
    });
    return Object.entries(map)
      .filter(([, list]) => list.length >= 2)
      .map(([tag, list]) => ({
        tag,
        items: [...list].sort(
          (a, b) => new Date(b.entry_date) - new Date(a.entry_date)
        ),
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [entries]);

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
              onChange={(e) => setQuery(e.target.value)}
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

        {!hasActiveFilter && tagGroups.length > 0 && (
          <div className="related-history-section">
            <h3 className="related-history-title">관련 히스토리 묶어보기</h3>
            <p className="related-history-sub">
              같은 태그로 묶인 항목을 버전 히스토리처럼 한눈에 확인하세요.
            </p>
            {tagGroups.map((group) => (
              <div className="related-history-card" key={group.tag}>
                <div className="related-history-card-head">#{group.tag}</div>
                {group.items.map((entry, idx) => (
                  <div className="related-history-item" key={entry.id}>
                    <div className="related-history-item-top">
                      <span className="related-history-item-title">
                        {entry.title}
                      </span>
                      {idx === 0 && (
                        <span className="latest-badge">최신</span>
                      )}
                    </div>
                    <div className="related-history-item-date">
                      {formatDate(entry.entry_date)}
                    </div>
                    <p className="related-history-item-desc">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

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

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}
