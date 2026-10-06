import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';

const API = '/api';

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function IssueListPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/newspapers/public/issues`)
      .then(res => setIssues(res.data.issues || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <>
      {/* ── 헤더 ── */}
      <div style={{ background: '#003580', color: '#fff', padding: '32px 0 26px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <i className="fas fa-newspaper" style={{ fontSize: '20px', opacity: 0.85 }}></i>
            <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>지면 보기</h1>
          </div>
          <p style={{ fontSize: '14px', opacity: 0.8, margin: 0 }}>발행된 호수별 신문 지면을 한눈에 확인하세요</p>
        </div>
      </div>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
            호수 목록을 불러오는 중입니다...
          </div>
        ) : issues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <i className="fas fa-newspaper" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', color: '#d1d5db' }}></i>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#6b7280' }}>아직 발행된 신문이 없습니다</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '20px' }}>
            {issues.map(issue => (
              <button
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                style={{
                  textAlign: 'left',
                  background: '#fff',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '24px 22px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#003580'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,53,128,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#003580', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-newspaper" style={{ fontSize: '18px' }}></i>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#111827', margin: 0 }}>제{issue.issue_number}호</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{formatDate(issue.publish_date)}</p>
                <p style={{ fontSize: '12px', color: '#003580', fontWeight: 700, margin: 0 }}>
                  <i className="far fa-file-alt" style={{ marginRight: '5px' }}></i>{issue.article_count}건의 기사
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default IssueListPage;
