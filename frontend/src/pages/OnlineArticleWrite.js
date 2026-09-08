import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = `http://${window.location.hostname}:5000/api`;
const BACKEND = `http://${window.location.hostname}:5000`;

const STATUS_LABEL = {
  draft:    { text: '임시저장', bg: '#f3f4f6', color: '#6b7280', icon: 'fas fa-save' },
  pending:  { text: '컨펌 요청 중', bg: '#fef3c7', color: '#92400e', icon: 'fas fa-clock' },
  approved: { text: '게재 중', bg: '#d1fae5', color: '#065f46', icon: 'fas fa-check-circle' },
  rejected: { text: '반려됨', bg: '#fee2e2', color: '#991b1b', icon: 'fas fa-times-circle' },
};

function OnlineArticleWrite() {
  const { id: articleId } = useParams(); // edit mode if id exists
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [article, setArticle]     = useState(null);
  const [form, setForm]           = useState({
    title: '', subtitle: '', body: '',
    caption1: '', caption2: '',
    reporter_name: '', reporter_email: '',
  });
  const [photo1Preview, setPhoto1Preview] = useState(null);
  const [photo2Preview, setPhoto2Preview] = useState(null);
  const [photo1Portrait, setPhoto1Portrait] = useState(false);
  const [photo2Portrait, setPhoto2Portrait] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(!!articleId);

  const token = localStorage.getItem('dju_token');
  const headers = { Authorization: `Bearer ${token}` };

  // ── 기사 불러오기 (수정 모드) ────────────────────────────────
  const fetchArticle = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    try {
      const endpoint = user?.role === 'admin'
        ? `${API}/online-articles/admin/article/${articleId}`
        : `${API}/online-articles/mine/${articleId}`;
      const res = await axios.get(endpoint, { headers });
      const a = res.data.article;
      setArticle(a);
      setForm({
        title:          a.title          || '',
        subtitle:       a.subtitle        || '',
        body:           a.body            || '',
        caption1:       a.caption1        || '',
        caption2:       a.caption2        || '',
        reporter_name:  a.reporter_name   || '',
        reporter_email: a.reporter_email  || '',
      });
      setPhoto1Preview(a.photo1_url ? BACKEND + a.photo1_url : null);
      setPhoto2Preview(a.photo2_url ? BACKEND + a.photo2_url : null);
    } catch {
      showToast('기사를 불러올 수 없습니다.', 'error');
      navigate('/write');
    } finally {
      setLoading(false);
    }
  }, [articleId, user]);

  useEffect(() => {
    if (!user || !['admin','reporter'].includes(user.role)) { navigate('/'); return; }
    if (articleId) {
      fetchArticle();
    } else {
      setForm(f => ({
        ...f,
        reporter_name:  user.name  || '',
        reporter_email: user.email || '',
      }));
    }
  }, [user, articleId]);

  // ── 임시저장 ─────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      let res;
      if (articleId) {
        res = await axios.put(`${API}/online-articles/${articleId}`, form, { headers });
      } else {
        res = await axios.post(`${API}/online-articles`, form, { headers });
        navigate(`/write/online/${res.data.article.id}`, { replace: true });
      }
      setArticle(res.data.article);
      showToast('임시저장되었습니다.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || '저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── 컨펌 요청 ─────────────────────────────────────────────────
  const handleRequestConfirm = async () => {
    if (!form.title.trim()) { showToast('제목을 입력해주세요.', 'error'); return; }
    if (!window.confirm('편집장에게 컨펌을 요청하시겠습니까?')) return;
    setSaving(true);
    try {
      let res;
      if (articleId) {
        res = await axios.put(`${API}/online-articles/${articleId}`, { ...form, action: 'request_confirm' }, { headers });
      } else {
        // 새 기사: 먼저 생성 후 컨펌 요청
        const createRes = await axios.post(`${API}/online-articles`, form, { headers });
        const newId = createRes.data.article.id;
        res = await axios.put(`${API}/online-articles/${newId}`, { ...form, action: 'request_confirm' }, { headers });
        navigate(`/write/online/${newId}`, { replace: true });
      }
      setArticle(res.data.article);
      showToast('컨펌 요청이 완료되었습니다.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || '요청 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── 사진 업로드 ──────────────────────────────────────────────
  const handlePhotoUpload = async (e, slot) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!articleId && !article?.id) {
      showToast('먼저 기사를 임시저장해주세요.', 'info');
      return;
    }
    const id = articleId || article?.id;
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('slot', slot);
    try {
      const res = await axios.post(`${API}/online-articles/${id}/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      if (slot === 'photo1') setPhoto1Preview(BACKEND + res.data.url);
      else                   setPhoto2Preview(BACKEND + res.data.url);
      showToast('사진이 업로드되었습니다.', 'success');
    } catch {
      showToast('사진 업로드 실패', 'error');
    }
  };

  if (!user || !['admin','reporter'].includes(user.role)) return null;

  const st = article ? (STATUS_LABEL[article.status] || STATUS_LABEL.draft) : null;
  const canEdit = !article
    || ['draft','rejected'].includes(article.status)
    || (article.status === 'approved' && user.role === 'admin')
    || (article.status === 'approved' && article.reporter_id === user.id);
  const isPending = article?.status === 'pending';

  const inputStyle = (extra = {}) => ({
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: '8px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', background: canEdit ? '#fff' : '#f9fafb',
    ...extra,
  });

  return (
    <main style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* ── 상단 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/write')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-arrow-left"></i> 내 기사 목록
          </button>
          <div style={{ width: '1px', height: '18px', background: '#e5e7eb' }}></div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#111', margin: 0 }}>
              {articleId ? '온라인 기사 수정' : '온라인 기사 작성'}
            </h1>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>
              지면과 무관하게 DJU Quick-News 패널에 직접 게재됩니다.
            </p>
          </div>
        </div>
        {st && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: st.bg, color: st.color }}>
            <i className={st.icon}></i> {st.text}
          </span>
        )}
      </div>

      {/* ── 반려 메모 ── */}
      {article?.status === 'rejected' && article.admin_note && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#991b1b', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <i className="fas fa-times-circle" style={{ marginTop: '2px', flexShrink: 0 }}></i>
          <div>
            <p style={{ fontWeight: 700, marginBottom: '2px' }}>편집장 반려 메모</p>
            <p>{article.admin_note}</p>
          </div>
        </div>
      )}

      {/* ── 컨펌 대기 안내 ── */}
      {isPending && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px 18px', marginBottom: '20px', fontSize: '13px', color: '#92400e', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <i className="fas fa-clock" style={{ flexShrink: 0 }}></i>
          편집장의 컨펌을 기다리는 중입니다. 이 기간에는 내용을 수정할 수 없습니다.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', display: 'block', marginBottom: '12px' }}></i>
          불러오는 중...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── 제목 ── */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>
              제목 <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              disabled={!canEdit || isPending}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="기사 제목을 입력하세요"
              style={inputStyle({ fontSize: '18px', fontWeight: 700, padding: '12px 16px' })}
              onFocus={e => e.target.style.borderColor = '#003580'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* ── 부제목 ── */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>부제목</label>
            <input
              type="text"
              value={form.subtitle}
              disabled={!canEdit || isPending}
              onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
              placeholder="부제목 (선택)"
              style={inputStyle()}
              onFocus={e => e.target.style.borderColor = '#003580'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* ── 본문 ── */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>본문</label>
            <textarea
              value={form.body}
              disabled={!canEdit || isPending}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="기사 본문을 입력하세요. 분량 제한이 없습니다."
              rows={16}
              style={inputStyle({ resize: 'vertical', lineHeight: 1.85 })}
              onFocus={e => e.target.style.borderColor = '#003580'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* ── 사진 1 ── */}
          <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '16px', background: '#fafafa' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '10px' }}>
              <i className="fas fa-camera" style={{ marginRight: '6px', color: '#003580' }}></i>사진 1 (선택)
            </label>
            {photo1Preview ? (
              <div>
                <img
                  src={photo1Preview}
                  alt="사진1"
                  onLoad={e => setPhoto1Portrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth)}
                  style={{
                    width: '100%',
                    ...(photo1Portrait ? { objectFit: 'contain', maxHeight: 'none', background: '#f9fafb' } : { objectFit: 'cover', maxHeight: '360px' }),
                    borderRadius: '6px', display: 'block', marginBottom: '10px',
                  }}
                />
                {(canEdit && !isPending) && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#003580', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    <i className="fas fa-camera"></i> 교체
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, 'photo1')} />
                  </label>
                )}
              </div>
            ) : (
              (canEdit && !isPending) && (
                <label style={{ display: 'block', border: '2px dashed #d1d5db', borderRadius: '8px', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#003580'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#d1d5db'}>
                  <i className="fas fa-upload" style={{ fontSize: '20px', marginBottom: '6px' }}></i>
                  <span style={{ fontSize: '13px' }}>클릭하여 사진 업로드</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, 'photo1')} />
                </label>
              )
            )}
            {(canEdit && !isPending) && (
              <div style={{ marginTop: '10px' }}>
                <input type="text" value={form.caption1} onChange={e => setForm(f => ({ ...f, caption1: e.target.value }))}
                  placeholder="사진 1 캡션 (선택)"
                  style={inputStyle({ fontSize: '13px', marginTop: photo1Preview ? '0' : '8px' })}
                  onFocus={e => e.target.style.borderColor = '#003580'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            )}
          </div>

          {/* ── 사진 2 ── */}
          <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '16px', background: '#fafafa' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '10px' }}>
              <i className="fas fa-camera" style={{ marginRight: '6px', color: '#6b7280' }}></i>사진 2 (선택)
            </label>
            {photo2Preview ? (
              <div>
                <img
                  src={photo2Preview}
                  alt="사진2"
                  onLoad={e => setPhoto2Portrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth)}
                  style={{
                    width: '100%',
                    ...(photo2Portrait ? { objectFit: 'contain', maxHeight: 'none', background: '#f9fafb' } : { objectFit: 'cover', maxHeight: '320px' }),
                    borderRadius: '6px', display: 'block', marginBottom: '10px',
                  }}
                />
                {(canEdit && !isPending) && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#4b5563', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    <i className="fas fa-camera"></i> 교체
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, 'photo2')} />
                  </label>
                )}
              </div>
            ) : (
              (canEdit && !isPending) && (
                <label style={{ display: 'flex', border: '2px dashed #d1d5db', borderRadius: '8px', height: '100px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#6b7280'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#d1d5db'}>
                  <i className="fas fa-upload" style={{ fontSize: '18px', marginBottom: '5px' }}></i>
                  <span style={{ fontSize: '12px' }}>사진 2 업로드</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, 'photo2')} />
                </label>
              )
            )}
            {(canEdit && !isPending) && (
              <div style={{ marginTop: '10px' }}>
                <input type="text" value={form.caption2} onChange={e => setForm(f => ({ ...f, caption2: e.target.value }))}
                  placeholder="사진 2 캡션 (선택)"
                  style={inputStyle({ fontSize: '13px' })}
                  onFocus={e => e.target.style.borderColor = '#003580'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            )}
          </div>

          {/* ── 기자 정보 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>기자 이름</label>
              <input type="text" value={form.reporter_name} onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                disabled={!canEdit || isPending}
                style={inputStyle()}
                onFocus={e => e.target.style.borderColor = '#003580'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>기자 이메일</label>
              <input type="email" value={form.reporter_email} onChange={e => setForm(f => ({ ...f, reporter_email: e.target.value }))}
                disabled={!canEdit || isPending}
                style={inputStyle()}
                onFocus={e => e.target.style.borderColor = '#003580'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* ── 하단 버튼 ── */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
            {(canEdit && !isPending) && (
              <>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '11px 24px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: 700, color: '#374151', background: '#fff', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <i className="fas fa-save"></i>
                  {saving ? '저장 중...' : (article?.status === 'approved' ? '수정 저장' : '임시저장')}
                </button>
                <button onClick={handleRequestConfirm} disabled={saving}
                  style={{ padding: '11px 28px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, color: '#fff', background: saving ? '#9ca3af' : '#003580', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px', flex: 1 }}>
                  <i className="fas fa-paper-plane"></i>
                  {article?.status === 'approved' ? '수정 후 컨펌 재요청' : '편집장에게 컨펌 요청'}
                </button>
              </>
            )}
          </div>

        </div>
      )}
    </main>
  );
}

export default OnlineArticleWrite;
