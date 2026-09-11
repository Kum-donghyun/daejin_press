import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = '/api';
const POSITIONS = ['기자', '수습기자', '편집장', '부편집장'];

const POSITION_DESC = {
  '기자':    { role: 'reporter', desc: '기사 작성 및 컨펌 요청 권한' },
  '수습기자': { role: 'reporter', desc: '기사 작성 및 컨펌 요청 권한' },
  '편집장':  { role: 'admin',    desc: '전체 관리 및 기사 승인 권한' },
  '부편집장': { role: 'admin',   desc: '전체 관리 및 기사 승인 권한' },
};

function ProfileModal({ onClose }) {
  const { user, updateProfile, showToast } = useAuth();
  const [form, setForm] = useState({ name: '', nickname: '', email: '', position: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // 독자용 직책 신청
  const [myRequests, setMyRequests] = useState([]);
  const [requestPosition, setRequestPosition] = useState('');
  const [requesting, setRequesting] = useState(false);
  const isReader = user?.role === 'reader';

  // 실명 인증
  const [verifiedForm, setVerifiedForm] = useState({ verified_type: 'student', real_name: '', department: '', id_number: '', agreed: false });
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const verifiedStatus = user?.verified_status;
  const verifiedType   = user?.verified_type;

  useEffect(() => {
    if (user) {
      setForm({
        name:     user.name     || '',
        nickname: user.nickname || '',
        email:    user.email    || '',
        position: user.position || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('dju_token');
    if (!token) return;
    axios.get(`${API}/positions/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMyRequests(res.data.requests))
      .catch(() => {});
  }, [user]);

  const pendingRequest = myRequests.find(r => r.status === 'pending');
  const latestRequest  = myRequests[0];

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = '이름을 입력해주세요.';
    if (!form.email.trim()) e.email = '이메일을 입력해주세요.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = '올바른 이메일 형식이 아닙니다.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    const result = await updateProfile({
      name:     form.name.trim(),
      nickname: form.nickname.trim() || form.name.trim(),
      email:    form.email.trim(),
    });
    setSaving(false);
    if (result.success) onClose();
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // 독자: 실명 인증 신청
  const handleVerify = async () => {
    setVerifyError('');
    if (!verifiedForm.real_name.trim() || !verifiedForm.department.trim() || !verifiedForm.id_number.trim()) {
      setVerifyError('모든 항목을 입력해주세요.'); return;
    }
    if (!verifiedForm.agreed) { setVerifyError('개인정보 제공에 동의해주세요.'); return; }
    setVerifying(true);
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.post(`${API}/verified/request`, verifiedForm, { headers: { Authorization: `Bearer ${token}` } });
      showToast(res.data.message, 'success');
      if (res.data.user) { /* 자동승인 시 user 갱신 */ window.location.reload(); }
    } catch (err) {
      setVerifyError(err.response?.data?.message || '신청에 실패했습니다.');
    } finally { setVerifying(false); }
  };

  // 독자: 직책 신청
  const handleRequest = async () => {
    if (!requestPosition) return;
    setRequesting(true);
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.post(
        `${API}/positions/request`,
        { position: requestPosition },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data.message, 'success');
      // 목록 갱신
      const updated = await axios.get(`${API}/positions/my`, { headers: { Authorization: `Bearer ${token}` } });
      setMyRequests(updated.data.requests);
      setRequestPosition('');
    } catch (err) {
      showToast(err.response?.data?.message || '신청에 실패했습니다.', 'error');
    } finally {
      setRequesting(false);
    }
  };

  // 독자: 신청 취소
  const handleCancelRequest = async (id) => {
    try {
      const token = localStorage.getItem('dju_token');
      await axios.delete(`${API}/positions/my/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMyRequests(prev => prev.filter(r => r.id !== id));
      showToast('신청이 취소되었습니다.', 'info');
    } catch (err) {
      showToast('취소에 실패했습니다.', 'error');
    }
  };

  const statusBadge = (status) => {
    if (status === 'pending')  return { text: '검토 중', bg: '#fef3c7', color: '#92400e' };
    if (status === 'approved') return { text: '승인됨', bg: '#d1fae5', color: '#065f46' };
    if (status === 'rejected') return { text: '거절됨', bg: '#fee2e2', color: '#991b1b' };
    return {};
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '440px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: '#003580', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '15px' }}>
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#111' }}>프로필 수정</h2>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '1px' }}>이름 · 이메일 · 직책 관리</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af', lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 이름 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px', letterSpacing: '0.3px' }}>
              이름 <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="홍길동"
              style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${errors.name ? '#d32f2f' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#003580'} onBlur={e => e.target.style.borderColor = errors.name ? '#d32f2f' : '#e5e7eb'} />
            {errors.name && <p style={{ fontSize: '11px', color: '#d32f2f', marginTop: '4px' }}>{errors.name}</p>}
          </div>

          {/* 닉네임 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px', letterSpacing: '0.3px' }}>닉네임</label>
            <input type="text" value={form.nickname} onChange={e => handleChange('nickname', e.target.value)} placeholder="표시될 이름 (비워두면 이름과 동일)"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#003580'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>사이트에 표시되는 이름입니다.</p>
          </div>

          {/* 이메일 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px', letterSpacing: '0.3px' }}>
              이메일 <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="example@daejin.ac.kr"
              style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${errors.email ? '#d32f2f' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#003580'} onBlur={e => e.target.style.borderColor = errors.email ? '#d32f2f' : '#e5e7eb'} />
            {errors.email && <p style={{ fontSize: '11px', color: '#d32f2f', marginTop: '4px' }}>{errors.email}</p>}
          </div>

          {/* ── 직책 섹션 (모든 역할 공통 — 직책 변경은 반드시 편집장/관리자 승인이 필요) ── */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '10px', letterSpacing: '0.3px' }}>
              직책 {user?.position && <span style={{ fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}>(현재: {user.position})</span>}
            </label>

            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px', fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-info-circle" style={{ color: '#003580' }}></i>
                직책 변경은 신청 후 편집장/부편집장(관리자) 승인을 받아야 적용됩니다.
              </div>

              {/* 최근 신청 현황 */}
              {latestRequest && (
                <div style={{ marginBottom: '12px' }}>
                  {(() => {
                    const badge = statusBadge(latestRequest.status);
                    return (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', marginBottom: '3px' }}>
                            '{latestRequest.requested_position}' 신청
                            <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: badge.bg, color: badge.color }}>
                              {badge.text}
                            </span>
                          </div>
                          {latestRequest.admin_note && (
                            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>메모: {latestRequest.admin_note}</p>
                          )}
                          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                            {new Date(latestRequest.created_at).toLocaleDateString('ko-KR')} 신청
                          </p>
                        </div>
                        {latestRequest.status === 'pending' && (
                          <button type="button" onClick={() => handleCancelRequest(latestRequest.id)}
                            style={{ fontSize: '12px', color: '#d32f2f', background: 'none', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            취소
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 신청 폼 (대기 중이 없을 때만) */}
              {!pendingRequest && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    {POSITIONS.filter(pos => pos !== user?.position).map(pos => (
                      <button key={pos} type="button" onClick={() => setRequestPosition(requestPosition === pos ? '' : pos)}
                        style={{ padding: '9px 0', border: `1.5px solid ${requestPosition === pos ? '#003580' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '13px', fontWeight: requestPosition === pos ? 700 : 500, color: requestPosition === pos ? '#003580' : '#6b7280', background: requestPosition === pos ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                        {pos}
                        {POSITION_DESC[pos] && <span style={{ display: 'block', fontSize: '10px', color: '#9ca3af', marginTop: '2px', fontWeight: 400 }}>{POSITION_DESC[pos].desc.split(' ')[0]}</span>}
                      </button>
                    ))}
                  </div>
                  {requestPosition && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', fontSize: '12px', color: '#1e40af' }}>
                      <i className="fas fa-shield-alt" style={{ marginRight: '6px' }}></i>
                      <strong>'{requestPosition}'</strong> 신청 시 <strong>'{POSITION_DESC[requestPosition]?.role === 'admin' ? '편집장/관리자' : '기자'}'</strong> 권한이 승인 후 부여됩니다.
                    </div>
                  )}
                  <button type="button" onClick={handleRequest} disabled={!requestPosition || requesting}
                    style={{ width: '100%', padding: '10px 0', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#fff', background: (!requestPosition || requesting) ? '#9ca3af' : '#003580', cursor: (!requestPosition || requesting) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {requesting && <i className="fas fa-spinner fa-spin" style={{ fontSize: '11px' }}></i>}
                    {requesting ? '신청 중...' : '편집장에게 직책 신청'}
                  </button>
                </div>
              )}
            </div>
          </div>


          {/* ── 실명 인증 섹션 (독자만) ── */}
          {isReader && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '10px', letterSpacing: '0.3px' }}>
                실명 인증 <span style={{ fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}>(댓글 작성 권한)</span>
              </label>

              {verifiedStatus === 'approved' ? (
                <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-check-circle" style={{ color: '#065f46', fontSize: '16px' }}></i>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>실명 인증 완료</p>
                    <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      {verifiedType === 'student' ? '학생' : verifiedType === 'professor' ? '교수' : '교직원'} · 댓글 작성 가능
                    </p>
                  </div>
                </div>
              ) : verifiedStatus === 'pending' ? (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-clock" style={{ color: '#92400e', fontSize: '16px' }}></i>
                  <p style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>실명 인증 심사 중입니다. 편집장 승인 후 댓글을 작성할 수 있습니다.</p>
                </div>
              ) : (
                <div>
                  {/* 유형 선택 */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {[['student','학생(졸업생 포함)'],['professor','교수'],['staff','교직원']].map(([k, lbl]) => (
                      <button key={k} type="button"
                        onClick={() => setVerifiedForm(p => ({...p, verified_type: k}))}
                        style={{ flex: 1, padding: '7px 0', border: `1.5px solid ${verifiedForm.verified_type === k ? '#003580' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '12px', fontWeight: verifiedForm.verified_type === k ? 700 : 500, color: verifiedForm.verified_type === k ? '#003580' : '#6b7280', background: verifiedForm.verified_type === k ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    <input placeholder="실명 (성명)" value={verifiedForm.real_name} onChange={e => setVerifiedForm(p => ({...p, real_name: e.target.value}))}
                      style={{ padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor='#003580'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
                    <input placeholder={verifiedForm.verified_type === 'student' ? '학과' : '학과(부서)'} value={verifiedForm.department} onChange={e => setVerifiedForm(p => ({...p, department: e.target.value}))}
                      style={{ padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor='#003580'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
                    <input placeholder={verifiedForm.verified_type === 'student' ? '학번 (8자리)' : '교번'} value={verifiedForm.id_number} onChange={e => setVerifiedForm(p => ({...p, id_number: e.target.value}))}
                      style={{ padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor='#003580'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#92400e', marginBottom: '10px' }}>
                    실명 사용자 중복 발생 또는 댓글로 인한 문제 발생 시 별도 인증 절차가 진행될 수 있습니다.
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#374151', cursor: 'pointer', marginBottom: '10px' }}>
                    <input type="checkbox" checked={verifiedForm.agreed} onChange={e => setVerifiedForm(p => ({...p, agreed: e.target.checked}))} style={{ marginTop: '2px', accentColor: '#003580' }} />
                    <span>[필수] 개인정보(이름, 학과, 학번)를 대진대학교 신문사에 제공하며, 실명 인증 목적으로만 사용됨에 동의합니다.</span>
                  </label>

                  {verifyError && <p style={{ fontSize: '12px', color: '#d32f2f', marginBottom: '8px' }}>{verifyError}</p>}

                  <button type="button" onClick={handleVerify} disabled={verifying}
                    style={{ width: '100%', padding: '9px 0', background: verifying ? '#9ca3af' : '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: verifying ? 'not-allowed' : 'pointer' }}>
                    {verifying ? '신청 중...' : '실명 인증 신청'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 저장/취소 버튼 */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '11px 0', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#6b7280', background: '#fff', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.background = '#f9fafb'} onMouseLeave={e => e.target.style.background = '#fff'}>
              취소
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: '11px 0', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, color: '#fff', background: saving ? '#9ca3af' : '#003580', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseEnter={e => { if (!saving) e.target.style.background = '#002468'; }} onMouseLeave={e => { if (!saving) e.target.style.background = '#003580'; }}>
              {saving && <i className="fas fa-spinner fa-spin" style={{ fontSize: '12px' }}></i>}
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileModal;
