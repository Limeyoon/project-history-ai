import { useEffect, useState } from 'react';
import '../styles/globals.css';

function SiteGate({ children }) {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      sessionStorage.getItem('site_unlocked') === '1'
    ) {
      setUnlocked(true);
    }
    setChecked(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/site-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem('site_unlocked', '1');
        setUnlocked(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '비밀번호가 올바르지 않습니다.');
      }
    } catch (err) {
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!checked) return null;

  if (!unlocked) {
    return (
      <div className="site-gate">
        <form className="site-gate-box" onSubmit={handleSubmit}>
          <div className="site-gate-brand">
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
          <p className="site-gate-sub">
            내부 전용 아카이브입니다. 비밀번호를 입력해주세요.
          </p>
          <input
            type="password"
            className="site-gate-input"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? '확인 중…' : '입장하기'}
          </button>
          {error && <p className="site-gate-error">{error}</p>}
        </form>
      </div>
    );
  }

  return children;
}

export default function App({ Component, pageProps }) {
  return (
    <SiteGate>
      <Component {...pageProps} />
    </SiteGate>
  );
}
