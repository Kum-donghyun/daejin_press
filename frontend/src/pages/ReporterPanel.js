import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import TickerManager from '../components/TickerManager';
import ArticleStatsPanel from '../components/ArticleStatsPanel';

const API = '/api';

const ONLINE_STATUS = {
  draft:    { text: '임시저장',     bg: '#f3f4f6', color: '#6b7280' },
  pending:  { text: '컨펌 요청 중', bg: '#fef3c7', color: '#92400e' },
  approved: { text: '게재 중',      bg: '#d1fae5', color: '#065f46' },
  rejected: { text: '반려됨',       bg: '#fee2e2', color: '#991b1b' },
};

function ReporterPanel() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('newspapers');
  const [newspapers, setNewspapers]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [onlineArticles, setOnlineArticles] = useState([]);
  const [onlineLoading, setOnlineLoading]   = useState(false);

  useEffect(() => {
    if (!user || !['admin', 'reporter'].includes(user.role)) {
      navigate('/');
      return;
    }
    fetchNewspapers();
  }, [user, navigate]);

  useEffect(() => {
    if (tab === 'online') fetchOnlineArticles();
  }, [tab]);

  const fetchNewspapers = async () => {
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.get(`${API}/newspapers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewspapers(res.data.newspapers);
    } catch (err) {
      showToast('목록을 불러올 수 없습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineArticles = async () => {
    setOnlineLoading(true);
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.get(`${API}/online-articles/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOnlineArticles(res.data.articles);
    } catch {
      showToast('온라인 기사 목록을 불러올 수 없습니다.', 'error');
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleDeleteOnline = async (id) => {
    if (!window.confirm('이 온라인 기사를 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('dju_token');
      await axios.delete(`${API}/online-articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('삭제되었습니다.', 'info');
      fetchOnlineArticles();
    } catch {
      showToast('삭제 실패', 'error');
    }
  };

  if (!user || !['admin', 'reporter'].includes(user.role)) return null;

  const TABS = [
    { key: 'newspapers', label: '지면 기사 작성', icon: 'fas fa-newspaper' },
    { key: 'online',     label: '온라인 기사',    icon: 'fas fa-globe' },
    { key: 'ticker',     label: '24h DJU 속보',   icon: 'fas fa-bolt' },
    { key: 'stats',      label: '기사 통계',       icon: 'fas fa-chart-bar' },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900">대진대 신문사 기사 작성</h1>
        <p className="text-gray-500 mt-1">지면 기사를 작성하거나, 온라인 전용 기사를 게재하세요.</p>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', gap: '4px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: tab === t.key ? '#003580' : '#9ca3af', borderBottom: tab === t.key ? '3px solid #003580' : '3px solid transparent', marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.15s' }}>
              <i className={t.icon}></i>{t.label}
            </button>
          ))}
        </div>
        {tab === 'online' && (
          <button onClick={() => navigate('/write/online')}
            style={{ padding: '8px 18px', background: '#003580', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
            <i className="fas fa-plus"></i> 온라인 기사 작성
          </button>
        )}
      </div>

      {/* ── 지면 기사 탭 ── */}
      {tab === 'newspapers' && (
        loading ? (
          <div className="text-center py-20 text-gray-400">
            <i className="fas fa-spinner fa-spin text-3xl mb-4"></i>
            <p>불러오는 중...</p>
          </div>
        ) : newspapers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <i className="fas fa-newspaper text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-400 font-semibold">아직 생성된 신문이 없습니다.</p>
            <p className="text-gray-400 text-sm mt-1">편집장이 신문을 생성하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {newspapers.map((np) => (
              <div
                key={np.id}
                onClick={() => navigate(`/write/newspaper/${np.id}`)}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-[#004b93]/20 transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#004b93]/10 rounded-xl flex items-center justify-center text-[#004b93] font-black text-lg">
                    {np.issue_number}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-[#004b93] transition">
                      {np.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      발행일 {new Date(np.publish_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    np.status === 'published' ? 'bg-green-100 text-green-700' :
                    np.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {np.status === 'published' ? '발행완료' : np.status === 'in_progress' ? '작성중' : '초안'}
                  </span>
                  <i className="fas fa-chevron-right text-gray-300 group-hover:text-[#004b93] transition"></i>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── 온라인 기사 탭 ── */}
      {tab === 'online' && (
        onlineLoading ? (
          <div className="text-center py-20 text-gray-400">
            <i className="fas fa-spinner fa-spin text-3xl mb-4"></i><p>불러오는 중...</p>
          </div>
        ) : onlineArticles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <i className="fas fa-globe text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-400 font-semibold">작성한 온라인 기사가 없습니다.</p>
            <p className="text-gray-400 text-sm mt-1">'온라인 기사 작성' 버튼으로 기사를 작성해보세요.</p>
            <button onClick={() => navigate('/write/online')}
              style={{ marginTop: '16px', padding: '10px 24px', background: '#003580', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              <i className="fas fa-plus" style={{ marginRight: '7px' }}></i>온라인 기사 작성
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {onlineArticles.map(art => {
              const st = ONLINE_STATUS[art.status] || ONLINE_STATUS.draft;
              return (
                <div key={art.id}
                  style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color }}>{st.text}</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(art.updated_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {art.title || <span style={{ color: '#9ca3af' }}>제목 없음 (임시저장)</span>}
                    </p>
                    {art.status === 'rejected' && art.admin_note && (
                      <p style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>
                        <i className="fas fa-times-circle" style={{ marginRight: '4px' }}></i>{art.admin_note}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {art.status === 'approved' && (
                      <button onClick={() => navigate(`/online-article/${art.id}`)}
                        style={{ padding: '6px 14px', border: '1px solid #003580', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#003580', background: '#fff', cursor: 'pointer' }}>
                        <i className="fas fa-eye" style={{ marginRight: '5px' }}></i>보기
                      </button>
                    )}
                    {['draft','rejected'].includes(art.status) && (
                      <>
                        <button onClick={() => navigate(`/write/online/${art.id}`)}
                          style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#fff', background: '#003580', cursor: 'pointer' }}>
                          <i className="fas fa-pen" style={{ marginRight: '5px' }}></i>수정
                        </button>
                        <button onClick={() => handleDeleteOnline(art.id)}
                          style={{ padding: '6px 14px', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#d32f2f', background: '#fff', cursor: 'pointer' }}>
                          <i className="fas fa-trash" style={{ marginRight: '5px' }}></i>삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
      {/* ── 24h DJU 속보 탭 ── */}
      {tab === 'ticker' && <TickerManager />}

      {/* ── 기사 통계 탭 ── */}
      {tab === 'stats' && <ArticleStatsPanel scope="reporter" />}

    </main>
  );
}

export default ReporterPanel;
