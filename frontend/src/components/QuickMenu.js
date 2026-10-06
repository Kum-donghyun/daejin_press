import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ITEMS = [
  { label: '전체',     icon: 'fas fa-th-large' },
  { label: '대학뉴스', icon: 'fas fa-university' },
  { label: '학술·문화', icon: 'fas fa-palette' },
  { label: '오피니언', icon: 'fas fa-comment-alt' },
  { label: '기획특집', icon: 'fas fa-layer-group' },
  { label: '학생자치', icon: 'fas fa-users' },
  { label: '지역사회', icon: 'fas fa-map-marker-alt' },
];

const SERVICE_ITEMS = [
  { label: '지면 보기', icon: 'fas fa-newspaper',  path: '/issues' },
  { label: '기자 지원', icon: 'fas fa-pen-nib',   path: '/contact/apply' },
  { label: '제보하기',  icon: 'fas fa-bullhorn',  path: '/contact/report' },
  { label: '광고 문의', icon: 'fas fa-briefcase', path: '/contact/advertise' },
  { label: '기사 검색', icon: 'fas fa-search',    path: '/search' },
];

function QuickMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        left: '0',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* 퀵메뉴 토글 버튼 */}
      <button
        className="quick-menu-btn"
        onClick={() => setOpen(p => !p)}
        aria-label="퀵 메뉴 열기"
        style={{
          width: '54px',
          height: '64px',
          background: open ? '#002468' : '#003580',
          border: 'none',
          borderRadius: '0 12px 12px 0',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          boxShadow: '2px 0 12px rgba(0,0,0,0.18)',
          transition: 'background 0.2s, width 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#002468'; }}
        onMouseLeave={e => { e.currentTarget.style.background = open ? '#002468' : '#003580'; }}
      >
        <i className={open ? 'fas fa-times' : 'fas fa-bars'} style={{ fontSize: '15px' }}></i>
        <span style={{
          fontSize: '10px', fontWeight: 800, letterSpacing: '1px',
        }}>QUICK</span>
      </button>

      {/* 팝업 풍선 메뉴 */}
      <div
        className="quick-menu-popup"
        style={{
          position: 'absolute',
          left: '46px',
          top: '50%',
          transform: open ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(-12px)',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.22s ease, transform 0.22s ease, visibility 0.22s',
          background: 'rgba(17, 36, 74, 0.7)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '18px 10px',
          width: '168px',
          maxHeight: '82vh',
          overflowY: 'auto',
          boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* 말풍선 꼬리 */}
        <div style={{
          position: 'absolute', left: '-7px', top: '50%', transform: 'translateY(-50%)',
          width: 0, height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '8px solid rgba(17, 36, 74, 0.7)',
        }}></div>

        <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '0 8px 8px' }}>
          카테고리
        </p>
        {CATEGORY_ITEMS.map(item => (
          <button
            key={item.label}
            onClick={() => go(item.label === '전체' ? '/section/전체' : `/section/${encodeURIComponent(item.label)}`)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              background: 'none', border: 'none', color: '#f1f5f9',
              padding: '9px 8px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <i className={item.icon} style={{ width: '16px', fontSize: '13px', color: '#FFD700' }}></i>
            {item.label}
          </button>
        ))}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.14)', margin: '10px 4px' }}></div>

        <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '0 8px 8px' }}>
          바로가기
        </p>
        {SERVICE_ITEMS.map(item => (
          <button
            key={item.label}
            onClick={() => go(item.path)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              background: 'none', border: 'none', color: '#f1f5f9',
              padding: '9px 8px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <i className={item.icon} style={{ width: '16px', fontSize: '13px', color: '#FFD700' }}></i>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickMenu;
