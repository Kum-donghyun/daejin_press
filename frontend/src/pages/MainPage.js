import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import axios from 'axios';

const API     = `http://${window.location.hostname}:5000/api`;
const BACKEND = `http://${window.location.hostname}:5000`;

/* ── 카테고리 매핑 ──────────────────────────────────────────────────────── */
const CAT_MAP = [
  { key: '문화면',      label: '문화',       color: '#c62828' },
  { key: '칼럼',        label: '특집',   color: '#6a1b9a' },
  { key: '기자한마디',  label: '기자한마디', color: '#283593' },
  { key: '조명탑',      label: '오피니언',   color: '#e65100' },
  { key: '기획',        label: '기획',       color: '#00695c' },
  { key: '지역사회',    label: '지역사회',   color: '#2e7d32' },
  { key: '1면',         label: '학생자치',   color: '#1565c0' },
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

/* ── 섹션 구분선 ─────────────────────────────────────────────────────────── */
function SectionDivider({ title, action }) {
  return (
    <div className="section-divider">
      <div className="section-divider-bar"></div>
      <span className="section-divider-title">{title}</span>
      <div className="section-divider-rule"></div>
      {action && <button className="section-divider-action">{action} →</button>}
    </div>
  );
}

/* ── 상수 데이터 ─────────────────────────────────────────────────────────── */


/* ── 히어로(특집) 기사 ───────────────────────────────────────────────────── */
function FeaturedArticle({ article, onClick }) {
  const cat   = getCategoryTag(article.section_key);
  const title = stripHtml(article.title);
  const sub   = stripHtml(article.subtitle);
  return (
    <div className="article-card group" onClick={onClick} style={{ position: 'relative', overflow: 'hidden', height: '420px', cursor: 'pointer' }}>
      {article.photo1_url ? (
        <img
          src={BACKEND + article.photo1_url}
          alt={title}
          className="group-hover:scale-105 transition duration-700"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-newspaper" style={{ fontSize: '56px', color: '#9ca3af' }}></i>
        </div>
      )}
      {/* 그라데이션 오버레이 */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.28) 55%, transparent 100%)' }}></div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 30px', color: '#fff' }}>
        <span style={{ display: 'inline-block', background: cat.color, color: '#fff', fontSize: '10px', fontWeight: 900, padding: '3px 10px', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '10px' }}>
          {cat.label}
        </span>
        <h2 className="article-title" style={{ fontSize: 'clamp(17px, 2.5vw, 27px)', fontWeight: 900, lineHeight: 1.35, marginBottom: '8px', color: '#fff' }}>
          {title || '(제목 없음)'}
        </h2>
        {sub && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '12px' }}>
            {sub}
          </p>
        )}
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.48)' }}>
          <span><i className="fas fa-user" style={{ marginRight: '5px' }}></i>{article.reporter_name || '기자'}</span>
          <span><i className="fas fa-tag" style={{ marginRight: '5px' }}></i>{article.section_name}</span>
          {!!article.view_count && (
            <span><i className="far fa-eye" style={{ marginRight: '4px' }}></i>{article.view_count.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 사이드 기사 카드 ────────────────────────────────────────────────────── */
function SideArticle({ article, isLast, onClick }) {
  const cat   = getCategoryTag(article.section_key);
  const title = stripHtml(article.title);
  return (
    <div className="side-article article-card group" onClick={onClick} style={{ borderBottom: isLast ? 'none' : '1px solid #e5e7eb', flex: 1, cursor: 'pointer' }}>
      {article.photo1_url ? (
        <div style={{ width: '82px', height: '66px', flexShrink: 0, overflow: 'hidden' }}>
          <img src={BACKEND + article.photo1_url} alt={title}
            className="group-hover:scale-105 transition duration-500"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{ width: '82px', height: '66px', flexShrink: 0, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-file-alt" style={{ color: '#d1d5db', fontSize: '18px' }}></i>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {cat && <span style={{ fontSize: '9px', fontWeight: 900, color: cat.color, letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{cat.label}</span>}
        <h3 className="article-title" style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.5, color: '#111', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '5px' }}>
          {title || '(제목 없음)'}
        </h3>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{article.reporter_name || '기자'}</span>
      </div>
    </div>
  );
}

/* ── 4열 그리드 기사 카드 ────────────────────────────────────────────────── */
function GridArticle({ article, onClick }) {
  const cat   = getCategoryTag(article.section_key);
  const title = stripHtml(article.title);
  const body  = stripHtml(article.body);
  return (
    <div className="grid-cell article-card group" onClick={onClick} style={{ cursor: 'pointer' }}>
      {article.photo1_url && (
        <div style={{ height: '120px', overflow: 'hidden', marginBottom: '12px' }}>
          <img src={BACKEND + article.photo1_url} alt={title}
            className="group-hover:scale-105 transition duration-500"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      {cat && <span style={{ fontSize: '9px', fontWeight: 900, color: cat.color, letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{cat.label}</span>}
      <h3 className="article-title" style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.5, color: '#111', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '8px' }}>
        {title || '(제목 없음)'}
      </h3>
      {!article.photo1_url && body && (
        <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.65, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '10px' }}>{body}</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: '8px', marginTop: 'auto' }}>
        <span>{article.reporter_name || '기자'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!!article.view_count && (
            <span><i className="far fa-eye" style={{ marginRight: '2px' }}></i>{article.view_count.toLocaleString()}</span>
          )}
          <span style={{ color: '#e5e7eb' }}>{article.section_name}</span>
        </span>
      </div>
    </div>
  );
}

/* ── 오피니언 / 칼럼 카드 ────────────────────────────────────────────────── */
function OpinionArticle({ article, onClick }) {
  const title = stripHtml(article.title);
  const body  = stripHtml(article.body);
  return (
    <div className="grid-cell article-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ width: '32px', height: '3px', background: '#d32f2f', marginBottom: '16px' }}></div>
      <div style={{ fontSize: '9px', fontWeight: 900, color: '#6a1b9a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>{article.section_name}</div>
      <h3 className="article-title" style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1.5, color: '#111', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '10px' }}>
        {title || '(제목 없음)'}
      </h3>
      {body && (
        <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.75, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', flex: 1 }}>{body}</p>
      )}
      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', fontSize: '12px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{article.reporter_name || '기자'}</span>
        {!!article.view_count && (
          <span style={{ fontSize: '11px' }}><i className="far fa-eye" style={{ marginRight: '3px' }}></i>{article.view_count.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ───────────────────────────────────────────────────────── */
function MainPage() {
  const [activeTab, setActiveTab] = useState('전체뉴스보기');
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [approvedData, setApprovedData] = useState({ articles: [], tabs: [], tabPageMap: [], newspaper: null });
  const [quickNews, setQuickNews] = useState([]);
  const [videos, setVideos]       = useState([]);
  const [tickerItems, setTickerItems] = useState([]);
  const [hotIssues, setHotIssues] = useState([]);

  useEffect(() => {
    axios.get(`${API}/newspapers/approved/articles`)
      .then(res => {
        setApprovedData(res.data);
        if (res.data.tabs?.length > 0) setActiveTab('전체뉴스보기');
      })
      .catch(() => {});
    axios.get(`${API}/online-articles/public?limit=8`)
      .then(res => setQuickNews(res.data.articles || []))
      .catch(() => {});
    axios.get(`${API}/video-news/public`)
      .then(res => setVideos(res.data.videos || []))
      .catch(() => {});
    axios.get(`${API}/ticker/public`)
      .then(res => setTickerItems(res.data.items?.map(i => i.content) || []))
      .catch(() => {});
    axios.get(`${API}/articles/hot-issues?limit=8`)
      .then(res => setHotIssues(res.data.articles || []))
      .catch(() => {});
  }, []);

  const tabs = approvedData.tabs?.length > 0 ? approvedData.tabs : [];

  const filteredArticles = (() => {
    if (!approvedData.articles?.length) return [];
    const idx = tabs.indexOf(activeTab);
    if (idx <= 0) return approvedData.articles;
    return approvedData.articles.filter(a => a.page_number === approvedData.tabPageMap[idx]);
  })();

  const featured        = filteredArticles[0]  || null;
  const sideArticles    = filteredArticles.slice(1, 4);
  const gridArticles    = filteredArticles.slice(4, 12);
  const opinionArticles = filteredArticles
    .filter(a => a.section_key?.includes('칼럼') || a.section_key?.includes('조명탑'))
    .slice(0, 3);

  return (
    <>
      {/* ════════════════════════════════════
          속보 티커
      ════════════════════════════════════ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div className="max-w-screen-xl mx-auto flex items-stretch">
          <div style={{ background: '#d32f2f', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, letterSpacing: '1.2px' }}>
            <i className="fas fa-bolt"></i> 24h DJU
          </div>
          <div style={{ overflow: 'hidden', flex: 1, padding: '8px 16px' }}>
            <div className="ticker-track">
              {tickerItems.length === 0
                ? <span style={{ fontSize: '13px', color: '#9ca3af' }}>속보 내용을 불러오는 중...</span>
                : [...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} style={{ marginRight: '60px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <span style={{ color: '#d32f2f', marginRight: '8px', fontWeight: 700 }}>◆</span>{item}
                  </span>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          본문 컨텐츠
      ════════════════════════════════════ */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        {/* ── 로그인 환영 배너 ── */}
        {isLoggedIn && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 16px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '30px', height: '30px', background: '#003580', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
              {user.name?.charAt(0)}
            </div>
            <div style={{ fontSize: '13px' }}>
              <span style={{ fontWeight: 700, color: '#003580' }}>{user.nickname || user.name}</span>
              <span style={{ color: '#4b5563' }}>님, 환영합니다. </span>
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                {user.role === 'admin' ? '편집장 권한' : user.role === 'reporter' ? '기자 권한' : '독자'}으로 로그인 중
              </span>
            </div>
          </div>
        )}

        {/* ── 호(號) 탭 ── */}
        {tabs.length > 0 && (
          <div className="scroll-hide" style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginTop: '20px', overflowX: 'auto' }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px 10px 0',
                  fontSize: '13px', fontWeight: 700,
                  background: 'none', border: 'none',
                  borderBottom: activeTab === tab ? '3px solid #003580' : '3px solid transparent',
                  color: activeTab === tab ? '#003580' : '#9ca3af',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  marginBottom: '-2px', transition: 'all 0.2s',
                }}
              >
                {tab.length > 14 ? tab.substring(0, 14) + '…' : tab}
              </button>
            ))}
          </div>
        )}

        {filteredArticles.length > 0 ? (
          <>
            {/* ════════════════════════════════════
                히어로 에디토리얼 그리드
            ════════════════════════════════════ */}
            <div className="editorial-hero">
              {/* 좌: 특집 기사 */}
              {featured && <FeaturedArticle article={featured} onClick={() => navigate(`/article/${featured.id}`)} />}

              {/* 우: 사이드 기사 스택 */}
              <div className="side-stack">
                {sideArticles.map((art, i) => (
                  <SideArticle key={art.id} article={art} isLast={i === sideArticles.length - 1} onClick={() => navigate(`/article/${art.id}`)} />
                ))}
                {sideArticles.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                    <i className="fas fa-newspaper" style={{ fontSize: '28px' }}></i>
                  </div>
                )}
              </div>
            </div>

            {/* ════════════════════════════════════
                전체 기사 4열 그리드
            ════════════════════════════════════ */}
            {gridArticles.length > 0 && (
              <>
                <SectionDivider title="전체 기사" action="더보기" />
                <div className="editorial-news-grid">
                  {gridArticles.map(art => <GridArticle key={art.id} article={art} onClick={() => navigate(`/article/${art.id}`)} />)}
                </div>
              </>
            )}

            {/* ════════════════════════════════════
                오피니언 · 칼럼 섹션
            ════════════════════════════════════ */}
            {opinionArticles.length > 0 && (
              <>
                <SectionDivider title="오피니언 · 칼럼" action="전체보기" />
                <div className="editorial-opinion-grid">
                  {opinionArticles.map(art => <OpinionArticle key={art.id} article={art} onClick={() => navigate(`/article/${art.id}`)} />)}
                </div>
              </>
            )}
          </>
        ) : (
          /* ── 빈 상태 ── */
          <div style={{ textAlign: 'center', padding: '80px 0 60px', color: '#d1d5db' }}>
            <i className="fas fa-newspaper" style={{ fontSize: '56px', display: 'block', marginBottom: '16px' }}></i>
            <p style={{ fontSize: '18px', fontWeight: 900, color: '#9ca3af' }}>아직 발행된 기사가 없습니다</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>편집장이 신문호를 승인하면 이곳에 기사가 표시됩니다.</p>
          </div>
        )}

        {/* ════════════════════════════════════
            대진대 핫이슈 (최근 7일 인기 기사)
        ════════════════════════════════════ */}
        {hotIssues.length > 0 && (
          <>
            <SectionDivider title="🔥 대진대 핫이슈" action="전체보기" />
            <div className="editorial-news-grid">
              {hotIssues.map(art => {
                const isOnline = art.article_type === 'online';
                const path = isOnline ? `/online-article/${art.id}` : `/article/${art.id}`;
                return (
                  <div key={`${art.article_type}-${art.id}`} className="grid-cell article-card group" onClick={() => navigate(path)} style={{ cursor: 'pointer' }}>
                    {art.photo1_url && (
                      <div style={{ height: '120px', overflow: 'hidden', marginBottom: '12px' }}>
                        <img src={BACKEND + art.photo1_url} alt=""
                          className="group-hover:scale-105 transition duration-500"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    {isOnline && <span style={{ fontSize: '9px', fontWeight: 900, color: '#2563eb', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>ONLINE</span>}
                    <h3 className="article-title" style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.5, color: '#111', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '8px' }}>
                      {art.title}
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: '8px', marginTop: 'auto' }}>
                      <span>{art.reporter_name || '기자'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!!art.view_count && <span><i className="far fa-eye" style={{ marginRight: '2px' }}></i>{Number(art.view_count).toLocaleString()}</span>}
                        {!!art.comment_count && <span><i className="far fa-comment" style={{ marginRight: '2px' }}></i>{art.comment_count}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ════════════════════════════════════
            DJU Quick-News 다크 섹션
        ════════════════════════════════════ */}
        <div style={{ background: '#1a2238', marginTop: '48px', padding: '36px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '4px', height: '22px', background: '#FFD700', flexShrink: 0 }}></div>
              <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>DJU Quick-News</h3>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>온라인 단독 · 최신 기사</span>
            </div>
          </div>

          {/* 온라인 기사 */}
          {quickNews.length === 0 ? (
            <div style={{ color: '#4b5563', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>
              <i className="fas fa-globe" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: '#374151' }}></i>
              아직 게재된 온라인 기사가 없습니다.
            </div>
          ) : (
            <div className="editorial-quick-grid">
              {quickNews.map((item, idx) => (
                <div key={item.id}
                  onClick={() => navigate(`/online-article/${item.id}`)}
                  style={{ border: '1px solid #374151', padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#FFD700'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}
                >
                  <div style={{ color: '#FFD700', fontSize: '20px', fontWeight: 900, marginBottom: '12px', fontFamily: 'monospace' }}>{String(idx+1).padStart(2,'0')}</div>
                  <p style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.65, color: '#e5e7eb', marginBottom: '14px' }}>{item.title}</p>
                  <div style={{ fontSize: '11px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className="far fa-user"></i>{item.reporter_name || '기자'}
                    <span style={{ margin: '0 4px' }}>·</span>
                    <i className="far fa-clock"></i>{new Date(item.approved_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 영상 뉴스 */}
          {videos.length > 0 && (
            <div style={{ marginTop: '36px', borderTop: '1px solid #2d3748', paddingTop: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <i className="fab fa-youtube" style={{ color: '#FF0000', fontSize: '18px' }}></i>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>DJU 영상 뉴스</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>대진대 공식 유튜브 채널</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                {videos.map(v => (
                  <a key={v.id} href={v.youtube_url} target="_blank" rel="noopener noreferrer"
                    style={{ flexShrink: 0, width: '220px', textDecoration: 'none', display: 'block', transition: 'transform 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    <div style={{ position: 'relative', width: '220px', height: '124px', overflow: 'hidden', borderRadius: '8px', background: '#374151' }}>
                      {v.thumbnail && <img src={v.thumbnail} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '44px', height: '44px', background: 'rgba(255,0,0,0.85)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-play" style={{ color: '#fff', fontSize: '14px', marginLeft: '3px' }}></i>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#e5e7eb', marginTop: '8px', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.title}</p>
                    <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                      {v.upload_date ? new Date(v.upload_date).toLocaleDateString('ko-KR') : ''}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>
      <Footer />
    </>
  );
}

export default MainPage;
