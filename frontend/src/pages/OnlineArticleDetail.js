import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API     = '/api';
const BACKEND = '';

function stripHtml(html) {
  if (!html) return '';
  const d = document.createElement('DIV');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function editStyle(extra = {}) {
  return {
    width: '100%', padding: '8px 12px',
    border: '1.5px solid #003580', borderRadius: '6px',
    fontSize: '14px', outline: 'none',
    fontFamily: 'inherit', background: '#fff',
    boxSizing: 'border-box', ...extra,
  };
}

function ArticleBody({ text }) {
  if (!text) return null;
  return (
    <div style={{ fontSize: '16px', lineHeight: 2, color: '#1f2937', marginBottom: '32px' }}>
      {text.split('\n').map((line, i) =>
        line.trim()
          ? <p key={i} style={{ marginBottom: '12px' }}>{line}</p>
          : <br key={i} />
      )}
    </div>
  );
}

export default function OnlineArticleDetail() {
  const { id: articleId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  const [article, setArticle]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm]         = useState({
    title: '', subtitle: '', body: '',
    caption1: '', caption2: '',
    reporter_name: '', reporter_email: '',
  });
  const [photo1Preview, setPhoto1Preview] = useState(null);
  const [photo2Preview, setPhoto2Preview] = useState(null);
  const [photo1Portrait, setPhoto1Portrait] = useState(false);
  const [photo2Portrait, setPhoto2Portrait] = useState(false);

  const token   = localStorage.getItem('dju_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchArticle = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    axios.get(`${API}/online-articles/public/${articleId}`)
      .then(res => {
        const a = res.data.article;
        setArticle(a);
        setForm({
          title:          stripHtml(a.title          || ''),
          subtitle:       stripHtml(a.subtitle        || ''),
          body:           a.body                      || '',
          caption1:       stripHtml(a.caption1        || ''),
          caption2:       stripHtml(a.caption2        || ''),
          reporter_name:  a.reporter_name             || '',
          reporter_email: a.reporter_email            || '',
        });
        setPhoto1Preview(a.photo1_url ? BACKEND + a.photo1_url : null);
        setPhoto2Preview(a.photo2_url ? BACKEND + a.photo2_url : null);
      })
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0 });
  }, [articleId]);

  useEffect(() => { fetchArticle(); }, [fetchArticle]);

  // ── 편집 모드 ──────────────────────────────────────────────
  const startEdit = () => setEditMode(true);
  const cancelEdit = () => {
    setEditMode(false);
    if (article) {
      setForm({
        title:          stripHtml(article.title          || ''),
        subtitle:       stripHtml(article.subtitle        || ''),
        body:           article.body                      || '',
        caption1:       stripHtml(article.caption1        || ''),
        caption2:       stripHtml(article.caption2        || ''),
        reporter_name:  article.reporter_name             || '',
        reporter_email: article.reporter_email            || '',
      });
      setPhoto1Preview(article.photo1_url ? BACKEND + article.photo1_url : null);
      setPhoto2Preview(article.photo2_url ? BACKEND + article.photo2_url : null);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert('제목을 입력해주세요.'); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/online-articles/admin/${articleId}/edit`, form, { headers });
      await fetchArticle();
      setEditMode(false);
    } catch (err) {
      alert(err.response?.data?.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e, slot) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('slot', slot);
    try {
      const res = await axios.post(`${API}/online-articles/${articleId}/upload`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      if (slot === 'photo1') setPhoto1Preview(BACKEND + res.data.url);
      else                   setPhoto2Preview(BACKEND + res.data.url);
    } catch {
      alert('사진 업로드 실패');
    }
  };

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', color: '#9ca3af' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px' }}></i>
        <p style={{ fontSize: '14px' }}>기사를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#9ca3af' }}>
        <i className="fas fa-file-slash" style={{ fontSize: '48px', color: '#d1d5db' }}></i>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#374151' }}>기사를 찾을 수 없습니다</h2>
        <p style={{ fontSize: '14px' }}>아직 승인되지 않았거나 삭제된 기사입니다.</p>
        <button onClick={() => navigate('/')} style={{ padding: '10px 24px', background: '#003580', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const title    = editMode ? form.title    : stripHtml(article.title);
  const subtitle = editMode ? form.subtitle : stripHtml(article.subtitle);
  const body     = editMode ? form.body     : article.body;
  const caption1 = editMode ? form.caption1 : stripHtml(article.caption1);
  const caption2 = editMode ? form.caption2 : stripHtml(article.caption2);

  return (
    <div>
      {/* ── 어드민 즉시수정 툴바 ── */}
      {isAdmin && editMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#1a2238', borderBottom: '2px solid #FFD700', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#FFD700', fontWeight: 900, fontSize: '13px' }}>
            <i className="fas fa-pen" style={{ marginRight: '7px' }}></i>온라인 기사 즉시 수정 모드
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={cancelEdit} style={{ padding: '6px 16px', border: '1px solid #4b5563', borderRadius: '6px', background: 'none', color: '#9ca3af', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              취소
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '6px 20px', border: 'none', borderRadius: '6px', background: '#FFD700', color: '#111', fontSize: '13px', fontWeight: 900, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* ── 브레드크럼 ── */}
      <div className="article-breadcrumb" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 0', marginTop: editMode ? '52px' : 0 }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 clamp(12px, 4vw, 24px)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9ca3af' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>홈</span>
          <i className="fas fa-chevron-right" style={{ fontSize: '9px' }}></i>
          <span style={{ cursor: 'pointer', color: '#003580', fontWeight: 700 }}>온라인 기사</span>
        </div>
      </div>

      <article className="article-wrapper" style={{ maxWidth: '820px', margin: '0 auto', padding: '36px 24px 80px', background: 'transparent' }}>

        {/* ── 카테고리 배지 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <span style={{ display: 'inline-block', background: '#003580', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '4px 12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            ONLINE
          </span>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>온라인 단독</span>
        </div>

        {/* ── 제목 ── */}
        {editMode ? (
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="제목"
            style={editStyle({ fontSize: '26px', fontWeight: 900, marginBottom: '12px', padding: '10px 14px' })} />
        ) : (
          <h1 style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1.35, color: '#111', marginBottom: '14px', letterSpacing: '-0.5px' }}>{title}</h1>
        )}

        {/* ── 부제목 ── */}
        {editMode ? (
          <input type="text" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
            placeholder="부제목 (선택)"
            style={editStyle({ fontSize: '17px', marginBottom: '24px' })} />
        ) : (
          subtitle && (
            <p style={{ fontSize: '18px', color: '#4b5563', lineHeight: 1.65, borderLeft: '3px solid #d32f2f', paddingLeft: '14px', marginBottom: '24px', fontWeight: 500 }}>
              {subtitle}
            </p>
          )
        )}

        {/* ── 메타 바 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '12px 0', borderTop: '2px solid #111', borderBottom: '1px solid #e5e7eb', marginBottom: '32px' }}>
          {editMode ? (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', display: 'block', marginBottom: '4px' }}>기자 이름</label>
                <input type="text" value={form.reporter_name} onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))} style={editStyle({ fontSize: '13px', padding: '6px 10px' })} />
              </div>
              <div style={{ flex: 2, minWidth: '180px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', display: 'block', marginBottom: '4px' }}>이메일</label>
                <input type="email" value={form.reporter_email} onChange={e => setForm(f => ({ ...f, reporter_email: e.target.value }))} style={editStyle({ fontSize: '13px', padding: '6px 10px' })} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', color: '#6b7280' }}>
                {article.reporter_name && (
                  <span style={{ fontWeight: 700, color: '#111' }}>
                    <i className="fas fa-pencil-alt" style={{ marginRight: '5px', color: '#003580' }}></i>
                    {article.reporter_name} 기자
                  </span>
                )}
                <span><i className="far fa-calendar" style={{ marginRight: '5px' }}></i>{formatDate(article.approved_at)}</span>
                {article.revised_at && (
                  <span style={{ color: '#d32f2f' }}>
                    <i className="fas fa-edit" style={{ marginRight: '4px' }}></i>
                    {formatDate(article.revised_at)} 수정
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── 사진 1 ── */}
        {(photo1Preview || editMode) && (
          <figure style={{ margin: '0 0 28px', padding: 0 }}>
            {photo1Preview ? (
              <img src={photo1Preview} alt={caption1 || title}
                onLoad={e => { setPhoto1Portrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth); }}
                style={{
                  width: '100%',
                  ...(photo1Portrait ? { objectFit: 'contain', background: '#f9fafb', maxHeight: 'none' } : { objectFit: 'cover', maxHeight: '500px' }),
                  display: 'block', border: editMode ? '2px dashed #003580' : 'none',
                }} />
            ) : editMode ? (
              <div style={{ width: '100%', height: '180px', background: '#eff6ff', border: '2px dashed #003580', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003580', fontSize: '14px', borderRadius: '4px' }}>
                <i className="fas fa-image" style={{ marginRight: '8px' }}></i>사진1 없음
              </div>
            ) : null}
            {editMode ? (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: '#003580', color: '#fff', fontSize: '12px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}>
                  <i className="fas fa-camera"></i> 사진1 교체
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, 'photo1')} />
                </label>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', display: 'block', marginBottom: '4px' }}>사진1 캡션</label>
                  <input type="text" value={form.caption1} onChange={e => setForm(f => ({ ...f, caption1: e.target.value }))}
                    placeholder="사진 설명을 입력하세요"
                    style={editStyle({ fontSize: '12px', padding: '6px 10px' })} />
                </div>
              </div>
            ) : (
              caption1 && (
                <figcaption style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', lineHeight: 1.6, borderLeft: '2px solid #d1d5db', paddingLeft: '10px' }}>{caption1}</figcaption>
              )
            )}
          </figure>
        )}

        {/* ── 본문 ── */}
        {editMode ? (
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={20} placeholder="본문"
            style={editStyle({ resize: 'vertical', lineHeight: 1.85, marginBottom: '24px', fontSize: '15px' })} />
        ) : (
          <ArticleBody text={body} />
        )}

        {/* ── 사진 2 ── */}
        {(photo2Preview || editMode) && (
          <figure style={{ margin: '0 0 28px', padding: 0 }}>
            {photo2Preview ? (
              <img src={photo2Preview} alt={caption2 || title}
                onLoad={e => setPhoto2Portrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth)}
                style={{
                  width: '100%',
                  ...(photo2Portrait ? { objectFit: 'contain', background: '#f9fafb', maxHeight: 'none' } : { objectFit: 'cover', maxHeight: '400px' }),
                  display: 'block', border: editMode ? '2px dashed #003580' : 'none',
                }} />
            ) : editMode ? (
              <div style={{ width: '100%', height: '120px', background: '#eff6ff', border: '2px dashed #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '13px', borderRadius: '4px' }}>
                <i className="fas fa-image" style={{ marginRight: '8px' }}></i>사진2 없음 (선택)
              </div>
            ) : null}
            {editMode && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: '#4b5563', color: '#fff', fontSize: '12px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}>
                  <i className="fas fa-camera"></i> 사진2 교체
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, 'photo2')} />
                </label>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', display: 'block', marginBottom: '4px' }}>사진2 캡션</label>
                  <input type="text" value={form.caption2} onChange={e => setForm(f => ({ ...f, caption2: e.target.value }))}
                    placeholder="사진 설명을 입력하세요"
                    style={editStyle({ fontSize: '12px', padding: '6px 10px' })} />
                </div>
              </div>
            )}
            {!editMode && caption2 && (
              <figcaption style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', lineHeight: 1.6, borderLeft: '2px solid #d1d5db', paddingLeft: '10px' }}>{caption2}</figcaption>
            )}
          </figure>
        )}

        {/* ── 하단 바 ── */}
        <div style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <i className="fas fa-home"></i> 홈으로
          </button>

          {isAdmin && !editMode && (
            <button onClick={startEdit}
              style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 1000, padding: '14px 22px', background: '#003580', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,53,128,0.35)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-pen"></i> 기사 즉시 수정
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
