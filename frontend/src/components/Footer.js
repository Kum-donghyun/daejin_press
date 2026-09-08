import React from 'react';
import { useNavigate } from 'react-router-dom';

function Footer() {
  const navigate = useNavigate();
  return (
    <footer style={{ background: '#111827', color: '#9ca3af', marginTop: '56px' }}>

      {/* ── 상단 컨텐츠 ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }} className="footer-grid">

          {/* 신문사 정보 */}
          <div style={{ gridColumn: 'span 2' }} className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '4px', height: '24px', background: '#d32f2f' }}></div>
              <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>대진대학교 신문사</h2>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.8, marginBottom: '4px' }}>경기도 포천시 호국로 1007 대진대학교 학생회관 3층</p>
            <p style={{ fontSize: '13px', lineHeight: 1.8, marginBottom: '4px' }}>대표전화 031-539-1087</p>
            <p style={{ fontSize: '13px', lineHeight: 1.8, marginBottom: '20px' }}>이메일 20220875@daejin.ac.kr</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { icon: 'fab fa-instagram', label: 'Instagram', href: 'https://www.instagram.com/daejin_university/' },
                { icon: 'fab fa-youtube',   label: 'YouTube',   href: 'https://www.youtube.com/@Daejinuniv/featured' },
                { icon: 'fab fa-facebook-f', label: 'Facebook', href: '#' },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href !== '#' ? '_blank' : undefined}
                  rel={s.href !== '#' ? 'noopener noreferrer' : undefined}
                  style={{
                    width: '36px', height: '36px',
                    border: '1px solid #374151',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6b7280', fontSize: '14px',
                    transition: 'all 0.15s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#6b7280'; }}
                  aria-label={s.label}
                >
                  <i className={s.icon}></i>
                </a>
              ))}
            </div>
          </div>

          {/* 섹션 링크 */}
          <div>
            <h3 style={{ color: '#fff', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>섹션</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['대학뉴스', '학술·문화', '오피니언', '기획특집', '학생자치', '지역사회'].map(item => (
                <li key={item}>
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); navigate(`/section/${encodeURIComponent(item)}`); }}
                    style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                  >{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* 신문사 링크 */}
          <div>
            <h3 style={{ color: '#fff', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>신문사</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: '신문사 소개', href: 'https://daejin.ac.kr/daejin/1014/subview.do', external: true },
                { label: '기자 지원', path: '/contact/apply' },
                { label: '제보하기', path: '/contact/report' },
                { label: '광고 문의', path: '/contact/advertise' },
                { label: '독자 투고', href: '#' },
              ].map(item => (
                <li key={item.label}>
                  <a
                    href={item.href || '#'}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={item.path ? e => { e.preventDefault(); navigate(item.path); } : undefined}
                    style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                  >{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── 하단 법적 고지 ── */}
      <div style={{ borderTop: '1px solid #1f2937' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '12px', color: '#4b5563' }}>
            © 2026 DJU Press. All rights reserved. 대진대학교 신문사
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['개인정보처리방침', '이용약관', '저작권정책'].map(item => (
              <a
                key={item}
                href="#"
                style={{ fontSize: '12px', color: '#4b5563', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#9ca3af'}
                onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
              >{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
