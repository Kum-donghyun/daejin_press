import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import TickerManager from '../components/TickerManager';
import ArticleStatsPanel from '../components/ArticleStatsPanel';

const API = `http://${window.location.hostname}:5000/api`;

const ONLINE_STATUS = {
  draft:    { text: '임시저장',     bg: '#f3f4f6', color: '#6b7280' },
  pending:  { text: '컨펌 요청 중', bg: '#fef3c7', color: '#92400e' },
  approved: { text: '게재 중',      bg: '#d1fae5', color: '#065f46' },
  rejected: { text: '반려됨',       bg: '#fee2e2', color: '#991b1b' },
};

function AdminPanel() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('newspapers');

  // 신문 호수
  const [newspapers, setNewspapers] = useState([]);
  const [loading, setLoading]       = useState(true);

  // 직책 신청
  const [posRequests, setPosRequests] = useState([]);
  const [posLoading, setPosLoading]   = useState(false);
  const [noteMap, setNoteMap]         = useState({});
  const [pendingCount, setPendingCount] = useState(0);

  // 온라인 기사 컨펌
  const [onlineList, setOnlineList]         = useState([]);
  const [onlineLoading, setOnlineLoading]   = useState(false);
  const [onlineFilter, setOnlineFilter]     = useState('pending');
  const [onlineNoteMap, setOnlineNoteMap]   = useState({});
  const [onlinePending, setOnlinePending]   = useState(0);

  // 영상 뉴스
  const [videos, setVideos]             = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoForm, setVideoForm]       = useState({ youtube_url: '', title: '', upload_date: '' });
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoSaving, setVideoSaving]   = useState(false);

  // 문의·제보
  const [contacts, setContacts]           = useState([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactFilter, setContactFilter]   = useState('all');
  const [contactUnread, setContactUnread]   = useState(0);
  const [selectedContact, setSelectedContact] = useState(null);

  // 실명 인증
  const [verifiedList, setVerifiedList]       = useState([]);
  const [verifiedLoading, setVerifiedLoading] = useState(false);
  const [verifiedPending, setVerifiedPending] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchNewspapers();
    fetchPendingCounts();
  }, [user, navigate]);

  useEffect(() => {
    if (tab === 'position-requests') fetchPosRequests();
    if (tab === 'online-confirms')   fetchOnlineList();
    if (tab === 'video-news')        fetchVideos();
    if (tab === 'contacts')          fetchContacts();
    if (tab === 'verified')          fetchVerifiedList();
  }, [tab]);

  useEffect(() => {
    if (tab === 'contacts') fetchContacts();
  }, [contactFilter]);

  useEffect(() => {
    if (tab === 'online-confirms') fetchOnlineList();
  }, [onlineFilter]);

  const token = localStorage.getItem('dju_token');
  const h = { Authorization: `Bearer ${token}` };

  const fetchNewspapers = async () => {
    try {
      const res = await axios.get(`${API}/newspapers`, { headers: h });
      setNewspapers(res.data.newspapers);
    } catch { showToast('신문 목록을 불러올 수 없습니다.', 'error'); }
    finally { setLoading(false); }
  };

  const fetchPendingCounts = async () => {
    try {
      const [pos, online, contact, verified] = await Promise.all([
        axios.get(`${API}/positions/admin/pending-count`,       { headers: h }),
        axios.get(`${API}/online-articles/admin/pending-count`, { headers: h }),
        axios.get(`${API}/contact/admin/unread-count`,          { headers: h }),
        axios.get(`${API}/verified/admin/pending-count`,        { headers: h }),
      ]);
      setPendingCount(pos.data.count);
      setOnlinePending(online.data.count);
      setContactUnread(contact.data.count);
      setVerifiedPending(verified.data.count);
    } catch {}
  };

  const fetchPosRequests = async () => {
    setPosLoading(true);
    try {
      const res = await axios.get(`${API}/positions/admin/list`, { headers: h });
      setPosRequests(res.data.requests);
    } catch { showToast('목록을 불러올 수 없습니다.', 'error'); }
    finally { setPosLoading(false); }
  };

  const fetchOnlineList = async () => {
    setOnlineLoading(true);
    try {
      const res = await axios.get(`${API}/online-articles/admin/list?status=${onlineFilter}`, { headers: h });
      setOnlineList(res.data.articles);
    } catch { showToast('목록을 불러올 수 없습니다.', 'error'); }
    finally { setOnlineLoading(false); }
  };

  const fetchContacts = async () => {
    setContactLoading(true);
    try {
      const res = await axios.get(`${API}/contact/admin/list?type=${contactFilter}&limit=50`, { headers: h });
      setContacts(res.data.submissions);
    } catch { showToast('문의 목록을 불러올 수 없습니다.', 'error'); }
    finally { setContactLoading(false); }
  };

  const handleContactRead = async (id) => {
    try {
      await axios.put(`${API}/contact/admin/${id}/read`, {}, { headers: h });
      setContacts(p => p.map(c => c.id === id ? { ...c, is_read: 1 } : c));
      setContactUnread(p => Math.max(0, p - 1));
    } catch {}
  };

  const handleContactDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await axios.delete(`${API}/contact/admin/${id}`, { headers: h });
      setContacts(p => p.filter(c => c.id !== id));
      if (selectedContact?.id === id) setSelectedContact(null);
      showToast('삭제했습니다.');
    } catch { showToast('삭제 실패', 'error'); }
  };

  const fetchVerifiedList = async () => {
    setVerifiedLoading(true);
    try {
      const res = await axios.get(`${API}/verified/admin/list`, { headers: h });
      setVerifiedList(res.data.users);
    } catch { showToast('실명인증 목록 오류', 'error'); }
    finally { setVerifiedLoading(false); }
  };

  const handleVerifiedApprove = async (id) => {
    try {
      await axios.put(`${API}/verified/admin/${id}/approve`, {}, { headers: h });
      showToast('승인되었습니다.', 'success');
      fetchVerifiedList(); fetchPendingCounts();
    } catch { showToast('승인 실패', 'error'); }
  };

  const handleVerifiedReject = async (id) => {
    const note = window.prompt('거절 사유 (선택사항)');
    try {
      await axios.put(`${API}/verified/admin/${id}/reject`, { note }, { headers: h });
      showToast('거절되었습니다.', 'info');
      fetchVerifiedList(); fetchPendingCounts();
    } catch { showToast('거절 실패', 'error'); }
  };

  const fetchVideos = async () => {
    setVideoLoading(true);
    try {
      const res = await axios.get(`${API}/video-news`, { headers: h });
      setVideos(res.data.videos);
    } catch { showToast('영상 목록을 불러올 수 없습니다.', 'error'); }
    finally { setVideoLoading(false); }
  };

  const handlePosApprove = async (id) => {
    if (!window.confirm('이 직책 신청을 승인하시겠습니까?')) return;
    try {
      await axios.put(`${API}/positions/admin/${id}/approve`, { admin_note: noteMap[id]||'' }, { headers: h });
      showToast('승인되었습니다.', 'success');
      fetchPosRequests(); fetchPendingCounts();
    } catch (err) { showToast(err.response?.data?.message || '승인 실패', 'error'); }
  };

  const handlePosReject = async (id) => {
    if (!window.confirm('이 직책 신청을 거절하시겠습니까?')) return;
    try {
      await axios.put(`${API}/positions/admin/${id}/reject`, { admin_note: noteMap[id]||'' }, { headers: h });
      showToast('거절되었습니다.', 'info');
      fetchPosRequests(); fetchPendingCounts();
    } catch (err) { showToast(err.response?.data?.message || '거절 실패', 'error'); }
  };

  const handleOnlineApprove = async (id) => {
    if (!window.confirm('이 온라인 기사를 승인하시겠습니까?')) return;
    try {
      await axios.put(`${API}/online-articles/admin/${id}/approve`, { admin_note: onlineNoteMap[id]||'' }, { headers: h });
      showToast('승인되었습니다.', 'success');
      fetchOnlineList(); fetchPendingCounts();
    } catch (err) { showToast(err.response?.data?.message || '승인 실패', 'error'); }
  };

  const handleOnlineReject = async (id) => {
    const note = onlineNoteMap[id]?.trim();
    if (!window.confirm('이 온라인 기사를 반려하시겠습니까?')) return;
    try {
      await axios.put(`${API}/online-articles/admin/${id}/reject`, { admin_note: note||'' }, { headers: h });
      showToast('반려되었습니다.', 'info');
      fetchOnlineList(); fetchPendingCounts();
    } catch (err) { showToast(err.response?.data?.message || '반려 실패', 'error'); }
  };

  const handleVideoSave = async () => {
    setVideoSaving(true);
    try {
      if (editingVideo) {
        await axios.put(`${API}/video-news/${editingVideo}`, videoForm, { headers: h });
        showToast('수정되었습니다.', 'success');
      } else {
        await axios.post(`${API}/video-news`, videoForm, { headers: h });
        showToast('영상이 추가되었습니다.', 'success');
      }
      setVideoForm({ youtube_url: '', title: '', upload_date: '' });
      setEditingVideo(null);
      fetchVideos();
    } catch (err) { showToast(err.response?.data?.message || '저장 실패', 'error'); }
    finally { setVideoSaving(false); }
  };

  const handleVideoDelete = async (id) => {
    if (!window.confirm('이 영상을 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`${API}/video-news/${id}`, { headers: h });
      showToast('삭제되었습니다.', 'info');
      fetchVideos();
    } catch { showToast('삭제 실패', 'error'); }
  };

  const startEditVideo = (v) => {
    setEditingVideo(v.id);
    setVideoForm({ youtube_url: v.youtube_url, title: v.title, upload_date: v.upload_date?.slice(0,10) || '' });
  };

  if (!user || user.role !== 'admin') return null;

  const ROLE_LABEL = { admin: '편집장/관리자', reporter: '기자', reader: '독자' };
  const POS_STATUS_STYLE = {
    pending:  { text: '검토 중', bg: '#fef3c7', color: '#92400e' },
    approved: { text: '승인됨',  bg: '#d1fae5', color: '#065f46' },
    rejected: { text: '거절됨',  bg: '#fee2e2', color: '#991b1b' },
  };

  const TABS = [
    { key: 'newspapers',        label: '신문 호수 관리',    icon: 'fas fa-newspaper' },
    { key: 'online-confirms',   label: '온라인 기사 컨펀',  icon: 'fas fa-globe',      badge: onlinePending },
    { key: 'ticker',            label: '24h DJU 속보',     icon: 'fas fa-bolt' },
    { key: 'video-news',        label: '영상 뉴스 관리',    icon: 'fab fa-youtube' },
    { key: 'position-requests', label: '직책 신청 관리',    icon: 'fas fa-user-check', badge: pendingCount },
    { key: 'contacts',          label: '문의·제보 관리',    icon: 'fas fa-inbox',      badge: contactUnread },
    { key: 'verified',          label: '실명 인증 승인',    icon: 'fas fa-id-card',    badge: verifiedPending },
    { key: 'stats',             label: '기사 통계',          icon: 'fas fa-chart-bar' },
  ];

  const inputS = { padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">관리자 패널</h1>
          <p className="text-gray-500 mt-1">신문 호수·온라인 기사·영상 뉴스·직책 신청을 관리합니다.</p>
        </div>
        {tab === 'newspapers' && (
          <button onClick={() => navigate('/admin/create-newspaper')}
            className="bg-[#004b93] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#003a75] transition flex items-center space-x-2">
            <i className="fas fa-plus"></i><span>호수 별 신문 생성</span>
          </button>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', gap: '2px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: tab === t.key ? '#003580' : '#9ca3af', borderBottom: tab === t.key ? '3px solid #003580' : '3px solid transparent', marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            <i className={t.icon}></i>{t.label}
            {t.badge > 0 && <span style={{ background: '#d32f2f', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '1px 6px', borderRadius: '20px' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ─────── 신문 호수 탭 ─────── */}
      {tab === 'newspapers' && (
        loading ? (
          <div className="text-center py-20 text-gray-400"><i className="fas fa-spinner fa-spin text-3xl mb-4"></i><p>불러오는 중...</p></div>
        ) : newspapers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <i className="fas fa-newspaper text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-400 font-semibold">아직 생성된 신문이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {newspapers.map(np => (
              <div key={np.id} onClick={() => navigate(`/admin/newspaper/${np.id}`)}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-[#004b93]/20 transition cursor-pointer flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#004b93]/10 rounded-xl flex items-center justify-center text-[#004b93] font-black text-lg">{np.issue_number}</div>
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-[#004b93] transition">{np.title}</h3>
                    <p className="text-sm text-gray-400">발행일 {new Date(np.publish_date).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {np.pending_confirms > 0 && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">컨펌 {np.pending_confirms}</span>}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${np.status === 'published' ? 'bg-green-100 text-green-700' : np.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                    {np.status === 'published' ? '발행완료' : np.status === 'in_progress' ? '작성중' : '초안'}
                  </span>
                  <i className="fas fa-chevron-right text-gray-300 group-hover:text-[#004b93] transition"></i>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─────── 온라인 기사 컨펌 탭 ─────── */}
      {tab === 'online-confirms' && (
        <div>
          {/* 필터 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[['pending','컨펌 요청 중'],['approved','게재 중'],['rejected','반려됨'],['all','전체']].map(([v,l]) => (
              <button key={v} onClick={() => setOnlineFilter(v)}
                style={{ padding: '6px 16px', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: onlineFilter===v ? '#003580' : '#f3f4f6', color: onlineFilter===v ? '#fff' : '#6b7280' }}>
                {l}
              </button>
            ))}
          </div>

          {onlineLoading ? (
            <div className="text-center py-20 text-gray-400"><i className="fas fa-spinner fa-spin text-3xl mb-4"></i><p>불러오는 중...</p></div>
          ) : onlineList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
              <i className="fas fa-globe text-5xl text-gray-300 mb-4"></i>
              <p className="text-gray-400 font-semibold">해당하는 온라인 기사가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {onlineList.map(art => {
                const st = ONLINE_STATUS[art.status] || ONLINE_STATUS.draft;
                return (
                  <div key={art.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', background: st.bg, color: st.color }}>{st.text}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{art.reporter_name}</span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{art.reporter_email}</span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(art.updated_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>
                          {art.title || <span style={{ color: '#9ca3af' }}>제목 없음</span>}
                        </p>
                        {art.admin_note && (
                          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            <i className="fas fa-comment-alt" style={{ marginRight: '4px' }}></i>{art.admin_note}
                          </p>
                        )}
                      </div>

                      {art.status === 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                          <input type="text" placeholder="반려 사유 / 메모 (선택)"
                            value={onlineNoteMap[art.id]||''}
                            onChange={e => setOnlineNoteMap(p => ({ ...p, [art.id]: e.target.value }))}
                            style={inputS}
                            onFocus={e => e.target.style.borderColor='#003580'} onBlur={e => e.target.style.borderColor='#e5e7eb'}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleOnlineApprove(art.id)}
                              style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', background: '#003580', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                              <i className="fas fa-check" style={{ marginRight: '5px' }}></i>승인
                            </button>
                            <button onClick={() => handleOnlineReject(art.id)}
                              style={{ flex: 1, padding: '8px 0', border: '1px solid #fecaca', borderRadius: '8px', background: '#fff', color: '#d32f2f', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                              <i className="fas fa-times" style={{ marginRight: '5px' }}></i>반려
                            </button>
                          </div>
                        </div>
                      )}
                      {art.status === 'approved' && (
                        <button onClick={() => navigate(`/online-article/${art.id}`)}
                          style={{ padding: '8px 16px', border: '1px solid #003580', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#003580', background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                          <i className="fas fa-external-link-alt" style={{ marginRight: '5px' }}></i>기사 보기
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────── 24h DJU 속보 탭 ─────── */}
      {tab === 'ticker' && <TickerManager />}

      {/* ─────── 영상 뉴스 탭 ─────── */}
      {tab === 'video-news' && (
        <div>
          {/* 추가/수정 폼 */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#111', marginBottom: '16px' }}>
              <i className="fab fa-youtube" style={{ marginRight: '7px', color: '#FF0000' }}></i>
              {editingVideo ? '영상 수정' : '새 영상 추가'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '5px' }}>YouTube 링크 *</label>
                <input type="url" placeholder="https://www.youtube.com/watch?v=..."
                  value={videoForm.youtube_url}
                  onChange={e => setVideoForm(f => ({ ...f, youtube_url: e.target.value }))}
                  style={inputS}
                  onFocus={e => e.target.style.borderColor='#003580'} onBlur={e => e.target.style.borderColor='#e5e7eb'}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '5px' }}>영상 제목 *</label>
                <input type="text" placeholder="대진대 주간 종합 뉴스 제123호"
                  value={videoForm.title}
                  onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))}
                  style={inputS}
                  onFocus={e => e.target.style.borderColor='#003580'} onBlur={e => e.target.style.borderColor='#e5e7eb'}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '5px' }}>업로드 일자 *</label>
                <input type="date"
                  value={videoForm.upload_date}
                  onChange={e => setVideoForm(f => ({ ...f, upload_date: e.target.value }))}
                  style={inputS}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {editingVideo && (
                <button onClick={() => { setEditingVideo(null); setVideoForm({ youtube_url:'', title:'', upload_date:'' }); }}
                  style={{ padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#6b7280', background: '#fff', cursor: 'pointer' }}>
                  취소
                </button>
              )}
              <button onClick={handleVideoSave} disabled={videoSaving}
                style={{ padding: '9px 24px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#fff', background: videoSaving ? '#9ca3af' : '#003580', cursor: videoSaving ? 'not-allowed' : 'pointer', flex: 1 }}>
                {videoSaving ? '저장 중...' : (editingVideo ? '수정 저장' : '영상 추가')}
              </button>
            </div>
          </div>

          {/* 영상 목록 */}
          {videoLoading ? (
            <div className="text-center py-12 text-gray-400"><i className="fas fa-spinner fa-spin text-3xl mb-4"></i><p>불러오는 중...</p></div>
          ) : videos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
              <i className="fab fa-youtube text-5xl text-gray-300 mb-4"></i>
              <p className="text-gray-400 font-semibold">등록된 영상이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map(v => (
                <div key={v.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {v.thumbnail && (
                    <img src={v.thumbnail} alt={v.title}
                      style={{ width: '100px', height: '56px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                      <i className="far fa-calendar" style={{ marginRight: '4px' }}></i>
                      {v.upload_date ? new Date(v.upload_date).toLocaleDateString('ko-KR') : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <a href={v.youtube_url} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '6px 12px', border: '1px solid #FF0000', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#FF0000', background: '#fff', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fab fa-youtube"></i> 보기
                    </a>
                    <button onClick={() => startEditVideo(v)}
                      style={{ padding: '6px 12px', border: '1px solid #003580', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#003580', background: '#fff', cursor: 'pointer' }}>
                      <i className="fas fa-pen"></i>
                    </button>
                    <button onClick={() => handleVideoDelete(v.id)}
                      style={{ padding: '6px 12px', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#d32f2f', background: '#fff', cursor: 'pointer' }}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────── 직책 신청 탭 ─────── */}
      {tab === 'position-requests' && (
        posLoading ? (
          <div className="text-center py-20 text-gray-400"><i className="fas fa-spinner fa-spin text-3xl mb-4"></i><p>불러오는 중...</p></div>
        ) : posRequests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <i className="fas fa-user-check text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-400 font-semibold">직책 신청이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posRequests.map(req => {
              const st = POS_STATUS_STYLE[req.status] || {};
              return (
                <div key={req.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '34px', height: '34px', background: '#003580', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>{req.name?.charAt(0)}</div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{req.name}</p>
                          <p style={{ fontSize: '12px', color: '#9ca3af' }}>{req.email}</p>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f3f4f6', color: '#6b7280', fontWeight: 600 }}>
                          현재: {ROLE_LABEL[req.current_role]}{req.current_position ? ` · ${req.current_position}` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#003580' }}>'{req.requested_position}' 직책 신청</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>→ {ROLE_LABEL[req.requested_role]} 권한</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', background: st.bg, color: st.color }}>{st.text}</span>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(req.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                      {req.admin_note && <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}><i className="fas fa-comment-alt" style={{ marginRight: '5px' }}></i>{req.admin_note}</p>}
                    </div>
                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                        <input type="text" placeholder="메모 (선택)"
                          value={noteMap[req.id]||''}
                          onChange={e => setNoteMap(p => ({ ...p, [req.id]: e.target.value }))}
                          style={inputS}
                          onFocus={e => e.target.style.borderColor='#003580'} onBlur={e => e.target.style.borderColor='#e5e7eb'}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handlePosApprove(req.id)} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', background: '#003580', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            <i className="fas fa-check" style={{ marginRight: '5px' }}></i>승인
                          </button>
                          <button onClick={() => handlePosReject(req.id)} style={{ flex: 1, padding: '8px 0', border: '1px solid #fecaca', borderRadius: '8px', background: '#fff', color: '#d32f2f', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            <i className="fas fa-times" style={{ marginRight: '5px' }}></i>거절
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─────── 문의·제보 탭 ─────── */}
      {tab === 'contacts' && (() => {
        const TYPE_META = {
          apply:     { label: '기자 지원', color: '#1565c0', bg: '#e3f2fd', icon: '✏️' },
          report:    { label: '제보',      color: '#2e7d32', bg: '#e8f5e9', icon: '📢' },
          advertise: { label: '광고 문의', color: '#e65100', bg: '#fff3e0', icon: '💼' },
        };
        return (
          <div>
            {/* 필터 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[['all','전체'],['apply','기자 지원'],['report','제보'],['advertise','광고 문의']].map(([k, lbl]) => (
                <button key={k} onClick={() => { setContactFilter(k); setSelectedContact(null); }}
                  style={{ padding: '6px 16px', borderRadius: '20px', border: '1.5px solid', borderColor: contactFilter === k ? '#003580' : '#e5e7eb', background: contactFilter === k ? '#003580' : '#fff', color: contactFilter === k ? '#fff' : '#6b7280', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {lbl}
                </button>
              ))}
            </div>

            {contactLoading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
            ) : contacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', background: '#fff', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
                <i className="fas fa-inbox" style={{ fontSize: '40px', marginBottom: '12px' }}></i>
                <p style={{ fontWeight: 600 }}>접수된 내용이 없습니다.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: selectedContact ? '1fr 420px' : '1fr', gap: '16px', alignItems: 'start' }}>
                {/* 목록 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {contacts.map(c => {
                    const tm = TYPE_META[c.type] || TYPE_META.report;
                    const isSelected = selectedContact?.id === c.id;
                    return (
                      <div key={c.id}
                        onClick={() => {
                          setSelectedContact(c);
                          if (!c.is_read) handleContactRead(c.id);
                        }}
                        style={{ background: '#fff', borderRadius: '10px', padding: '14px 18px', border: `1.5px solid ${isSelected ? '#003580' : c.is_read ? '#f3f4f6' : '#bfdbfe'}`, cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'flex-start', transition: 'border-color 0.15s' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: tm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{tm.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: tm.bg, color: tm.color }}>{tm.label}</span>
                            {!c.is_read && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '20px', background: '#d32f2f', color: '#fff' }}>NEW</span>}
                            <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto' }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</span>
                          </div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</p>
                          <p style={{ fontSize: '12px', color: '#9ca3af' }}>{c.name || '익명'}{c.department ? ` · ${c.department}` : ''}{c.phone ? ` · ${c.phone}` : ''}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); handleContactDelete(c.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '14px', padding: '4px', flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color='#d32f2f'}
                          onMouseLeave={e => e.currentTarget.style.color='#d1d5db'}
                        ><i className="fas fa-trash"></i></button>
                      </div>
                    );
                  })}
                </div>

                {/* 단건 상세 */}
                {selectedContact && (() => {
                  const c = selectedContact;
                  const tm = TYPE_META[c.type] || TYPE_META.report;
                  return (
                    <div style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #e5e7eb', padding: '24px', position: 'sticky', top: '80px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: tm.bg, color: tm.color }}>{tm.icon} {tm.label}</span>
                        <button onClick={() => setSelectedContact(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px' }}><i className="fas fa-times"></i></button>
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '16px', lineHeight: 1.4 }}>{c.subject}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', padding: '14px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px' }}>
                        {c.name       && <div><span style={{ color: '#9ca3af', width: '70px', display: 'inline-block' }}>이름</span><span style={{ color: '#111827', fontWeight: 600 }}>{c.name}</span></div>}
                        {c.student_id && <div><span style={{ color: '#9ca3af', width: '70px', display: 'inline-block' }}>학번</span><span style={{ color: '#111827' }}>{c.student_id}</span></div>}
                        {c.department && <div><span style={{ color: '#9ca3af', width: '70px', display: 'inline-block' }}>학과/회사</span><span style={{ color: '#111827' }}>{c.department}</span></div>}
                        {c.phone      && <div><span style={{ color: '#9ca3af', width: '70px', display: 'inline-block' }}>연락주</span><a href={`tel:${c.phone}`} style={{ color: '#003580', fontWeight: 600 }}>{c.phone}</a></div>}
                        {c.email      && <div><span style={{ color: '#9ca3af', width: '70px', display: 'inline-block' }}>이메일</span><a href={`mailto:${c.email}`} style={{ color: '#003580', fontWeight: 600 }}>{c.email}</a></div>}
                        <div><span style={{ color: '#9ca3af', width: '70px', display: 'inline-block' }}>접수일</span><span style={{ color: '#111827' }}>{new Date(c.created_at).toLocaleString('ko-KR')}</span></div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>{c.body}</div>
                      <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                        {c.email && <a href={`mailto:${c.email}`} style={{ flex: 1, textAlign: 'center', padding: '10px', background: '#003580', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}><i className="fas fa-envelope" style={{ marginRight: '6px' }}></i>이메일 답장</a>}
                        {c.phone  && <a href={`tel:${c.phone}`}  style={{ flex: 1, textAlign: 'center', padding: '10px', background: '#16a34a', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}><i className="fas fa-phone" style={{ marginRight: '6px' }}></i>전화</a>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─────── 기사 통계 탭 ─────── */}
      {tab === 'stats' && <ArticleStatsPanel scope="admin" />}

      {/* ─────── 실명 인증 승인 탭 ─────── */}
      {tab === 'verified' && (() => {
        const TYPE_LABEL = { student: '학생', professor: '교수', staff: '교직원' };
        const ST_STYLE = {
          pending:  { text: '심사 중',  bg: '#fef3c7', color: '#92400e' },
          approved: { text: '승인됨',   bg: '#d1fae5', color: '#065f46' },
          rejected: { text: '거절됨',   bg: '#fee2e2', color: '#991b1b' },
        };
        return (
          <div>
            {verifiedLoading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
            ) : verifiedList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', background: '#fff', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
                <i className="fas fa-id-card" style={{ fontSize: '40px', marginBottom: '12px', display: 'block' }}></i>
                <p style={{ fontWeight: 600 }}>실명 인증 신청이 없습니다.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {verifiedList.map(u => {
                  const st = ST_STYLE[u.verified_status] || ST_STYLE.pending;
                  return (
                    <div key={u.id} style={{ background: '#fff', borderRadius: '10px', padding: '16px 20px', border: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#e8edf5', color: '#003580' }}>
                            {TYPE_LABEL[u.verified_type] || u.verified_type}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color }}>{st.text}</span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(u.created_at).toLocaleDateString('ko-KR')} 신청</span>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                          {u.verified_real_name} <span style={{ color: '#6b7280', fontWeight: 400 }}>({u.name} · {u.email})</span>
                        </p>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                          {u.verified_department} · {u.verified_id}
                        </p>
                      </div>
                      {u.verified_status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleVerifiedApprove(u.id)}
                            style={{ padding: '8px 18px', background: '#003580', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            <i className="fas fa-check" style={{ marginRight: '5px' }}></i>승인
                          </button>
                          <button onClick={() => handleVerifiedReject(u.id)}
                            style={{ padding: '8px 18px', background: '#fff', color: '#d32f2f', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            <i className="fas fa-times" style={{ marginRight: '5px' }}></i>거절
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </main>
  );
}

export default AdminPanel;
