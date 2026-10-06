import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';

const API     = '/api';
const BACKEND = '';

const CATEGORY_COLORS = {
  '대학뉴스':  '#1565c0',
  '학술·문화': '#c62828',
  '오피니언':  '#e65100',
  '기획특집':  '#00695c',
  '학생자치':  '#283593',
  '지역사회':  '#2e7d32',
};
function categoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#6b7280';
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function SectionBanner({ sec, onClick }) {
  const disabled = !sec.has_article;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px 18px',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = categoryColor(sec.category); e.currentTarget.style.boxShadow = `0 4px 14px ${categoryColor(sec.category)}22`; } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; } }}
    >
      {/* 썸네일 */}
      <div style={{ width: '88px', height: '66px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {sec.photo1_url ? (
          <img src={BACKEND + sec.photo1_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <i className="far fa-image" style={{ color: '#d1d5db', fontSize: '20px' }}></i>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 900, color: '#fff',
            background: categoryColor(sec.category), padding: '2px 8px', borderRadius: '4px',
            letterSpacing: '0.5px', textTransform: 'uppercase', flexShrink: 0,
          }}>{sec.category || '미분류'}</span>
          <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>{sec.section_name}</span>
        </div>
        {disabled ? (
          <p style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>아직 게재된 기사가 없습니다</p>
        ) : (
          <>
            <h3 style={{
              fontSize: '15px', fontWeight: 800, color: '#111827', margin: '0 0 2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{sec.title || '(제목 없음)'}</h3>
            {sec.subtitle && (
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.subtitle}</p>
            )}
            {sec.reporter_name && (
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>{sec.reporter_name} 기자</p>
            )}
          </>
        )}
      </div>

      {!disabled && (
        <i className="fas fa-chevron-right" style={{ color: '#d1d5db', fontSize: '13px', flexShrink: 0 }}></i>
      )}
    </button>
  );
}

function IssueViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [newspaper, setNewspaper] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchIssue = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    axios.get(`${API}/newspapers/public/${id}`)
      .then(res => {
        setNewspaper(res.data.newspaper);
        setPages(res.data.pages || []);
        const restoredPage = location.state?.pageNumber;
        const availablePages = (res.data.pages || []).map(p => p.page_number);
        if (restoredPage && availablePages.includes(restoredPage)) {
          setActivePage(restoredPage);
        } else {
          setActivePage(availablePages[0] ?? null);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0 });
  }, [id]);

  useEffect(() => { fetchIssue(); }, [fetchIssue]);

  if (loading) {
    return (
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 24px', textAlign: 'center', color: '#9ca3af' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
        지면 정보를 불러오는 중입니다...
      </main>
    );
  }

  if (notFound || !newspaper) {
    return (
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 24px', textAlign: 'center', color: '#9ca3af' }}>
        <i className="fas fa-newspaper" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', color: '#d1d5db' }}></i>
        <p style={{ fontSize: '18px', fontWeight: 700, color: '#6b7280', marginBottom: '20px' }}>발행된 신문을 찾을 수 없습니다</p>
        <button onClick={() => navigate('/issues')} style={{ padding: '10px 20px', background: '#003580', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
          지면 보기 목록으로
        </button>
      </main>
    );
  }

  const currentPage = pages.find(p => p.page_number === activePage);

  return (
    <>
      {/* ── 헤더 ── */}
      <div style={{ background: '#003580', color: '#fff', padding: '28px 0 22px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <button
            onClick={() => navigate('/issues')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: '13px', marginBottom: '10px', padding: 0 }}
          >
            <i className="fas fa-arrow-left" style={{ marginRight: '6px' }}></i>지면 보기 목록
          </button>
          <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px' }}>제{newspaper.issue_number}호 지면 보기</h1>
          <p style={{ fontSize: '13px', opacity: 0.8, margin: 0 }}>{newspaper.title} · 발행일 {formatDate(newspaper.publish_date)}</p>
        </div>
      </div>

      {/* ── 면 탭 ── */}
      <div style={{ background: '#fff', borderBottom: '2px solid #e5e7eb', position: 'sticky', top: '56px', zIndex: 40 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '0', overflowX: 'auto' }}>
          {pages.map(p => (
            <button key={p.page_number}
              onClick={() => setActivePage(p.page_number)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: activePage === p.page_number ? '#003580' : '#6b7280',
                borderBottom: activePage === p.page_number ? '3px solid #003580' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {p.page_number}면
            </button>
          ))}
        </div>
      </div>

      {/* ── 본문: 선택한 면의 지면 배너 목록 ── */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>
        {currentPage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentPage.sections.map(sec => (
              <SectionBanner key={sec.section_id} sec={sec} onClick={() => navigate(`/article/${sec.article_id}`, { state: { from: 'issue', issueId: id, pageNumber: activePage } })} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <p>표시할 지면이 없습니다.</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default IssueViewPage;
