import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API = '/api';

// 키워드를 텍스트에서 하이라이트
function Highlight({ text = '', keyword = '' }) {
  if (!keyword || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === keyword.toLowerCase()
          ? <mark key={i} style={{ background: '#fef08a', color: '#111827', borderRadius: '2px', padding: '0 1px' }}>{p}</mark>
          : p
      )}
    </>
  );
}

// 본문에서 키워드 주변 발췌
function excerpt(body = '', keyword = '', len = 140) {
  if (!body) return '';
  const idx = body.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return body.slice(0, len) + (body.length > len ? '…' : '');
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + len - 40);
  return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialQ = searchParams.get('q') || '';
  const [input, setInput] = useState(initialQ);
  const [query, setQuery]   = useState(initialQ);
  const [results, setResults]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);

  const doSearch = useCallback(async (q, p = 1) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${API}/newspapers/search?q=${encodeURIComponent(q)}&page=${p}&limit=15`);
      const data = await res.json();
      setResults(data.articles || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setPage(p);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // URL 쿼리 변경 시 자동 검색
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const p = parseInt(searchParams.get('page') || '1');
    if (q) {
      setInput(q);
      setQuery(q);
      doSearch(q, p);
    }
  }, [searchParams, doSearch]);

  const handleSubmit = e => {
    e.preventDefault();
    if (!input.trim()) return;
    setSearchParams({ q: input.trim(), page: 1 });
  };

  const handlePage = p => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSearchParams({ q: query, page: p });
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* ── 검색 바 ── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0', marginBottom: '36px' }}>
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="기사 제목, 본문, 기자 이름으로 검색"
          style={{
            flex: 1,
            padding: '14px 18px',
            fontSize: '15px',
            border: '2px solid #003580',
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            outline: 'none',
            color: '#111827',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '14px 22px',
            background: '#003580',
            color: '#fff',
            border: '2px solid #003580',
            borderRadius: '0 8px 8px 0',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          <i className="fas fa-search"></i>
        </button>
      </form>

      {/* ── 결과 헤더 ── */}
      {searched && !loading && (
        <div style={{ marginBottom: '20px', paddingBottom: '14px', borderBottom: '2px solid #e5e7eb', display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#111827' }}>
            "{query}"
          </h2>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {total > 0 ? `검색 결과 ${total}건` : '검색 결과가 없습니다'}
          </span>
        </div>
      )}

      {/* ── 로딩 ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', marginBottom: '12px', display: 'block' }}></i>
          검색 중...
        </div>
      )}

      {/* ── 결과 없음 ── */}
      {searched && !loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: '#9ca3af' }}>
          <i className="fas fa-search" style={{ fontSize: '40px', marginBottom: '16px', display: 'block', opacity: 0.3 }}></i>
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#6b7280' }}>
            "{query}"에 해당하는 기사를 찾지 못했습니다.
          </p>
          <p style={{ fontSize: '13px' }}>다른 키워드로 다시 검색해 보세요.</p>
        </div>
      )}

      {/* ── 결과 목록 ── */}
      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {results.map((a, idx) => {
            const hasPhoto = !!a.photo1_url;
            const bodySnippet = excerpt(a.body, query);
            return (
              <div
                key={a.id}
                onClick={() => navigate(`/article/${a.id}`)}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '20px 4px',
                  borderBottom: idx < results.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  borderRadius: '8px',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* 썸네일 */}
                {hasPhoto && (
                  <div style={{ flexShrink: 0, width: '110px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: '#f3f4f6' }}>
                    <img
                      src={a.photo1_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                {/* 텍스트 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 메타 태그 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#e8edf5', color: '#003580' }}>
                      제{a.issue_number}호
                    </span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{a.section_name}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>·</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      <Highlight text={a.reporter_name} keyword={query} />
                    </span>
                    <span style={{ fontSize: '11px', color: '#d1d5db', marginLeft: 'auto' }}>
                      {new Date(a.approved_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  {/* 제목 */}
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '6px', lineHeight: 1.4 }}>
                    <Highlight text={a.title} keyword={query} />
                  </h3>

                  {/* 부제 */}
                  {a.subtitle && (
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px', lineHeight: 1.5 }}>
                      <Highlight text={a.subtitle} keyword={query} />
                    </p>
                  )}

                  {/* 본문 발췌 */}
                  <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    <Highlight text={bodySnippet} keyword={query} />
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '36px', flexWrap: 'wrap' }}>
          {page > 1 && (
            <button onClick={() => handlePage(page - 1)}
              style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
              <i className="fas fa-chevron-left"></i>
            </button>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...'
                ? <span key={`e${i}`} style={{ padding: '8px 6px', color: '#9ca3af', fontSize: '13px' }}>…</span>
                : <button key={p} onClick={() => handlePage(p)}
                    style={{ padding: '8px 13px', border: '1.5px solid', borderColor: p === page ? '#003580' : '#e5e7eb', borderRadius: '6px', background: p === page ? '#003580' : '#fff', color: p === page ? '#fff' : '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: p === page ? 700 : 400 }}>
                    {p}
                  </button>
            )}
          {page < totalPages && (
            <button onClick={() => handlePage(page + 1)}
              style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
              <i className="fas fa-chevron-right"></i>
            </button>
          )}
        </div>
      )}

      {/* ── 초기 상태 (아직 검색 전) ── */}
      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: '#d1d5db' }}>
          <i className="fas fa-search" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>
          <p style={{ fontSize: '15px', color: '#9ca3af' }}>검색어를 입력하세요</p>
          <p style={{ fontSize: '13px', color: '#d1d5db', marginTop: '6px' }}>제목, 본문, 기자 이름으로 검색할 수 있습니다</p>
        </div>
      )}
    </div>
  );
}
