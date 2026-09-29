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

/* ── 지면 내 기사 블록(핫스팟) ───────────────────────────────── */
function ArticleBlock({ section, span, onOpen }) {
  const { has_article, title, subtitle, body, photo1_url, reporter_name, view_count, section_name } = section;
  const [hover, setHover] = useState(false);

  if (!has_article) {
    return (
      <div
        style={{
          gridColumn: `span ${span}`,
          minHeight: '120px',
          background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 8px, #e5e7eb 8px, #e5e7eb 16px)',
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
        padding: '14px',
        border: `1.5px solid ${hover ? '#003580' : '#e5e7eb'}`,
        background: hover ? '#f8fafc' : '#fff',
        boxShadow: hover ? '0 8px 24px rgba(0,53,128,0.16)' : 'none',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'all 0.2s ease',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {photo1_url && (
        <div style={{ overflow: 'hidden', marginBottom: '10px', height: span >= 4 ? '200px' : '110px' }}>
          <img
            src={BACKEND + photo1_url}
            alt={cleanTitle}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: hover ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.4s ease',
            }}
          />
        </div>
      )}
      <h3
        style={{
          fontFamily: "'Noto Serif KR', Georgia, serif",
          fontWeight: 700,
          fontSize: span >= 4 ? 'clamp(17px, 2vw, 23px)' : '14px',
          lineHeight: 1.35,
          color: hover ? '#003580' : '#111',
          marginBottom: '6px',
          transition: 'color 0.2s',
        }}
      >
        {cleanTitle || '(제목 없음)'}
      </h3>
      {cleanSub && (
        <p style={{ fontSize: span >= 4 ? '13px' : '11px', color: '#4b5563', marginBottom: '6px', borderLeft: '2px solid #d32f2f', paddingLeft: '8px', lineHeight: 1.5 }}>
          {cleanSub}
        </p>
      )}
      {cleanBody && (
        <p style={{
          fontSize: '11.5px', color: '#6b7280', lineHeight: 1.7,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: span >= 4 ? 4 : 2, WebkitBoxOrient: 'vertical',
          marginBottom: '8px', flex: 1,
        }}>
          {cleanBody}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #f3f4f6', fontSize: '10.5px', color: '#9ca3af' }}>
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
        letterSpacing: '0.3px',
      }}>
        기사 읽기 →
      </div>
    </div>
  );
}

/* ── 지면(한 페이지) 렌더링 ──────────────────────────────────── */
function PageSheet({ page, onOpenArticle, flipDir }) {
  if (!page) return null;
  const totalVolume = page.sections.reduce((sum, s) => sum + (s.volume || 4), 0) || 1;

  return (
    <div
      key={page.page_number}
      className={`page-sheet-flip ${flipDir}`}
      style={{
        background: '#fff', border: '1px solid #d1d5db', padding: '28px',
        boxShadow: '0 2px 18px rgba(0,0,0,0.06)', minHeight: '640px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '10px', borderBottom: '2px solid #111' }}>
        <span style={{ background: '#d32f2f', color: '#fff', fontWeight: 900, fontSize: '13px', padding: '3px 10px' }}>{page.page_number}면</span>
        {page.headline && (
          <span style={{ fontFamily: "'Noto Serif KR', serif", fontWeight: 700, fontSize: '14px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stripHtml(page.headline)}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '14px' }}>
        {page.sections.map(section => {
          // volume 비중에 따라 12칸 그리드 중 상대적 칸 수 배정 (최소 3, 최대 12)
          const ratio = (section.volume || 4) / totalVolume;
          const span  = Math.max(3, Math.min(12, Math.round(ratio * 12)));
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
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [zoom, setZoom]           = useState(1);
  const [flipDir, setFlipDir]     = useState('');
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
        setActivePage((res.data.pages && res.data.pages[0]?.page_number) || 1);
      })
      .catch(() => { setNewspaper(null); setPages([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);
  useEffect(() => { fetchPages(id); window.scrollTo({ top: 0 }); }, [id, fetchPages]);

  const goToPage = (pageNumber, dir) => {
    if (pageNumber === activePage) return;
    setFlipDir(dir || (pageNumber > activePage ? 'flip-next' : 'flip-prev'));
    setActivePage(pageNumber);
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const currentIndex = pages.findIndex(p => p.page_number === activePage);
  const currentPage  = pages[currentIndex];

  // 키보드 좌우 화살표로 페이지 넘기기
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' && currentIndex < pages.length - 1) goToPage(pages[currentIndex + 1].page_number, 'flip-next');
      if (e.key === 'ArrowLeft'  && currentIndex > 0) goToPage(pages[currentIndex - 1].page_number, 'flip-prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line
  }, [currentIndex, pages]);

  return (
    <div style={{ background: '#eef0f2', minHeight: '100vh' }}>

      {/* ── 신문 마스트헤드 리플리카 ── */}
      <div style={{ background: '#fff', borderBottom: '3px double #003580', padding: '22px 0 16px' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '1px', width: '160px' }}>
              {newspaper ? `제${newspaper.issue_number}호` : ''}
            </span>
            <h1 className="masthead-title" style={{ color: '#003580', textAlign: 'center', flex: 1 }}>대진대학교 신문사</h1>
            <span style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '1px', width: '160px', textAlign: 'right' }}>
              {newspaper ? formatDate(newspaper.publish_date) : ''}
            </span>
          </div>
          <div style={{ borderTop: '1px solid #003580', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280' }}>THE DAEJIN UNIVERSITY PRESS · 지면보기(인터랙티브)</p>
            {issues.length > 0 && (
              <select
                value={newspaper?.id || ''}
                onChange={e => navigate(`/newspaper-view/${e.target.value}`)}
                style={{ fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', color: '#374151', background: '#fff' }}
              >
                {issues.map(iss => (
                  <option key={iss.id} value={iss.id}>제{iss.issue_number}호 · {formatDate(iss.publish_date)}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── 지면안내 탭 ── */}
      {pages.length > 0 && (
        <div style={{ background: '#003580', borderBottom: '4px solid #d32f2f' }}>
          <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'stretch', overflowX: 'auto' }} className="scroll-hide">
            <span style={{ color: '#FFD700', fontWeight: 900, fontSize: '12px', display: 'flex', alignItems: 'center', paddingRight: '14px', flexShrink: 0 }}>지면안내</span>
            {pages.map(p => (
              <button
                key={p.page_number}
                onClick={() => goToPage(p.page_number)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                  borderBottom: activePage === p.page_number ? '3px solid #FFD700' : '3px solid transparent',
                  color: activePage === p.page_number ? '#fff' : 'rgba(255,255,255,0.65)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: '20px', height: '20px', borderRadius: '50%', fontSize: '11px', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: activePage === p.page_number ? '#FFD700' : 'rgba(255,255,255,0.15)',
                  color: activePage === p.page_number ? '#003580' : '#fff',
                }}>{p.page_number}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stripHtml(p.headline) || `${p.page_number}면`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 지면 캔버스 ── */}
      <div ref={containerRef} style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 20px 60px', position: 'relative' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '30px', display: 'block', marginBottom: '12px' }}></i>
            지면을 불러오는 중입니다...
          </div>
        ) : !newspaper || pages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
            <i className="fas fa-newspaper" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', color: '#d1d5db' }}></i>
            <p style={{ fontSize: '16px', fontWeight: 700 }}>표시할 발행 지면이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 확대/축소 컨트롤 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '14px' }}>
              <button onClick={() => setZoom(z => Math.max(0.7, +(z - 0.1).toFixed(1)))}
                style={{ width: '32px', height: '32px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}>
                <i className="fas fa-minus"></i>
              </button>
              <span style={{ width: '48px', textAlign: 'center', fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.3, +(z + 0.1).toFixed(1)))}
                style={{ width: '32px', height: '32px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}>
                <i className="fas fa-plus"></i>
              </button>
            </div>

            {/* 이전/다음 화살표 (좌우 고정) */}
            {currentIndex > 0 && (
              <button onClick={() => goToPage(pages[currentIndex - 1].page_number, 'flip-prev')}
                className="page-nav-arrow page-nav-arrow-left"
                aria-label="이전 지면">
                <i className="fas fa-chevron-left"></i>
              </button>
            )}
            {currentIndex < pages.length - 1 && (
              <button onClick={() => goToPage(pages[currentIndex + 1].page_number, 'flip-next')}
                className="page-nav-arrow page-nav-arrow-right"
                aria-label="다음 지면">
                <i className="fas fa-chevron-right"></i>
              </button>
            )}

            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.25s ease' }}>
              <PageSheet page={currentPage} onOpenArticle={aid => aid && navigate(`/article/${aid}`)} flipDir={flipDir} />
            </div>

            {/* 하단 점 네비게이터 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              {pages.map(p => (
                <button
                  key={p.page_number}
                  onClick={() => goToPage(p.page_number)}
                  aria-label={`${p.page_number}면으로 이동`}
                  style={{
                    width: activePage === p.page_number ? '22px' : '8px', height: '8px', borderRadius: '4px',
                    border: 'none', cursor: 'pointer',
                    background: activePage === p.page_number ? '#003580' : '#cbd5e1',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', marginTop: '10px' }}>
              ← → 방향키로도 지면을 넘길 수 있습니다 · 기사 위에 마우스를 올려 미리보기 후 클릭하면 전체 기사를 볼 수 있습니다
            </p>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
