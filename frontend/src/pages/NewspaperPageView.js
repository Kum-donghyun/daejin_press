import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';

const API     = '/api';
const BACKEND = '';

function stripHtml(html) {
  if (!html) return '';
  const d = document.createElement('DIV');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

// 6면 소책자 기준 스프레드(펼침면) 구성: [1] [2,3] [4,5] [6] ...
function buildSpreads(pageNumbers) {
  const sorted = [...pageNumbers].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const spreads = [[sorted[0]]];
  let i = 1;
  while (i < sorted.length - 1) {
    spreads.push([sorted[i], sorted[i + 1]]);
    i += 2;
  }
  if (i === sorted.length - 1) spreads.push([sorted[i]]);
  return spreads;
}

/* ── 지면 내 기사 블록(핫스팟) ───────────────────────────────── */
function ArticleBlock({ section, span, onOpen }) {
  const { has_article, title, subtitle, body, photo1_url, reporter_name, view_count, section_name } = section;
  const [hover, setHover] = useState(false);
  const isLarge = span >= 6;
  const isMulti = span >= 8 && !!body && body.length > 220;

  if (!has_article) {
    return (
      <div
        style={{
          gridColumn: `span ${span}`,
          minHeight: '110px',
          background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 8px, #e9ebee 8px, #e9ebee 16px)',
          border: '1px dashed #d1d5db',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#9ca3af', fontSize: '12px', fontWeight: 600,
        }}
      >
        {section_name} · 준비중
      </div>
    );
  }

  const cleanTitle = stripHtml(title);
  const cleanSub   = stripHtml(subtitle);
  const cleanBody  = stripHtml(body);

  return (
    <div
      onClick={() => onOpen(section.article_id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        gridColumn: `span ${span}`,
        position: 'relative',
        cursor: 'pointer',
        padding: '13px',
        border: `1.5px solid ${hover ? '#003580' : '#e5e7eb'}`,
        background: hover ? '#f8fafc' : '#fff',
        boxShadow: hover ? '0 8px 24px rgba(0,53,128,0.16)' : 'none',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {photo1_url && (
        <div style={{ overflow: 'hidden', marginBottom: '9px', height: isLarge ? '190px' : '100px', flexShrink: 0 }}>
          <img
            src={BACKEND + photo1_url}
            alt={cleanTitle}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: hover ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.4s ease',
            }}
          />
        </div>
      )}
      <h3
        style={{
          fontFamily: "'Noto Serif KR', Georgia, serif",
          fontWeight: 700,
          fontSize: isLarge ? 'clamp(16px, 1.7vw, 21px)' : '13.5px',
          lineHeight: 1.35,
          color: hover ? '#003580' : '#111',
          marginBottom: '6px',
          transition: 'color 0.2s',
          wordBreak: 'keep-all',
        }}
      >
        {cleanTitle || '(제목 없음)'}
      </h3>
      {cleanSub && (
        <p style={{ fontSize: isLarge ? '12.5px' : '10.5px', color: '#4b5563', marginBottom: '7px', borderLeft: '2px solid #d32f2f', paddingLeft: '8px', lineHeight: 1.5 }}>
          {cleanSub}
        </p>
      )}
      {cleanBody && (
        <div style={{
          fontSize: '11px', color: '#374151', lineHeight: 1.75,
          marginBottom: '8px', flex: 1,
          columns: isMulti ? 2 : 1,
          columnGap: isMulti ? '18px' : '0',
          wordBreak: 'keep-all',
        }}>
          {cleanBody}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #f3f4f6', fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>
        <span>{reporter_name ? `${reporter_name} 기자` : ''}</span>
        {!!view_count && <span><i className="far fa-eye" style={{ marginRight: '3px' }}></i>{view_count.toLocaleString()}</span>}
      </div>

      {/* 호버 시 나타나는 "읽기" 배지 */}
      <div style={{
        position: 'absolute', top: '10px', right: '10px',
        background: '#003580', color: '#fff', fontSize: '10px', fontWeight: 800,
        padding: '3px 9px', borderRadius: '20px',
        opacity: hover ? 1 : 0, transform: hover ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'all 0.2s ease', pointerEvents: 'none',
        letterSpacing: '0.3px', zIndex: 2,
      }}>
        기사 읽기 →
      </div>
    </div>
  );
}

/* ── 지면(한 페이지) 렌더링 ──────────────────────────────────── */
function PageSheet({ page, onOpenArticle, wide }) {
  if (!page) return null;
  const totalVolume = page.sections.reduce((sum, s) => sum + (s.volume || 4), 0) || 1;

  return (
    <div
      style={{
        background: '#fff', border: '1px solid #d1d5db', padding: '22px',
        boxShadow: '0 2px 18px rgba(0,0,0,0.06)', minHeight: '600px',
        flex: wide ? '1 1 0' : '0 0 auto',
        width: wide ? undefined : '100%',
        maxWidth: wide ? undefined : '760px',
        margin: wide ? 0 : '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '9px', borderBottom: '2px solid #111' }}>
        <span style={{ background: '#d32f2f', color: '#fff', fontWeight: 900, fontSize: '13px', padding: '3px 10px', flexShrink: 0 }}>{page.page_number}면</span>
        {page.headline && (
          <span style={{ fontFamily: "'Noto Serif KR', serif", fontWeight: 700, fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stripHtml(page.headline)}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>THE DAEJIN UNIVERSITY PRESS</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '13px', alignItems: 'start' }}>
        {page.sections.map(section => {
          // volume 비중에 따라 12칸 그리드 중 상대적 칸 수 배정 (최소 4, 최대 12)
          const ratio = (section.volume || 4) / totalVolume;
          const span  = Math.max(4, Math.min(12, Math.round(ratio * 12)));
          return (
            <ArticleBlock key={section.section_id} section={section} span={span} onOpen={onOpenArticle} />
          );
        })}
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ───────────────────────────────────────────── */
export default function NewspaperPageView() {
  const { id = 'latest' } = useParams();
  const navigate = useNavigate();

  const [newspaper, setNewspaper] = useState(null);
  const [pages, setPages]         = useState([]);
  const [issues, setIssues]       = useState([]);
  const [activeSpread, setActiveSpread] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [zoom, setZoom]           = useState(1);
  const containerRef = useRef(null);

  const fetchIssues = useCallback(() => {
    axios.get(`${API}/newspapers/published/list`).then(res => setIssues(res.data.issues || [])).catch(() => {});
  }, []);

  const fetchPages = useCallback((newspaperId) => {
    setLoading(true);
    axios.get(`${API}/newspapers/published/${newspaperId}/pages`)
      .then(res => {
        setNewspaper(res.data.newspaper);
        setPages(res.data.pages || []);
        setActiveSpread(0);
      })
      .catch(() => { setNewspaper(null); setPages([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);
  useEffect(() => { fetchPages(id); window.scrollTo({ top: 0 }); }, [id, fetchPages]);

  const spreads = buildSpreads(pages.map(p => p.page_number));
  const pageByNumber = Object.fromEntries(pages.map(p => [p.page_number, p]));
  const currentSpread = spreads[activeSpread] || [];

  const goToSpread = (idx) => {
    if (idx < 0 || idx >= spreads.length || idx === activeSpread) return;
    setActiveSpread(idx);
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 키보드 좌우 화살표로 스프레드 넘기기
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') goToSpread(activeSpread + 1);
      if (e.key === 'ArrowLeft')  goToSpread(activeSpread - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line
  }, [activeSpread, spreads.length]);

  const openArticle = (aid) => { if (aid) navigate(`/article/${aid}`); };

  return (
    <div style={{ background: '#eef0f2', minHeight: '100vh' }}>

      {/* ── 슬림 정보 바 (전역 Navbar 아래, 마스트헤드 중복 방지) ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-book-open" style={{ color: '#003580' }}></i>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#003580' }}>지면보기</span>
            {newspaper && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>제{newspaper.issue_number}호 · {formatDate(newspaper.publish_date)}</span>
            )}
          </div>
          {issues.length > 0 && (
            <select
              value={newspaper?.id || ''}
              onChange={e => navigate(`/newspaper-view/${e.target.value}`)}
              style={{ fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '5px 8px', color: '#374151', background: '#fff' }}
            >
              {issues.map(iss => (
                <option key={iss.id} value={iss.id}>제{iss.issue_number}호 · {formatDate(iss.publish_date)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── 지면안내 탭 ── */}
      {spreads.length > 0 && (
        <div style={{ background: '#003580', borderBottom: '4px solid #d32f2f' }}>
          <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'stretch', overflowX: 'auto' }} className="scroll-hide">
            <span style={{ color: '#FFD700', fontWeight: 900, fontSize: '12px', display: 'flex', alignItems: 'center', paddingRight: '14px', flexShrink: 0 }}>지면안내</span>
            {spreads.map((spread, idx) => {
              const label = spread.join('·');
              const firstPage = pageByNumber[spread[0]];
              return (
                <button
                  key={label}
                  onClick={() => goToSpread(idx)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                    borderBottom: activeSpread === idx ? '3px solid #FFD700' : '3px solid transparent',
                    color: activeSpread === idx ? '#fff' : 'rgba(255,255,255,0.65)',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    minWidth: '22px', height: '20px', borderRadius: '10px', fontSize: '11px', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '0 5px',
                    background: activeSpread === idx ? '#FFD700' : 'rgba(255,255,255,0.15)',
                    color: activeSpread === idx ? '#003580' : '#fff',
                  }}>{label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stripHtml(firstPage?.headline) || `${label}면`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 지면 캔버스 ── */}
      <div ref={containerRef} style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 20px 60px', position: 'relative' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '30px', display: 'block', marginBottom: '12px' }}></i>
            지면을 불러오는 중입니다...
          </div>
        ) : !newspaper || spreads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
            <i className="fas fa-newspaper" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', color: '#d1d5db' }}></i>
            <p style={{ fontSize: '16px', fontWeight: 700 }}>표시할 지면이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 확대/축소 컨트롤 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '14px' }}>
              <button onClick={() => setZoom(z => Math.max(0.6, +(z - 0.1).toFixed(1)))}
                style={{ width: '32px', height: '32px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}>
                <i className="fas fa-minus"></i>
              </button>
              <span style={{ width: '48px', textAlign: 'center', fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.2, +(z + 0.1).toFixed(1)))}
                style={{ width: '32px', height: '32px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}>
                <i className="fas fa-plus"></i>
              </button>
            </div>

            {/* 이전/다음 화살표 (좌우 고정) */}
            {activeSpread > 0 && (
              <button onClick={() => goToSpread(activeSpread - 1)}
                className="page-nav-arrow page-nav-arrow-left"
                aria-label="이전 지면">
                <i className="fas fa-chevron-left"></i>
              </button>
            )}
            {activeSpread < spreads.length - 1 && (
              <button onClick={() => goToSpread(activeSpread + 1)}
                className="page-nav-arrow page-nav-arrow-right"
                aria-label="다음 지면">
                <i className="fas fa-chevron-right"></i>
              </button>
            )}

            <div key={activeSpread} className="page-spread-flip" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.25s ease' }}>
              <div style={{ display: 'flex', gap: '18px', alignItems: 'stretch', justifyContent: 'center' }}>
                {currentSpread.map(pn => (
                  <PageSheet
                    key={pn}
                    page={pageByNumber[pn]}
                    onOpenArticle={openArticle}
                    wide={currentSpread.length > 1}
                  />
                ))}
              </div>
            </div>

            {/* 하단 점 네비게이터 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              {spreads.map((spread, idx) => (
                <button
                  key={spread.join('-')}
                  onClick={() => goToSpread(idx)}
                  aria-label={`${spread.join('·')}면으로 이동`}
                  style={{
                    width: activeSpread === idx ? '22px' : '8px', height: '8px', borderRadius: '4px',
                    border: 'none', cursor: 'pointer',
                    background: activeSpread === idx ? '#003580' : '#cbd5e1',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', marginTop: '10px' }}>
              ← → 방향키로도 지면을 넘길 수 있습니다 · 기사 위에 마우스를 올려 미리보기 후 클릭하면 전체 기사로 이동합니다
            </p>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
