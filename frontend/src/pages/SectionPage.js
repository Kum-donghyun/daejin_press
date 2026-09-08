import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';

const API     = `http://${window.location.hostname}:5000/api`;
const BACKEND = `http://${window.location.hostname}:5000`;

/* ── 섹션 메타 ────────────────────────────────────────────────────────────── */
const SECTION_META = {
  '전체':    { label: '전체 기사',  desc: '모든 섹션의 승인된 기사',       color: '#003580', icon: 'fas fa-th-large' },
  '대학뉴스': { label: '대학뉴스',  desc: '교내외 주요 소식과 대학 정책',   color: '#1565c0', icon: 'fas fa-university' },
  '학술·문화':{ label: '학술·문화', desc: '학술 연구와 문화·예술 이야기',   color: '#c62828', icon: 'fas fa-palette' },
  '오피니언': { label: '오피니언',  desc: '칼럼·조명탑·기자한마디',        color: '#e65100', icon: 'fas fa-comment-alt' },
  '기획특집': { label: '기획특집',  desc: '심층 기획 및 특집 보도',        color: '#00695c', icon: 'fas fa-layer-group' },
  '학생자치': { label: '학생자치',  desc: '총학생회·동아리·학생 활동',     color: '#283593', icon: 'fas fa-users' },
  '지역사회': { label: '지역사회',  desc: '포천 지역 및 사회 이슈',        color: '#2e7d32', icon: 'fas fa-map-marker-alt' },
};

const NAV_ITEMS = ['전체', '대학뉴스', '학술·문화', '오피니언', '기획특집', '학생자치', '지역사회'];

const CAT_MAP = [
  { key: '문화면',      label: '문화',       color: '#c62828' },
  { key: '칼럼',        label: '교수칼럼',   color: '#6a1b9a' },
  { key: '기자한마디',  label: '기자한마디', color: '#283593' },
  { key: '조명탑',      label: '오피니언',   color: '#e65100' },
  { key: '기획',        label: '기획',       color: '#00695c' },
  { key: '지역사회',    label: '지역사회',   color: '#2e7d32' },
  { key: '1면',         label: '대학뉴스',   color: '#1565c0' },
  { key: '2면',         label: '학술',       color: '#1b5e20' },
];

function getCategoryTag(sectionKey) {
  if (!sectionKey) return { label: '대학뉴스', color: '#003580' };
  for (const c of CAT_MAP) {
    if (sectionKey.includes(c.key)) return c;
  }
  return { label: '대학뉴스', color: '#003580' };
}

function stripHtml(html) {
  if (!html) return '';
  const d = document.createElement('DIV');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── 카드 컴포넌트들 ──────────────────────────────────────────────────────── */

/* 히어로 카드 (최신 1건, 사진 있을 때) */
function HeroCard({ article, onClick }) {
  const cat   = getCategoryTag(article.section_key);
  const title = stripHtml(article.title);
  const sub   = stripHtml(article.subtitle);
  const body  = stripHtml(article.body);

  return (
    <div onClick={onClick}
      style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: article.photo1_url ? '1fr 1fr' : '1fr', gap: '32px', background: '#fff', padding: '32px', borderBottom: '2px solid #111', marginBottom: '0' }}
      className="group"
    >
      {article.photo1_url && (
        <div style={{ overflow: 'hidden', maxHeight: '380px' }}>
          <img src={BACKEND + article.photo1_url} alt={title}
            style={{ width: '100%', height: '380px', objectFit: 'cover', transition: 'transform 0.5s' }}
            className="group-hover:scale-105" />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ background: cat.color, color: '#fff', fontSize: '10px', fontWeight: 900, padding: '4px 10px', letterSpacing: '1px', textTransform: 'uppercase' }}>{cat.label}</span>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{article.newspaper_title} · {formatDate(article.approved_at)}</span>
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#111', lineHeight: 1.3, letterSpacing: '-0.5px', marginBottom: '14px' }}
          className="group-hover:text-[#003580] transition">
          {title}
        </h2>
        {sub && <p style={{ fontSize: '16px', color: '#4b5563', lineHeight: 1.6, marginBottom: '14px', borderLeft: '3px solid #d32f2f', paddingLeft: '12px' }}>{sub}</p>}
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.75, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {body}
        </p>
        {article.reporter_name && (
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '20px' }}>
            <i className="fas fa-pencil-alt" style={{ marginRight: '5px' }}></i>{article.reporter_name} 기자
          </p>
        )}
      </div>
    </div>
  );
}

/* 가로형 리스트 카드 */
function ListCard({ article, onClick, isLast }) {
  const cat   = getCategoryTag(article.section_key);
  const title = stripHtml(article.title);
  const body  = stripHtml(article.body);

  return (
    <div onClick={onClick}
      style={{ display: 'flex', gap: '18px', padding: '20px 0', borderBottom: isLast ? 'none' : '1px solid #e5e7eb', cursor: 'pointer', alignItems: 'flex-start' }}
      className="group"
    >
      {article.photo1_url && (
        <div style={{ width: '130px', height: '88px', flexShrink: 0, overflow: 'hidden' }}>
          <img src={BACKEND + article.photo1_url} alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
            className="group-hover:scale-105" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ background: cat.color, color: '#fff', fontSize: '9px', fontWeight: 900, padding: '2px 8px', letterSpacing: '0.8px', textTransform: 'uppercase', flexShrink: 0 }}>{cat.label}</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{article.newspaper_title}</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDate(article.approved_at)}</span>
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111', lineHeight: 1.35, marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          className="group-hover:text-[#003580] transition">
          {title}
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {body}
        </p>
        {article.reporter_name && (
          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
            <i className="fas fa-pencil-alt" style={{ marginRight: '4px' }}></i>{article.reporter_name} 기자
          </p>
        )}
      </div>
    </div>
  );
}

/* 그리드 카드 (3열) */
function GridCard({ article, onClick }) {
  const cat   = getCategoryTag(article.section_key);
  const title = stripHtml(article.title);
  const body  = stripHtml(article.body);

  return (
    <div onClick={onClick}
      style={{ cursor: 'pointer', background: '#fff', borderBottom: '3px solid transparent', transition: 'border-color 0.2s' }}
      className="group hover:border-b-[#003580]"
      onMouseEnter={e => e.currentTarget.style.borderBottomColor = '#003580'}
      onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
    >
      {article.photo1_url ? (
        <div style={{ height: '160px', overflow: 'hidden', marginBottom: '14px' }}>
          <img src={BACKEND + article.photo1_url} alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
            className="group-hover:scale-105" />
        </div>
      ) : (
        <div style={{ height: '100px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          <i className="fas fa-newspaper" style={{ fontSize: '28px', color: '#d1d5db' }}></i>
        </div>
      )}
      <span style={{ background: cat.color, color: '#fff', fontSize: '9px', fontWeight: 900, padding: '2px 8px', letterSpacing: '0.8px', display: 'inline-block', marginBottom: '8px' }}>{cat.label}</span>
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111', lineHeight: 1.4, marginBottom: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        className="group-hover:text-[#003580] transition">
        {title}
      </h3>
      <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.65, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '10px' }}>
        {body}
      </p>
      <p style={{ fontSize: '11px', color: '#9ca3af' }}>
        {formatDate(article.approved_at)}
        {article.reporter_name && <span> · {article.reporter_name} 기자</span>}
      </p>
    </div>
  );
}

/* ── 메인 페이지 컴포넌트 ────────────────────────────────────────────────── */
function SectionPage() {
  const { section = '전체' } = useParams();
  const decodedSection = decodeURIComponent(section);
  const navigate = useNavigate();

  const [articles, setArticles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);

  const LIMIT = 21;
  const meta  = SECTION_META[decodedSection] || SECTION_META['전체'];

  const fetchArticles = useCallback(async (p = 1) => {
    setLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await axios.get(`${API}/newspapers/section/articles`, {
        params: { section: decodedSection, page: p, limit: LIMIT },
      });
      setArticles(res.data.articles || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [decodedSection]);

  useEffect(() => {
    fetchArticles(1);
  }, [fetchArticles]);

  const hero    = articles[0] || null;
  const rest    = articles.slice(1);          // 나머지
  const listCol = rest.slice(0, 8);           // 좌측 리스트 (8건)
  const gridCol = rest.slice(8);              // 우측 3열 그리드

  return (
    <>
      {/* ── 섹션 헤더 ── */}
      <div style={{ background: meta.color, color: '#fff', padding: '28px 0 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <i className={meta.icon} style={{ fontSize: '20px', opacity: 0.85 }}></i>
            <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>{meta.label}</h1>
          </div>
          <p style={{ fontSize: '14px', opacity: 0.75, margin: 0 }}>{meta.desc}</p>
        </div>
      </div>

      {/* ── 섹션 탭 네비 ── */}
      <div style={{ background: '#fff', borderBottom: '2px solid #e5e7eb', position: 'sticky', top: '56px', zIndex: 40 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '0', overflowX: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <button key={item}
              onClick={() => navigate(item === '전체' ? '/section/%EC%A0%84%EC%B2%B4' : `/section/${encodeURIComponent(item)}`)}
              style={{
                padding: '12px 18px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: decodedSection === item ? meta.color : '#6b7280',
                borderBottom: decodedSection === item ? `3px solid ${meta.color}` : '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (decodedSection !== item) e.currentTarget.style.color = '#111'; }}
              onMouseLeave={e => { if (decodedSection !== item) e.currentTarget.style.color = '#6b7280'; }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* ── 본문 ── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
            기사를 불러오는 중입니다...
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <i className="fas fa-newspaper" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', color: '#d1d5db' }}></i>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#6b7280' }}>아직 게재된 기사가 없습니다</p>
          </div>
        ) : (
          <>
            {/* 결과 수 */}
            <div style={{ padding: '16px 0 0', fontSize: '12px', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', marginBottom: '0' }}>
              총 <strong style={{ color: '#374151' }}>{total}</strong>건의 기사
            </div>

            {/* ① 히어로 카드 */}
            {hero && (
              <div style={{ marginBottom: '0' }}>
                <HeroCard article={hero} onClick={() => navigate(`/article/${hero.id}`)} />
              </div>
            )}

            {/* ② 2단 레이아웃: 리스트(좌) + 그리드(우) */}
            {rest.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '0', marginTop: '0' }}>

                {/* 좌: 가로형 리스트 */}
                <div style={{ padding: '0 32px 0 0', borderRight: '1px solid #e5e7eb' }}>
                  <div style={{ paddingTop: '8px' }}>
                    {listCol.map((art, i) => (
                      <ListCard key={art.id} article={art} onClick={() => navigate(`/article/${art.id}`)}
                        isLast={i === listCol.length - 1 && gridCol.length === 0} />
                    ))}
                  </div>
                </div>

                {/* 우: 3열→1열 그리드 사이드바 */}
                <div style={{ paddingLeft: '28px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', padding: '20px 0 12px', borderBottom: '2px solid #111', marginBottom: '0' }}>
                    더 보기
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {gridCol.map((art, i) => (
                      <div key={art.id} style={{ borderBottom: i === gridCol.length - 1 ? 'none' : '1px solid #e5e7eb', paddingBottom: '14px', paddingTop: '14px' }}>
                        <GridCard article={art} onClick={() => navigate(`/article/${art.id}`)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ③ 페이지네이션 */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <button onClick={() => fetchArticles(page - 1)} disabled={page <= 1}
                  style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? '#d1d5db' : '#374151', fontSize: '13px', fontWeight: 600 }}>
                  <i className="fas fa-chevron-left"></i>
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p;
                  if (totalPages <= 7) p = i + 1;
                  else if (page <= 4) p = i + 1;
                  else if (page >= totalPages - 3) p = totalPages - 6 + i;
                  else p = page - 3 + i;
                  return (
                    <button key={p} onClick={() => fetchArticles(p)}
                      style={{ width: '36px', height: '36px', border: page === p ? 'none' : '1px solid #e5e7eb', borderRadius: '6px', background: page === p ? meta.color : '#fff', color: page === p ? '#fff' : '#374151', fontSize: '13px', fontWeight: page === p ? 900 : 500, cursor: 'pointer' }}>
                      {p}
                    </button>
                  );
                })}

                <button onClick={() => fetchArticles(page + 1)} disabled={page >= totalPages}
                  style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: page >= totalPages ? '#d1d5db' : '#374151', fontSize: '13px', fontWeight: 600 }}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default SectionPage;
