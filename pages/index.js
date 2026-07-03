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

  const countByCategory = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + 1;
    });
    return map;
  }, [entries]);

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
            <span className="brand-mark" />
            Project History AI
          </div>
          <Link href="/admin" className="topbar-link">
            관리자
          </Link>
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
                style={{ background: `${c.color}1a`, color: c.color }}
              >
                {c.icon}
              </span>
              <div>
                <div className="category-title">{c.label}</div>
                <div className="category-desc">{c.desc}</div>
              </div>
              <span className="category-count">
                {countByCategory[c.id] || 0}건
              </span>
            </button>
          ))}
        </div>

        <div className="hero">
          <h1 className="hero-title">무엇을 도와드릴까요?</h1>
          <p className="hero-sub">
            저장된 프로젝트 히스토리에서 제목, 내용, 카테고리, 태그를 검색합니다.
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

        {hasActiveFilter && !loading && (
          <p className="search-meta">
            {activeCategory ? `${activeCategory} · ` : ''}
            {submittedQuery ? `"${submittedQuery}" · ` : ''}
            {filtered.length}건 검색됨
          </p>
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
                  <p className="entry-content">{entry.content}</p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="tag-row">
                      {entry.tags.map((t) => (
                        <span className="tag" key={t}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="register-bar">
          <Link href="/admin" className="btn-primary">
            + 히스토리 등록
          </Link>
          <span className="register-note">
            새로운 프로젝트 히스토리를 등록하세요. 현재 {entries.length}건
            저장됨.
          </span>
        </div>
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
