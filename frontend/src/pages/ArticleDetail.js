import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';

const API     = `http://${window.location.hostname}:5000/api`;
const BACKEND = `http://${window.location.hostname}:5000`;

/* ── 유틸 ── */
function stripHtml(html) {
  if (!html) return '';
  const d = document.createElement('DIV');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function avgReadTime(total, count) {
  if (!count) return null;
  const sec = Math.round(total / count);
  if (sec < 60) return `${sec}초`;
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

/* ── 섹션 카테고리 색상 ── */
const CAT_MAP = [
  { key: '문화면',     label: '문화',       color: '#c62828' },
  { key: '칼럼',       label: '특집',   color: '#6a1b9a' },
  { key: '기자한마디', label: '기자한마디', color: '#283593' },
  { key: '조명탑',     label: '오피니언',   color: '#e65100' },
  { key: '기획',       label: '기획',       color: '#00695c' },
  { key: '지역사회',   label: '지역사회',   color: '#2e7d32' },
  { key: '1면',        label: '학생자치',   color: '#1565c0' },
  { key: '2면',        label: '학술',       color: '#1b5e20' },
];
function getCategory(sectionKey) {
  if (!sectionKey) return { label: '대학뉴스', color: '#003580' };
  for (const c of CAT_MAP) if (sectionKey.includes(c.key)) return c;
  return { label: '대학뉴스', color: '#003580' };
}

/* ── 인라인 텍스트에어리어 스타일 헬퍼 ── */
function editStyle(base = {}) {
  return {
    width: '100%',
    border: '1.5px solid #003580',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    lineHeight: 'inherit',
    color: 'inherit',
    background: '#eff6ff',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    ...base,
  };
}

/* ════════════════════════════════════════════════════
   ArticleDetail 컴포넌트
════════════════════════════════════════════════════ */
export default function ArticleDetail() {
  const { articleId } = useParams();
  const navigate      = useNavigate();
  const { isAdmin }   = useAuth();

  const [article, setArticle]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  /* ── 편집 모드 상태 ── */
  const [editMode, setEditMode]   = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [form, setForm] = useState({
    title: '', subtitle: '', body: '',
    caption1: '', caption2: '',
    reporter_name: '', reporter_email: '',
  });
  const [photo1Preview, setPhoto1Preview] = useState(null);
  const [photo2Preview, setPhoto2Preview] = useState(null);
  const [photo1Portrait, setPhoto1Portrait] = useState(false);
  const [photo2Portrait, setPhoto2Portrait] = useState(false);

  const enterTime    = useRef(Date.now());
  const sentReadTime = useRef(false);

  /* ── 기사 불러오기 ── */
  const fetchArticle = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    enterTime.current  = Date.now();
    sentReadTime.current = false;
    axios.get(`${API}/articles/${articleId}/public`)
      .then(res => {
        const a = res.data.article;
        setArticle(a);
        setForm({
          title:          stripHtml(a.title       || ''),
          subtitle:       stripHtml(a.subtitle     || ''),
          body:           stripHtml(a.body         || ''),
          caption1:       stripHtml(a.caption1     || ''),
          caption2:       stripHtml(a.caption2     || ''),
          reporter_name:  a.reporter_name  || '',
          reporter_email: a.reporter_email || '',
        });
        setPhoto1Preview(a.photo1_url ? BACKEND + a.photo1_url : null);
        setPhoto2Preview(a.photo2_url ? BACKEND + a.photo2_url : null);
        // 기자/편집장 제외하고 조회수 카운트
        const token = localStorage.getItem('dju_token');
        axios.post(`${API}/articles/${articleId}/view`, {}, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).catch(() => {});
      })
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0 });
  }, [articleId]);

  useEffect(() => { fetchArticle(); }, [fetchArticle]);

  /* ── 체류시간 ── */
  const sendReadTime = useCallback(() => {
    if (sentReadTime.current) return;
    sentReadTime.current = true;
    const seconds = (Date.now() - enterTime.current) / 1000;
    if (seconds >= 3) {
      const url  = `${API}/articles/${articleId}/read-time`;
      const data = JSON.stringify({ seconds });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
      } else {
        axios.post(url, { seconds }).catch(() => {});
      }
    }
  }, [articleId]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') sendReadTime(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', sendReadTime);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', sendReadTime);
      sendReadTime();
    };
  }, [sendReadTime]);

  /* ── 편집 모드 토글 ── */
  const startEdit = () => setEditMode(true);
  const cancelEdit = () => {
    if (!window.confirm('수정을 취소하시겠습니까? 변경사항이 사라집니다.')) return;
    // 원본으로 복원
    if (article) {
      setForm({
        title:          stripHtml(article.title       || ''),
        subtitle:       stripHtml(article.subtitle     || ''),
        body:           stripHtml(article.body         || ''),
        caption1:       stripHtml(article.caption1     || ''),
        caption2:       stripHtml(article.caption2     || ''),
        reporter_name:  article.reporter_name  || '',
        reporter_email: article.reporter_email || '',
      });
      setPhoto1Preview(article.photo1_url ? BACKEND + article.photo1_url : null);
      setPhoto2Preview(article.photo2_url ? BACKEND + article.photo2_url : null);
    }
    setEditMode(false);
  };

  /* ── 사진 업로드 ── */
  const handlePhotoUpload = async (e, slot) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('slot', slot);
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.post(`${API}/articles/${article.id}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      if (slot === 'photo1') setPhoto1Preview(BACKEND + res.data.url);
      else setPhoto2Preview(BACKEND + res.data.url);
    } catch {
      alert('사진 업로드에 실패했습니다.');
    }
  };

  /* ── 저장 ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(`${API}/articles/${article.id}/admin-edit`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditMode(false);
      fetchArticle();
    } catch (err) {
      alert(err.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
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

  /* ── 404 ── */
  if (notFound || !article) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#9ca3af' }}>
        <i className="fas fa-file-slash" style={{ fontSize: '48px', color: '#d1d5db' }}></i>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#374151' }}>기사를 찾을 수 없습니다</h2>
        <p style={{ fontSize: '14px' }}>아직 승인되지 않았거나 삭제된 기사입니다.</p>
        <button onClick={() => navigate('/')}
          style={{ marginTop: '8px', padding: '10px 24px', background: '#003580', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}>
          ← 메인으로 돌아가기
        </button>
      </div>
    );
  }

  const cat       = getCategory(article.section_key);
  const title     = editMode ? form.title     : stripHtml(article.title);
  const subtitle  = editMode ? form.subtitle  : stripHtml(article.subtitle);
  const body      = editMode ? form.body      : stripHtml(article.body);
  const caption1  = editMode ? form.caption1  : stripHtml(article.caption1);
  const caption2  = editMode ? form.caption2  : stripHtml(article.caption2);
  const hasPhoto1 = !!article.photo1_url || !!photo1Preview;
  const hasPhoto2 = !!article.photo2_url || !!photo2Preview;
  const hasSubtitle = !!(subtitle) && article.has_subtitle;
  const hasBody     = !!(body) && article.has_body;
  const avgTime   = avgReadTime(article.read_time_total, article.read_time_count);

  return (
    <div style={{ background: '#f4f4f0', minHeight: '100vh' }}>

      {/* ── 편집장 플로팅 수정 버튼 ── */}
      {isAdmin && !editMode && (
        <button
          onClick={startEdit}
          style={{
            position: 'fixed', bottom: '32px', right: '32px', zIndex: 100,
            background: '#003580', color: '#fff',
            border: 'none', borderRadius: '50px',
            padding: '13px 22px',
            fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,53,128,0.35)',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'background 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#002468'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#003580'; e.currentTarget.style.transform = 'none'; }}
        >
          <i className="fas fa-pen"></i> 기사 즉시 수정
        </button>
      )}

      {/* ── 편집 모드 상단 고정 툴바 ── */}
      {isAdmin && editMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: '#1a2238', color: '#fff',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <i className="fas fa-pen" style={{ color: '#FFD700' }}></i>
            <span style={{ fontWeight: 700 }}>편집장 즉시 수정 모드</span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>— 저장 즉시 게시됩니다</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={cancelEdit}
              style={{ padding: '8px 18px', border: '1px solid #4b5563', borderRadius: '4px', background: 'none', color: '#d1d5db', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >취소</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 22px', border: 'none', borderRadius: '4px', background: '#d32f2f', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving && <i className="fas fa-spinner fa-spin"></i>}
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      )}

      {/* ── 브레드크럼 바 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 0', marginTop: editMode ? '52px' : 0 }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9ca3af' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#003580', fontSize: '12px', fontWeight: 600 }}>
            <i className="fas fa-home" style={{ marginRight: '4px' }}></i>메인
          </button>
          <span>›</span>
          <span style={{ color: cat.color, fontWeight: 700 }}>{cat.label}</span>
          <span>›</span>
          <span style={{ color: '#6b7280', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripHtml(article.title)}</span>
          {editMode && (
            <span style={{ marginLeft: '6px', background: '#d32f2f', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '3px', letterSpacing: '0.5px' }}>수정중</span>
          )}
        </div>
      </div>

      {/* ── 본문 래퍼 ── */}
      <article style={{ maxWidth: '820px', margin: '0 auto', padding: '36px 24px 80px', background: 'transparent' }}>

        {/* ── 카테고리 + 신문 호수 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <span style={{ display: 'inline-block', background: cat.color, color: '#fff', fontSize: '11px', fontWeight: 900, padding: '4px 12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {cat.label}
          </span>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            {article.newspaper_title} · {article.section_name}
          </span>
        </div>

        {/* ── 제목 ── */}
        {editMode ? (
          <div style={{ marginBottom: hasSubtitle ? '14px' : '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>제목</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={editStyle({ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 700, fontFamily: 'Noto Serif KR, Georgia, serif', letterSpacing: '-0.5px' })}
            />
          </div>
        ) : (
          <h1 style={{ fontFamily: 'Noto Serif KR, Georgia, serif', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.4, color: '#111', marginBottom: hasSubtitle ? '14px' : '24px', letterSpacing: '-0.5px' }}>
            {title || '(제목 없음)'}
          </h1>
        )}

        {/* ── 부제목 ── */}
        {(hasSubtitle || (editMode && article.has_subtitle)) && (
          editMode ? (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>부제목</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                style={editStyle({ fontSize: '16px' })}
              />
            </div>
          ) : (
            <p style={{ fontSize: '18px', color: '#4b5563', lineHeight: 1.65, borderLeft: '3px solid #d32f2f', paddingLeft: '14px', marginBottom: '24px', fontWeight: 500 }}>
              {subtitle}
            </p>
          )
        )}

        {/* ── 메타 정보 바 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '12px 0', borderTop: '2px solid #111', borderBottom: '1px solid #e5e7eb', marginBottom: '32px' }}>
          {editMode ? (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', display: 'block', marginBottom: '4px' }}>기자 이름</label>
                <input type="text" value={form.reporter_name} onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                  style={editStyle({ fontSize: '13px', padding: '6px 10px' })} />
              </div>
              <div style={{ flex: 2, minWidth: '220px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', display: 'block', marginBottom: '4px' }}>기자 이메일</label>
                <input type="email" value={form.reporter_email} onChange={e => setForm(f => ({ ...f, reporter_email: e.target.value }))}
                  style={editStyle({ fontSize: '13px', padding: '6px 10px' })} />
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
                <span><i className="far fa-calendar" style={{ marginRight: '5px' }}></i>{formatDate(article.publish_date || article.approved_at)}</span>
                {article.revised_at && (
                  <span style={{ color: '#d32f2f', fontWeight: 600 }}>
                    <i className="fas fa-pen" style={{ marginRight: '5px' }}></i>수정 {formatDate(article.revised_at)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                <span><i className="far fa-eye" style={{ marginRight: '4px' }}></i>{(article.view_count || 0).toLocaleString()}</span>
                {avgTime && <span><i className="far fa-clock" style={{ marginRight: '4px' }}></i>평균 {avgTime}</span>}
              </div>
            </>
          )}
        </div>

        {/* ── 사진 1 ── */}
        {(hasPhoto1 || editMode) && (
          <figure style={{ margin: '0 0 28px', padding: 0 }}>
            {photo1Preview ? (
              <img src={photo1Preview} alt={caption1 || title}
                onLoad={e => { const img = e.currentTarget; setPhoto1Portrait(img.naturalHeight > img.naturalWidth); }}
                style={{
                  width: '100%',
                  ...(photo1Portrait
                    ? { objectFit: 'contain', background: '#f9fafb', maxHeight: 'none' }
                    : { objectFit: 'cover', maxHeight: '500px' }),
                  display: 'block',
                  border: editMode ? '2px dashed #003580' : 'none',
                }} />
            ) : editMode ? (
              <div style={{ width: '100%', height: '180px', background: '#eff6ff', border: '2px dashed #003580', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003580', fontSize: '14px', borderRadius: '4px' }}>
                <i className="fas fa-image" style={{ marginRight: '8px' }}></i>사진 없음
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

        {/* ── 사진 2 (편집모드에서도 표시) ── */}
        {(hasPhoto2 || editMode) && (
          <figure style={{ margin: '0 0 28px', padding: 0 }}>
            {photo2Preview ? (
              <img src={photo2Preview} alt={caption2 || title}
                onLoad={e => { const img = e.currentTarget; setPhoto2Portrait(img.naturalHeight > img.naturalWidth); }}
                style={{
                  width: '100%',
                  ...(photo2Portrait
                    ? { objectFit: 'contain', background: '#f9fafb', maxHeight: 'none' }
                    : { objectFit: 'cover', maxHeight: '400px' }),
                  display: 'block',
                  border: editMode ? '2px dashed #003580' : 'none',
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
              <figcaption style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', lineHeight: 1.5 }}>{caption2}</figcaption>
            )}
          </figure>
        )}

        {/* ── 본문 ── */}
        {(hasBody || (editMode && article.has_body)) && (
          editMode ? (
            <div style={{ marginBottom: '32px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#003580', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>본문</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={18}
                style={editStyle({ fontSize: '16px', lineHeight: 1.9, minHeight: '320px' })}
              />
            </div>
          ) : (
            <ArticleBody text={body} />
          )
        )}

        {/* ── 편집 모드 안내 배너 ── */}
        {editMode && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <i className="fas fa-exclamation-triangle" style={{ marginTop: '2px', flexShrink: 0 }}></i>
            <div>
              <strong>즉시 수정 모드입니다.</strong> 저장하면 별도 컨펌 없이 기사에 바로 반영되며, <strong>수정일이 자동으로 기록</strong>됩니다.
              사진 교체 후 저장하면 새 사진이 즉시 표시됩니다.
            </div>
          </div>
        )}

        {/* ── 기사 하단 정보 ── */}
        <div style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#003580', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 900, flexShrink: 0 }}>
              {(editMode ? form.reporter_name : article.reporter_name)?.charAt(0) || '기'}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{(editMode ? form.reporter_name : article.reporter_name) || '기자'}</p>
              {(editMode ? form.reporter_email : article.reporter_email) && (
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{editMode ? form.reporter_email : article.reporter_email}</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {editMode && (
              <>
                <button onClick={cancelEdit}
                  style={{ padding: '9px 18px', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '2px' }}>
                  취소
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '9px 22px', border: 'none', background: '#d32f2f', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {saving && <i className="fas fa-spinner fa-spin"></i>}
                  저장하기
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/')}
              style={{ padding: '9px 22px', border: '1px solid #003580', background: 'none', color: '#003580', fontSize: '13px', fontWeight: 700, cursor: 'pointer', borderRadius: '2px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#003580'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#003580'; }}
            >
              ← 목록으로 돌아가기
            </button>
          </div>
        </div>
      </article>

      {/* ── 댓글 섹션 ── */}
      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '0 20px 60px' }}>
        <CommentSection articleId={articleId} articleType="newspaper" />
      </div>
    </div>
  );
}

/* ── 본문 렌더링 컴포넌트 ── */
function ArticleBody({ text }) {
  if (!text) return null;
  const paragraphs = text
    .split(/\n{2,}/)
    .flatMap(block => block.split(/\n/))
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div style={{ marginBottom: '32px' }}>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ fontSize: '16px', lineHeight: 1.9, color: '#1f2937', marginBottom: '18px', wordBreak: 'keep-all', overflowWrap: 'break-word', fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
          {para}
        </p>
      ))}
    </div>
  );
}

