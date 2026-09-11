import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ProfileModal from './ProfileModal';

const API = '/api';

function UserMenu() {
  const { user, logout, getRoleLabel } = useAuth();
  const [open, setOpen] = useState(false);
  const [pendingConfirms, setPendingConfirms] = useState(0);
  const [pendingPosCount, setPendingPosCount] = useState(0);
  const [pendingOnlineCount, setPendingOnlineCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notiOpen, setNotiOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const roleColor = {
    admin: 'bg-red-100 text-red-700',
    reporter: 'bg-blue-100 text-blue-700',
    reader: 'bg-green-100 text-green-700',
  };

  // 편집장 pending confirm 수
  useEffect(() => {
    if (user?.role === 'admin') {
      const token = localStorage.getItem('dju_token');
      const fetchCount = () => {
        axios.get(`${API}/newspapers/confirms/count`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => setPendingConfirms(res.data.count)).catch(() => {});
        axios.get(`${API}/positions/admin/pending-count`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => setPendingPosCount(res.data.count)).catch(() => {});
        axios.get(`${API}/online-articles/admin/pending-count`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => setPendingOnlineCount(res.data.count)).catch(() => {});
      };
      fetchCount();
      const interval = setInterval(fetchCount, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // 알림 가져오기 (기자 + 편집장)
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('dju_token');
    const fetchNotifications = () => {
      axios.get(`${API}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setUnreadCount(res.data.count)).catch(() => {});
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const openNotifications = async () => {
    setNotiOpen(!notiOpen);
    if (!notiOpen) {
      try {
        const token = localStorage.getItem('dju_token');
        const res = await axios.get(`${API}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data.notifications);
      } catch (err) {}
    }
  };

  const handleReadNotification = async (noti) => {
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(`${API}/notifications/${noti.id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      // 해당 기사로 이동
      if (noti.section_id) {
        navigate('/write/article/' + noti.section_id);
        setNotiOpen(false);
      }
    } catch (err) {}
  };

  const handleReadAll = async () => {
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(`${API}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {}
  };

  const notiIcon = {
    'confirm_done': 'fas fa-edit text-purple-500',
    'approved': 'fas fa-check-circle text-green-500',
    'confirm_request': 'fas fa-bell text-orange-500',
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return m + '분 전';
    const h = Math.floor(m / 60);
    if (h < 24) return h + '시간 전';
    return Math.floor(h / 24) + '일 전';
  };

  return (
    <div className="flex items-center space-x-2">
      {/* 알림 벨 */}
      <div className="relative">
        <button
          onClick={openNotifications}
          className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
        >
          <i className="fas fa-bell text-gray-500"></i>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notiOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNotiOpen(false)}></div>
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">알림</h3>
                {unreadCount > 0 && (
                  <button onClick={handleReadAll} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                    모두 읽음
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    <i className="fas fa-bell-slash text-2xl mb-2"></i>
                    <p>알림이 없습니다</p>
                  </div>
                ) : (
                  notifications.map(noti => (
                    <button
                      key={noti.id}
                      onClick={() => handleReadNotification(noti)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition border-b border-gray-50 ${noti.is_read ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <i className={`${notiIcon[noti.type] || 'fas fa-bell text-gray-400'} mt-0.5`}></i>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${noti.is_read ? 'text-gray-500' : 'font-bold text-gray-900'}`}>{noti.title}</p>
                          <p className="text-xs text-gray-400 truncate">{noti.message}</p>
                          <p className="text-xs text-gray-300 mt-1">{timeAgo(noti.created_at)}</p>
                        </div>
                        {!noti.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 프로필 메뉴 */}
      <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-full pl-3 pr-4 py-2 transition"
      >
        <div className="w-7 h-7 bg-[#004b93] rounded-full flex items-center justify-center text-white text-xs font-bold">
          {user.name?.charAt(0)}
        </div>
        <span className="text-sm font-semibold text-gray-700">{user.nickname || user.name}</span>
        <i className={`fas fa-chevron-down text-xs text-gray-400 transition ${open ? 'rotate-180' : ''}`}></i>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            {/* 사용자 정보 */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#004b93] rounded-full flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                  {user.position && (
                    <p className="text-xs text-[#003580] font-semibold mt-0.5">{user.position}</p>
                  )}
                </div>
              </div>
              <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-bold ${roleColor[user.role]}`}>
                {getRoleLabel(user.role)}
              </span>
            </div>

            {/* 메뉴 항목 */}
            <div className="p-2">
              <button
                onClick={() => { setOpen(false); setProfileOpen(true); }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-left"
              >
                <i className="fas fa-user text-gray-400 w-5"></i>
                <span className="text-sm text-gray-700">내 프로필</span>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => { navigate('/admin'); setOpen(false); }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-left relative"
                >
                  <i className="fas fa-cog text-gray-400 w-5"></i>
                  <span className="text-sm text-gray-700">관리자 패널</span>
                  {(pendingConfirms > 0 || pendingPosCount > 0 || pendingOnlineCount > 0) && (
                    <span className="ml-auto flex items-center gap-1">
                      {pendingConfirms > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">컨펌 {pendingConfirms}</span>}
                      {pendingOnlineCount > 0 && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">온라인 {pendingOnlineCount}</span>}
                      {pendingPosCount > 0 && <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">직책 {pendingPosCount}</span>}
                    </span>
                  )}
                </button>
              )}

              {(user.role === 'admin' || user.role === 'reporter') && (
                <button
                  onClick={() => { navigate('/write'); setOpen(false); }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-left"
                >
                  <i className="fas fa-pen text-gray-400 w-5"></i>
                  <span className="text-sm text-gray-700">기사 작성</span>
                </button>
              )}

              <hr className="my-2 border-gray-100" />

              <button
                onClick={() => { logout(); setOpen(false); navigate('/'); }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-red-50 transition text-left"
              >
                <i className="fas fa-sign-out-alt text-red-400 w-5"></i>
                <span className="text-sm text-red-600 font-semibold">로그아웃</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

export default UserMenu;
