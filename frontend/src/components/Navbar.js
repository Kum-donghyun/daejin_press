import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';

const NAV_ITEMS = ['전체', '대학뉴스', '학술·문화', '오피니언', '기획특집', '학생자치', '지역사회'];

function Navbar() {
  const { isLoggedIn } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const handleSearchSubmit = e => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    setSearchOpen(false);
    setSearchInput('');
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* ── 상단 유틸리티 바 ── */}
      <div style={{ background: '#003580', color: '#fff', padding: '6px 0' }}>
        <div className="max-w-screen-xl mx-auto px-6 flex justify-between items-center text-xs">
          <span style={{ color: 'rgba(191,219,254,0.9)', letterSpacing: '0.3px' }} className="hidden sm:block">
            {today}
          </span>
          <div className="flex items-center ml-auto" style={{ gap: '18px' }}>
            <a href="https://www.instagram.com/daejin_university/" style={{ color: 'rgba(191,219,254,0.85)', transition: 'color 0.15s', fontSize: '13px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(191,219,254,0.85)'}
            ><i className="fab fa-instagram"></i></a>
            <a href="https://www.youtube.com/@Daejinuniv/featured" style={{ color: 'rgba(191,219,254,0.85)', transition: 'color 0.15s', fontSize: '13px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(191,219,254,0.85)'}
            ><i className="fab fa-youtube"></i></a>
            <span className="util-bar-optional" style={{ color: 'rgba(59,130,246,0.5)' }}>|</span>
            <a href="#" className="util-bar-optional" style={{ color: 'rgba(191,219,254,0.85)', transition: 'color 0.15s', letterSpacing: '0.5px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(191,219,254,0.85)'}
            >독자 투고</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/contact/report'); }} style={{ color: 'rgba(191,219,254,0.85)', transition: 'color 0.15s', letterSpacing: '0.5px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(191,219,254,0.85)'}
            >제보하기</a>
          </div>
        </div>
      </div>

      {/* ── 마스트헤드 ── */}
      <header
        style={{
          background: '#fff',
          cursor: 'pointer',
          paddingTop: '18px',
          paddingBottom: '14px',
          borderBottom: '3px double #003580',
        }}
        onClick={() => navigate('/')}
      >
        <div className="max-w-screen-xl mx-auto px-6">
          <div style={{ borderTop: '2px solid #003580', paddingTop: '10px' }}>
            <div className="flex items-center justify-between">
              <div className="hidden sm:block text-gray-400 text-xs tracking-widest" style={{ width: '110px' }}>
                Since 1992
              </div>
              <h1 className="masthead-title text-center flex-1" style={{ color: '#003580' }}>
                대진대학교 신문사
              </h1>
              <div className="hidden sm:block text-gray-400 text-xs tracking-widest text-right" style={{ width: '110px' }}>
                DJU Press
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #003580', marginTop: '10px' }}></div>
        </div>
      </header>

      {/* ── 메인 네비게이션 ── */}
      <nav
        className="sticky top-0 z-50 shadow-md"
        style={{ background: '#003580', borderBottom: '4px solid #d32f2f' }}
      >
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex items-center justify-between">

            {/* 스티키 로고 축약형 */}
            <span
              className="hidden lg:flex items-center text-white font-black text-sm tracking-tight cursor-pointer flex-shrink-0"
              style={{
                marginRight: '14px',
                paddingRight: '14px',
                borderRight: '1px solid rgba(255,255,255,0.18)',
                paddingTop: '16px',
                paddingBottom: '16px',
              }}
              onClick={() => navigate('/')}
            >
              DJU<span style={{ color: '#FFD700', margin: '0 3px' }}>·</span>신문
            </span>

            {/* 섯션 메뉴 */}
            <ul className="flex items-center flex-1 overflow-x-auto scroll-hide" style={{ listStyle: 'none' }}>
              {NAV_ITEMS.map(item => (
                <li key={item}>
                  <a
                    href="#"
                    className="dju-nav-item"
                    onClick={e => { e.preventDefault(); navigate(item === '전체' ? '/section/전체' : `/section/${encodeURIComponent(item)}`); }}
                  >{item}</a>
                </li>
              ))}
            </ul>

            {/* 우측 액션 */}
            <div className="flex items-center ml-3" style={{ gap: '4px' }}>
              <button
                onClick={() => { setSearchOpen(p => !p); setTimeout(() => searchRef.current?.focus(), 50); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', fontSize: '14px', color: searchOpen ? '#fff' : 'rgba(255,255,255,0.7)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = searchOpen ? '#fff' : 'rgba(255,255,255,0.7)'}
              >
                <i className={searchOpen ? 'fas fa-times' : 'fas fa-search'}></i>
              </button>
              {isLoggedIn ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  style={{
                    background: '#d32f2f',
                    border: 'none',
                    color: '#fff',
                    padding: '7px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '2px',
                    letterSpacing: '0.3px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#b71c1c'}
                  onMouseLeave={e => e.currentTarget.style.background = '#d32f2f'}
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 스라이드 다운 검색바 */}
      <div style={{
        overflow: 'hidden',
        maxHeight: searchOpen ? '64px' : '0',
        transition: 'max-height 0.25s ease',
        background: '#f1f5f9',
        borderBottom: searchOpen ? '1px solid #e2e8f0' : 'none',
      }}>
        <form onSubmit={handleSearchSubmit}
          style={{ maxWidth: '860px', margin: '0 auto', padding: '10px 24px', display: 'flex', gap: '0' }}>
          <input
            ref={searchRef}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="기사 제목, 본문, 기자 이름으로 검색"
            style={{
              flex: 1, padding: '9px 14px',
              border: '1.5px solid #cbd5e1', borderRight: 'none',
              borderRadius: '6px 0 0 6px', fontSize: '14px',
              outline: 'none', color: '#111827', background: '#fff',
            }}
            onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
          />
          <button type="submit"
            style={{ padding: '9px 18px', background: '#003580', color: '#fff', border: 'none', borderRadius: '0 6px 6px 0', fontSize: '14px', cursor: 'pointer', fontWeight: 700 }}>
            <i className="fas fa-search"></i>
          </button>
        </form>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}

export default Navbar;
