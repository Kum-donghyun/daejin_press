import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 앱 시작 시 토큰이 있으면 사용자 정보 복원
  useEffect(() => {
    const token = localStorage.getItem('dju_token');
    if (token) {
      axios
        .get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('dju_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // 로그인
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      localStorage.setItem('dju_token', res.data.token);
      setUser(res.data.user);
      showToast(`${res.data.user.name}님, 환영합니다!`, 'success');
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || '로그인에 실패했습니다.';
      showToast(message, 'error');
      return { success: false, message };
    }
  };

  // 회원가입
  const register = async (email, password, name, nickname) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        email,
        password,
        name,
        nickname,
      });
      localStorage.setItem('dju_token', res.data.token);
      setUser(res.data.user);
      showToast('회원가입이 완료되었습니다!', 'success');
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        '회원가입에 실패했습니다.';
      showToast(message, 'error');
      return { success: false, message };
    }
  };

  // 로그아웃
  const logout = () => {
    localStorage.removeItem('dju_token');
    setUser(null);
    showToast('로그아웃되었습니다.', 'info');
  };

  // 프로필 수정
  const updateProfile = async ({ name, nickname, email, position }) => {
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.put(
        `${API_BASE}/auth/me`,
        { name, nickname, email, position },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(res.data.user);
      showToast('프로필이 수정되었습니다.', 'success');
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || '수정에 실패했습니다.';
      showToast(message, 'error');
      return { success: false, message };
    }
  };

  // 역할 라벨
  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return '편집장/관리자';
      case 'reporter': return '기자';
      case 'reader': return '독자';
      default: return '방문자';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        toast,
        showToast,
        getRoleLabel,
        isAdmin: user?.role === 'admin',
        isReporter: user?.role === 'reporter',
        isReader: user?.role === 'reader',
        isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
