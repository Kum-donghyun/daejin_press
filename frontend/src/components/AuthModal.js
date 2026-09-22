import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // 로그인 폼
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 회원가입 폼
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regName, setRegName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(loginEmail, loginPassword);
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (regPassword !== regPasswordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const result = await register(regEmail, regPassword, regName, regNickname);
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#004b93] rounded-2xl flex items-center justify-center text-white mx-auto mb-4">
            <i className="fas fa-newspaper text-2xl"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">
            {isLogin ? '로그인' : '회원가입'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {isLogin ? '대진대학교 신문사에 오신 것을 환영합니다' : '독자 계정을 만들어 댓글과 반응을 남겨보세요'}
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {isLogin ? (
          /* ─── 로그인 폼 ─── */
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">이메일</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="example@daejin.ac.kr"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b93] focus:border-transparent transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">비밀번호</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b93] focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 bg-[#004b93] text-white rounded-xl font-bold hover:bg-[#003a75] transition disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  로그인 중...
                </span>
              ) : '로그인'}
            </button>

            {/* 테스트 계정 안내 */}
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs font-semibold text-blue-700 mb-2">테스트 계정</p>
              <div className="space-y-1 text-xs text-blue-600">
                <p>관리자: </p>
                <p>기 자: </p>
                <p>독 자: (본인 학번 또는 교번)@daejin.ac.kr / 자유 비밀번호 설정</p>
              </div>
            </div>
          </form>
        ) : (
          /* ─── 회원가입 폼 ─── */
          <form onSubmit={handleRegister}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">이메일</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="example@daejin.ac.kr"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b93] focus:border-transparent transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">이름</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="실명을 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b93] focus:border-transparent transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">닉네임 (선택)</label>
                <input
                  type="text"
                  value={regNickname}
                  onChange={(e) => setRegNickname(e.target.value)}
                  placeholder="사이트에서 사용할 닉네임"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b93] focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">비밀번호</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="최소 6자 이상"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b93] focus:border-transparent transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">비밀번호 확인</label>
                <input
                  type="password"
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b93] focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 bg-[#004b93] text-white rounded-xl font-bold hover:bg-[#003a75] transition disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  가입 중...
                </span>
              ) : '회원가입'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              가입 시 <span className="font-bold">독자</span> 권한으로 등록됩니다.<br />
              기자/관리자 권한은 관리자 승인이 필요합니다.
            </p>
          </form>
        )}

        {/* 전환 버튼 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-gray-500 hover:text-[#004b93] transition"
          >
            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>

        {/* 닫기 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
          style={{ position: 'absolute', top: '16px', right: '16px' }}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
