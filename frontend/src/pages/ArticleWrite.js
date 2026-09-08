import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = `http://${window.location.hostname}:5000/api`;
const BACKEND = `http://${window.location.hostname}:5000`;

function calcManuscriptVolume(text) {
  if (!text) return 0;
  let count = 0;
  for (const ch of text) {
    if (/[\u3131-\uD7AF]/.test(ch)) count += 1;
    else if (/[a-zA-Z0-9]/.test(ch)) count += 0.5;
    else if (ch === ' ') count += 1;
    else if (ch === '\n') count += 0;
    else count += 1;
  }
  return Math.round((count / 200) * 10) / 10;
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function EditableField({ innerRef, initialHtml, onChange, placeholder, className, editable }) {
  const initialized = useRef(false);
  useEffect(() => {
    if (innerRef.current && !initialized.current) {
      innerRef.current.innerHTML = initialHtml || '';
      initialized.current = true;
    }
  }, [initialHtml, innerRef]);
  const handleInput = useCallback(() => {
    if (onChange) onChange(innerRef.current.innerHTML);
  }, [onChange, innerRef]);
  return (
    <div
      ref={innerRef}
      contentEditable={editable}
      onInput={handleInput}
      data-placeholder={placeholder}
      className={className}
      suppressContentEditableWarning
      style={{ minHeight: '1.5em' }}
    />
  );
}

/* 벌루툴팁: 삭선(빨간) 위에 hover 시 "지우기" 버튼, 파란 위에 hover 시 "추가하기" 버튼 */
function ConfirmTooltip({ children, type, onAction }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);
  const handleEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), 400);
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };
  return (
    <span
      className="relative inline"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {show && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAction(); setShow(false); }}
            className={`px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap shadow-lg ${type === 'strike' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            {type === 'strike' ? '지우기' : '추가하기'}
          </button>
        </span>
      )}
    </span>
  );
}

function ArticleWrite() {
  const { sectionId } = useParams();
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [titleText, setTitleText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [photo1Preview, setPhoto1Preview] = useState(null);
  const [photo2Preview, setPhoto2Preview] = useState(null);
  const [initTitle, setInitTitle] = useState('');
  const [initSubtitle, setInitSubtitle] = useState('');
  const [initBody, setInitBody] = useState('');
  const [initCaption1, setInitCaption1] = useState('');
  const [initCaption2, setInitCaption2] = useState('');
  const [confirmStarted, setConfirmStarted] = useState(false);
  const [confirmTargets, setConfirmTargets] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');

  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const bodyRef = useRef(null);
  const caption1Ref = useRef(null);
  const caption2Ref = useRef(null);
  const undoStack = useRef([]);
  const isAdmin = user && user.role === 'admin';
  const isReporter = user && user.role === 'reporter';
  // 편집장/부편집장이 본인이 담당하는 지면의 초고를 직접 쓰는 경우(작성자) vs 다른 사람의 기사를 검토하는 경우(검토자) 구분
  const isWriter = !!(article && user && article.assigned_reporter_id === user.id);
  const isReviewer = isAdmin && !isWriter;

  const pushUndo = useCallback(() => {
    undoStack.current.push({
      title: titleRef.current ? titleRef.current.innerHTML : '',
      subtitle: subtitleRef.current ? subtitleRef.current.innerHTML : '',
      body: bodyRef.current ? bodyRef.current.innerHTML : '',
      caption1: caption1Ref.current ? caption1Ref.current.innerHTML : '',
      caption2: caption2Ref.current ? caption2Ref.current.innerHTML : '',
    });
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, []);

  const performUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const snapshot = undoStack.current.pop();
    if (titleRef.current) titleRef.current.innerHTML = snapshot.title;
    if (subtitleRef.current) subtitleRef.current.innerHTML = snapshot.subtitle;
    if (bodyRef.current) bodyRef.current.innerHTML = snapshot.body;
    if (caption1Ref.current) caption1Ref.current.innerHTML = snapshot.caption1;
    if (caption2Ref.current) caption2Ref.current.innerHTML = snapshot.caption2;
    setTitleText(stripHtml(snapshot.title));
    setSubtitleText(stripHtml(snapshot.subtitle));
    setBodyText(stripHtml(snapshot.body));
    showToast('편집 수정이 취소되었습니다.', 'success');
  }, [showToast]);

  useEffect(() => {
    if (!isAdmin) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && undoStack.current.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        performUndo();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isAdmin, performUndo]);

  useEffect(() => {
    if (!user || !['admin', 'reporter'].includes(user.role)) {
      navigate('/');
      return;
    }
    fetchArticle();
    fetchConfirmTargets();
  }, [user, sectionId]);

  const fetchConfirmTargets = async () => {
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.get(API + '/articles/confirm-targets', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setConfirmTargets(res.data.targets || []);
    } catch (err) {
      setConfirmTargets([]);
    }
  };

  const fetchArticle = async () => {
    setLoading(true);
    // 이전 기사(다른 알림에서 넘어온 경우)의 잔사진/컨펌 상태가 남아있지 않도록 초기화
    setPhoto1Preview(null);
    setPhoto2Preview(null);
    setConfirmStarted(false);
    setSelectedTargetId('');
    undoStack.current = [];
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.get(API + '/articles/section/' + sectionId, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const a = res.data.article;
      setArticle(a);

      // 컨펌 완료 상태이고 confirm_content가 있으면 기자에게 컨펌 내용 표시
      if (a.status === 'confirmed' && a.confirm_content && isReporter) {
        const cc = typeof a.confirm_content === 'string' ? JSON.parse(a.confirm_content) : a.confirm_content;
        setInitTitle(cc.title || a.title || '');
        setInitSubtitle(cc.subtitle || a.subtitle || '');
        setInitBody(cc.body || a.body || '');
        setInitCaption1(cc.caption1 || a.caption1 || '');
        setInitCaption2(cc.caption2 || a.caption2 || '');
      } else {
        setInitTitle(a.title || '');
        setInitSubtitle(a.subtitle || '');
        setInitBody(a.body || '');
        setInitCaption1(a.caption1 || '');
        setInitCaption2(a.caption2 || '');
      }
      setTitleText(stripHtml(a.title || ''));
      setSubtitleText(stripHtml(a.subtitle || ''));
      setBodyText(stripHtml(a.body || ''));
      setReporterName(a.reporter_name || user.name || '');
      setReporterEmail(a.reporter_email || user.email || '');
      if (a.photo1_url) setPhoto1Preview(BACKEND + a.photo1_url);
      if (a.photo2_url) setPhoto2Preview(BACKEND + a.photo2_url);
      setConfirmStarted(a.status === 'confirming');
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '기사를 불러올 수 없습니다.', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const collectHtml = () => ({
    title: titleRef.current ? titleRef.current.innerHTML : '',
    subtitle: subtitleRef.current ? subtitleRef.current.innerHTML : '',
    body: bodyRef.current ? bodyRef.current.innerHTML : '',
    caption1: caption1Ref.current ? caption1Ref.current.innerHTML : '',
    caption2: caption2Ref.current ? caption2Ref.current.innerHTML : '',
  });

  /* === 기자 기능 === */
  const handleSave = async () => {
    setSaving(true);
    const html = collectHtml();
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.put(API + '/articles/' + article.id, {
        title: html.title, subtitle: html.subtitle, body: html.body,
        caption1: html.caption1, caption2: html.caption2,
        reporter_name: reporterName, reporter_email: reporterEmail,
      }, { headers: { Authorization: 'Bearer ' + token } });
      showToast('기사가 저장되었습니다.', 'success');
      // 승인 상태였던 경우 → 상태가 draft로 바뀌므로 새로고침
      if (res.data.wasApproved) fetchArticle();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '저장에 실패했습니다.', 'error');
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
      const token = localStorage.getItem('dju_token');
      const res = await axios.post(API + '/articles/' + article.id + '/upload', formData, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data' }
      });
      const url = BACKEND + res.data.url;
      if (slot === 'photo1') setPhoto1Preview(url);
      else setPhoto2Preview(url);
      showToast('사진이 업로드되었습니다.', 'success');
    } catch (err) {
      showToast('사진 업로드에 실패했습니다.', 'error');
    }
  };

  // 작성자: 최초 컨펌 요청
  const handleSubmitConfirm = async () => {
    if (!selectedTargetId) {
      showToast('컨펌을 요청할 편집장/부편집장을 선택해주세요.', 'error');
      return;
    }
    setSaving(true);
    const html = collectHtml();
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(API + '/articles/' + article.id, {
        title: html.title, subtitle: html.subtitle, body: html.body,
        caption1: html.caption1, caption2: html.caption2,
        reporter_name: reporterName, reporter_email: reporterEmail,
      }, { headers: { Authorization: 'Bearer ' + token } });
    } catch (err) {
      showToast('저장에 실패했습니다.', 'error');
      setSaving(false);
      return;
    }
    setSaving(false);
    setSubmitting(true);
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(API + '/articles/' + article.id + '/submit', { target_id: selectedTargetId }, {
        headers: { Authorization: 'Bearer ' + token }
      });
      showToast('컨펌 요청이 완료되었습니다!', 'success');
      fetchArticle();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '컨펌 요청에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 작성자: 컨펌 후 수정 완료 → 재컨펌 요청
  const handleResubmit = async () => {
    setSubmitting(true);
    const html = collectHtml();
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(API + '/articles/' + article.id + '/resubmit', {
        title: html.title, subtitle: html.subtitle, body: html.body,
        caption1: html.caption1, caption2: html.caption2,
        target_id: selectedTargetId || undefined,
      }, { headers: { Authorization: 'Bearer ' + token } });
      showToast('컨펌 재요청이 완료되었습니다!', 'success');
      fetchArticle();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '재요청에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* === 편집장 컨펌 기능 === */
  const applyStrike = useCallback(() => {
    if (!isReviewer) return;
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    pushUndo();
    if (!confirmStarted) {
      setConfirmStarted(true);
      // 컨펌 시작 API 호출
      const token = localStorage.getItem('dju_token');
      axios.put(API + '/articles/' + article.id + '/start-confirm', {}, {
        headers: { Authorization: 'Bearer ' + token }
      }).catch(() => {});
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.color = 'red';
    span.style.textDecoration = 'line-through';
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    setTitleText(stripHtml(titleRef.current ? titleRef.current.innerHTML : ''));
    setSubtitleText(stripHtml(subtitleRef.current ? subtitleRef.current.innerHTML : ''));
    setBodyText(stripHtml(bodyRef.current ? bodyRef.current.innerHTML : ''));
  }, [isReviewer, pushUndo, confirmStarted, article]);

  const applyAdd = useCallback(() => {
    if (!isReviewer) return;
    pushUndo();
    if (!confirmStarted) {
      setConfirmStarted(true);
      const token = localStorage.getItem('dju_token');
      axios.put(API + '/articles/' + article.id + '/start-confirm', {}, {
        headers: { Authorization: 'Bearer ' + token }
      }).catch(() => {});
    }
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.collapse(false);
    const span = document.createElement('span');
    span.style.color = 'blue';
    span.textContent = '\u200B';
    range.insertNode(span);
    const newRange = document.createRange();
    newRange.setStart(span.firstChild, 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    const editableParent = span.closest('[contenteditable]');
    if (editableParent) editableParent.focus();
  }, [isReviewer, pushUndo, confirmStarted, article]);

  const clearFormat = useCallback(() => {
    if (!isReviewer) return;
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    pushUndo();
    const range = sel.getRangeAt(0);
    const fragment = range.extractContents();
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
    const elements = [];
    while (walker.nextNode()) elements.push(walker.currentNode);
    elements.reverse().forEach(el => {
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      el.parentNode.removeChild(el);
    });
    range.insertNode(fragment);
    sel.removeAllRanges();
  }, [isReviewer, pushUndo]);

  // 편집장: 컨펌 완료
  const handleConfirmDone = async () => {
    setSaving(true);
    const html = collectHtml();
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(API + '/articles/' + article.id + '/confirm', {
        confirm_content: html
      }, { headers: { Authorization: 'Bearer ' + token } });
      showToast('컨펌이 완료되었습니다. 담당 기자에게 알림이 전송됩니다.', 'success');
      setConfirmStarted(false);
      fetchArticle();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '컨펌에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 편집장: 바로 승인
  const handleApprove = async () => {
    if (!window.confirm('이 기사를 바로 승인하시겠습니까?')) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(API + '/articles/' + article.id + '/approve', {}, {
        headers: { Authorization: 'Bearer ' + token }
      });
      showToast('기사가 승인되었습니다!', 'success');
      setConfirmStarted(false);
      fetchArticle();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '승인에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* === 기자 컨펌 수정 기능: 삭선 지우기 / 추가 반영 === */
  const handleRemoveStrike = useCallback((el) => {
    if (!el) return;
    el.remove();
    setTitleText(stripHtml(titleRef.current ? titleRef.current.innerHTML : ''));
    setSubtitleText(stripHtml(subtitleRef.current ? subtitleRef.current.innerHTML : ''));
    setBodyText(stripHtml(bodyRef.current ? bodyRef.current.innerHTML : ''));
  }, []);

  const handleAcceptAddition = useCallback((el) => {
    if (!el) return;
    el.style.color = 'inherit';
    el.style.textDecoration = 'none';
    // 제로폭 공백 제거
    el.textContent = el.textContent.replace(/\u200B/g, '');
    // unwrap
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.remove();
  }, []);

  if (loading) {
    return (
      <main key={sectionId} className="max-w-4xl mx-auto px-6 py-20 text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-3xl mb-4"></i>
        <p>불러오는 중...</p>
      </main>
    );
  }

  if (!article) return null;

  const sec = article;
  const isHancutDaejin = sec.section_key === '4면한컷대진';
  const currentVolume = calcManuscriptVolume(bodyText);
  const volumeDiff = sec.volume ? (currentVolume - sec.volume) : 0;
  const titleLen = titleText.length;
  const titleOverMax = sec.title_max_length && titleLen > sec.title_max_length;
  const titleUnderMin = sec.title_min_length && titleLen < sec.title_min_length && titleLen > 0;
  const subtitleLen = subtitleText.length;
  const subtitleOverMax = sec.subtitle_max_length && subtitleLen > sec.subtitle_max_length;
  const subtitleUnderMin = sec.subtitle_min_length && subtitleLen < sec.subtitle_min_length && subtitleLen > 0;

  // 상태별 편집 권한
  const status = article.status;
  const canReporterEdit = (isReporter || (isAdmin && isWriter)) && ['empty', 'draft', 'confirmed', 'approved'].includes(status);
  const canAdminEdit = isReviewer && ['submitted', 'confirming'].includes(status);
  const editable = canReporterEdit || canAdminEdit || (isReviewer && ['empty', 'draft'].includes(status));

  const volumeBarColor = Math.abs(volumeDiff) < 0.3 ? 'bg-green-500' : volumeDiff > 0 ? 'bg-red-500' : 'bg-yellow-500';
  const volumeBarWidth = sec.volume ? Math.min((currentVolume / sec.volume) * 100, 100) + '%' : '0%';

  const headerInfo = (sec.volume ? '원고 분량: 원고지 200자 기준 ' + sec.volume : '') +
    (sec.title_max_length ? ' | 제목 ' + sec.title_max_length + '자 이내' : '') +
    (sec.title_min_length ? ' | 제목 ' + sec.title_min_length + '자 이상' : '') +
    (sec.subtitle_max_length ? ' | 부제목 ' + sec.subtitle_max_length + '자 이내' : '') +
    (sec.photo_required ? ' | 사진 필수 (' + sec.photo_count + '장)' : '') +
    (sec.caption_required ? ' | 캡션 필수' : '');

  const statusLabel = {
    'empty': '미작성', 'draft': '작성중',
    'submitted': '컨펌 대기', 'confirming': '컨펌 진행중',
    'confirmed': '컨펌 완료', 'approved': '승인 완료',
  };
  const statusColor = {
    'empty': 'bg-gray-100 text-gray-500', 'draft': 'bg-blue-100 text-blue-700',
    'submitted': 'bg-orange-100 text-orange-700', 'confirming': 'bg-yellow-100 text-yellow-700',
    'confirmed': 'bg-purple-100 text-purple-700', 'approved': 'bg-green-100 text-green-700',
  };

  // 컨펌된 기사에서 삭선/추가 표시를 렌더링하는 함수 (기자용)
  const renderConfirmContent = (html) => {
    if (!html) return null;
    // 삭선(red, line-through) span과 추가(blue) span을 버튼이 있는 사용자 인터랙션으로 변환
    // React에서 contentEditable 내부에서 직접 DOM을 조작하므로 렌더링은 기본 표시
    return null;
  };

  return (
    <main key={sectionId} className="max-w-4xl mx-auto px-6 py-8">
      {/* 편집장/부편집장 플로팅 툴바 (검토자만) */}
      {isReviewer && (status === 'submitted' || status === 'confirming') && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-white shadow-2xl rounded-full px-6 py-3 border border-gray-200 flex items-center space-x-3">
          <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-widest">Editor</span>
          <button
            onMouseDown={(e) => { e.preventDefault(); applyStrike(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition shadow-sm"
            title="삭선 (텍스트 드래그 후 클릭)"
          >
            <i className="fas fa-strikethrough"></i>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); applyAdd(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition shadow-sm"
            title="추가 (커서 위치에 파란색 입력 시작)"
          >
            <i className="fas fa-plus"></i>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <button
            onMouseDown={(e) => { e.preventDefault(); clearFormat(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition shadow-sm"
            title="서식 지우기 (텍스트 드래그 후 클릭)"
          >
            <i className="fas fa-eraser"></i>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <button
            onMouseDown={(e) => { e.preventDefault(); performUndo(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition shadow-sm"
            title="되돌리기 (Ctrl+Z)"
          >
            <i className="fas fa-undo"></i>
          </button>
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        className="text-gray-400 hover:text-[#004b93] mb-6 flex items-center space-x-2 transition"
      >
        <i className="fas fa-arrow-left"></i>
        <span className="font-semibold">지면 현황으로 돌아가기</span>
      </button>

      <div className="bg-[#004b93] text-white rounded-3xl p-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold mb-2">
              {sec.section_name + ' 담당자 ' + (sec.assigned_reporter_name || user.name) + ' 기자'}
            </h1>
            <p className="text-blue-200 text-sm">{headerInfo}</p>
          </div>
          <span className={'px-3 py-1 rounded-full text-sm font-bold ' + (statusColor[status] || '')}>
            {statusLabel[status] || status}
          </span>
        </div>
        {article.confirm_round > 0 && (
          <div className="mt-3 bg-white/15 rounded-xl px-4 py-2 inline-block text-sm">
            <i className="fas fa-sync-alt mr-1"></i>
            {article.confirm_round + '차 컨펌'}
          </div>
        )}
      </div>

      {/* 컨펌 안내 맞사지 (기자용) */}
      {isReporter && status === 'confirmed' && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <h3 className="font-bold text-purple-800 mb-2">
            <i className="fas fa-edit mr-2"></i>편집장 컨펌 내역
          </h3>
          <p className="text-sm text-purple-600 mb-3">
            빨간색 삭선 텍스트에 마우스를 올리면 "지우기" 버튼이, 파란색 텍스트에 마우스를 올리면 "추가하기" 버튼이 표시됩니다.
            수정 완료 후 하단의 "편집장 컨펌 재요청" 버튼을 클릭해주세요.
          </p>
          <p className="text-xs text-purple-500">또한 검은색 텍스트로 자유롭게 편집할 수 있습니다.</p>
        </div>
      )}

      {/* 승인 완료 기사 재수정 안내 (기자용) */}
      {isReporter && status === 'approved' && (
        <div className="mb-6 bg-amber-50 border border-amber-300 rounded-2xl p-5">
          <h3 className="font-bold text-amber-800 mb-1">
            <i className="fas fa-exclamation-triangle mr-2"></i>승인 완료된 기사입니다
          </h3>
          <p className="text-sm text-amber-700">
            이 기사는 이미 승인되어 게시된 상태입니다. 내용을 수정하면 다시 편집장 컨펌을 받아야 하며,
            컨펌 후 재승인 시 기사에 <strong>수정일이 표기</strong>됩니다.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {!isHancutDaejin && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {'제목'}
              {sec.title_max_length ? React.createElement('span', { className: 'ml-2 text-gray-400 font-normal' }, '(' + sec.title_max_length + '자 이내 권장)') : null}
              {sec.title_min_length ? React.createElement('span', { className: 'ml-2 text-gray-400 font-normal' }, '(' + sec.title_min_length + '자 이상 권장)') : null}
            </label>
            <EditableField
              innerRef={titleRef}
              initialHtml={initTitle}
              onChange={(html) => setTitleText(stripHtml(html))}
              placeholder="기사 제목을 입력하세요"
              editable={editable}
              className={'w-full px-4 py-3 rounded-xl border text-lg font-bold min-h-[3rem] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 ' +
                (titleOverMax ? 'border-red-300 bg-red-50' : titleUnderMin ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200') +
                ' focus:ring-2 focus:ring-[#004b93] focus:border-transparent'}
            />
            <div className="flex justify-between mt-2 text-xs">
              <span className={titleOverMax ? 'text-red-500 font-bold' : titleUnderMin ? 'text-yellow-600 font-bold' : 'text-gray-400'}>
                {titleLen + '자' +
                 (titleOverMax ? ' (' + (titleLen - sec.title_max_length) + '자 초과)' : '') +
                 (titleUnderMin ? ' (' + (sec.title_min_length - titleLen) + '자 부족)' : '')}
              </span>
              {sec.title_max_length ? React.createElement('span', { className: 'text-gray-400' }, '최대 ' + sec.title_max_length + '자') : null}
              {sec.title_min_length && !sec.title_max_length ? React.createElement('span', { className: 'text-gray-400' }, '최소 ' + sec.title_min_length + '자') : null}
            </div>
          </div>
        )}

        {sec.has_subtitle === 1 && !isHancutDaejin && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {'부제목'}
              {sec.subtitle_max_length ? React.createElement('span', { className: 'ml-2 text-gray-400 font-normal' }, '(' + sec.subtitle_max_length + '자 이내 권장)') : null}
              {sec.subtitle_min_length ? React.createElement('span', { className: 'ml-2 text-gray-400 font-normal' }, '(' + sec.subtitle_min_length + '자 이상 권장)') : null}
            </label>
            <EditableField
              innerRef={subtitleRef}
              initialHtml={initSubtitle}
              onChange={(html) => setSubtitleText(stripHtml(html))}
              placeholder="부제목을 입력하세요"
              editable={editable}
              className={'w-full px-4 py-3 rounded-xl border min-h-[3rem] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 ' +
                (subtitleOverMax ? 'border-red-300 bg-red-50' : subtitleUnderMin ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200') +
                ' focus:ring-2 focus:ring-[#004b93] focus:border-transparent'}
            />
            <div className="flex justify-between mt-2 text-xs">
              <span className={subtitleOverMax ? 'text-red-500 font-bold' : subtitleUnderMin ? 'text-yellow-600 font-bold' : 'text-gray-400'}>
                {subtitleLen + '자' +
                 (subtitleOverMax ? ' (' + (subtitleLen - sec.subtitle_max_length) + '자 초과)' : '') +
                 (subtitleUnderMin ? ' (' + (sec.subtitle_min_length - subtitleLen) + '자 부족)' : '')}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            {'사진 첨부'}
            {sec.photo_required === 1 ? React.createElement('span', { className: 'ml-2 text-red-500 font-bold' }, '사진 첨부 필수') : null}
            {sec.photo_orientation ? React.createElement('span', { className: 'ml-2 text-gray-400 font-normal' }, '(' + sec.photo_orientation + ' 권장)') : null}
          </label>
          <div className={sec.photo_count >= 2 ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4'}>
            <div>
              <label className="block w-full h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#004b93] transition cursor-pointer flex flex-col items-center justify-center overflow-hidden">
                {photo1Preview ? (
                  <img src={photo1Preview} alt="사진1" className="w-full h-full object-cover" />
                ) : (
                  <React.Fragment>
                    <i className="fas fa-camera text-2xl text-gray-400 mb-2"></i>
                    <span className="text-sm text-gray-400">사진 1 클릭하여 업로드</span>
                  </React.Fragment>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'photo1')} />
              </label>
            </div>
            {sec.photo_count >= 2 && (
              <div>
                <label className="block w-full h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#004b93] transition cursor-pointer flex flex-col items-center justify-center overflow-hidden">
                  {photo2Preview ? (
                    <img src={photo2Preview} alt="사진2" className="w-full h-full object-cover" />
                  ) : (
                    <React.Fragment>
                      <i className="fas fa-camera text-2xl text-gray-400 mb-2"></i>
                      <span className="text-sm text-gray-400">사진 2 클릭하여 업로드</span>
                    </React.Fragment>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'photo2')} />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            {'캡션'}
            {sec.caption_required === 1 ? React.createElement('span', { className: 'ml-2 text-red-500 font-bold' }, '캡션 입력 필수') : null}
          </label>
          <EditableField
            innerRef={caption1Ref}
            initialHtml={initCaption1}
            placeholder="사진 캡션을 입력하세요"
            editable={editable}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#004b93] focus:border-transparent mb-2 outline-none min-h-[3rem] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
          />
          {sec.photo_count >= 2 && (
            <EditableField
              innerRef={caption2Ref}
              initialHtml={initCaption2}
              placeholder="사진 2 캡션을 입력하세요"
              editable={editable}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#004b93] focus:border-transparent outline-none min-h-[3rem] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
            />
          )}
        </div>

        {sec.has_body === 1 && !isHancutDaejin && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {'원고 본문'}
              {sec.volume ? React.createElement('span', { className: 'ml-2 text-gray-400 font-normal' }, '(원고지 200자 기준 ' + sec.volume + ' 분량)') : null}
            </label>
            <EditableField
              innerRef={bodyRef}
              initialHtml={initBody}
              onChange={(html) => setBodyText(stripHtml(html))}
              placeholder="기사 본문을 작성하세요..."
              editable={editable}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#004b93] focus:border-transparent outline-none min-h-[20rem] whitespace-pre-wrap leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
            />
            {sec.volume && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-500">
                    {'현재 분량: '}<span className="font-bold text-gray-800">{currentVolume}</span>
                  </span>
                  <span className="text-gray-500">
                    {'목표 분량: '}<span className="font-bold text-gray-800">{sec.volume}</span>
                  </span>
                </div>
                <div>
                  {Math.abs(volumeDiff) < 0.3 && currentVolume > 0 ? (
                    <span className="text-green-600 text-sm font-bold">
                      <i className="fas fa-check-circle mr-1"></i>적정 분량
                    </span>
                  ) : volumeDiff > 0 ? (
                    <span className="text-red-500 text-sm font-bold">
                      <i className="fas fa-exclamation-triangle mr-1"></i>{volumeDiff.toFixed(1) + ' 초과'}
                    </span>
                  ) : currentVolume > 0 ? (
                    <span className="text-yellow-600 text-sm font-bold">
                      <i className="fas fa-exclamation-triangle mr-1"></i>{Math.abs(volumeDiff).toFixed(1) + ' 미달'}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
            {sec.volume && currentVolume > 0 && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={'h-2 rounded-full transition-all ' + volumeBarColor}
                  style={{ width: volumeBarWidth }}
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-4">기자 정보</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">기자 이름</label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="기자 이름"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#004b93] focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">이메일</label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="reporter@daejin.ac.kr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#004b93] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="flex justify-between items-center pt-4 pb-20">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition"
          >
            돌아가기
          </button>
          <div className="flex items-center space-x-3">
            {/* 작성자(기자 또는 지면을 직접 쓰는 편집장/부편집장): 컨펌 대상 선택 */}
            {(isReporter || (isAdmin && isWriter)) && ['empty', 'draft', 'approved'].includes(status) && (
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
              >
                <option value="">컨펌 요청 대상 선택</option>
                {confirmTargets.map(t => (
                  <option key={t.id} value={t.id}>{t.name + ' (' + t.position + ')'}</option>
                ))}
              </select>
            )}

            {/* 작성자: 임시저장 (empty, draft, approved 상태) */}
            {(isReporter || (isAdmin && isWriter)) && ['empty', 'draft', 'approved'].includes(status) && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 rounded-2xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                임시 저장
              </button>
            )}

            {/* 작성자: 최초 컨펌 요청 (draft 상태) */}
            {(isReporter || (isAdmin && isWriter)) && ['empty', 'draft'].includes(status) && (
              <button
                onClick={handleSubmitConfirm}
                disabled={submitting || saving || !selectedTargetId}
                className="px-8 py-3 rounded-2xl font-bold bg-[#004b93] text-white hover:bg-[#003a75] transition disabled:opacity-50"
              >
                {submitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-paper-plane mr-2"></i>}
                컨펌 요청
              </button>
            )}

            {/* 작성자: 승인 완료 기사 수정 후 컨펌 재요청 */}
            {(isReporter || (isAdmin && isWriter)) && status === 'approved' && (
              <button
                onClick={handleSubmitConfirm}
                disabled={submitting || saving || !selectedTargetId}
                className="px-8 py-3 rounded-2xl font-bold bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50"
              >
                {submitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-sync-alt mr-2"></i>}
                수정 후 컨펌 재요청
              </button>
            )}

            {/* 작성자: 컨펌 대기 중 상태 표시 */}
            {(isReporter || (isAdmin && isWriter)) && (status === 'submitted' || status === 'confirming') && (
              <span className="px-8 py-3 rounded-2xl font-bold bg-orange-100 text-orange-700">
                <i className="fas fa-clock mr-2"></i>
                {article.confirm_target_name ? (article.confirm_target_name + '(' + article.confirm_target_position + ') 컨펌 대기 중') : '컨펌 대기 중'}
              </span>
            )}

            {/* 작성자: 컨펌 완료 → 수정 후 재컨펌 요청 */}
            {(isReporter || (isAdmin && isWriter)) && status === 'confirmed' && (
              <button
                onClick={handleResubmit}
                disabled={submitting}
                className="px-8 py-3 rounded-2xl font-bold bg-purple-600 text-white hover:bg-purple-700 transition disabled:opacity-50"
              >
                {submitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-paper-plane mr-2"></i>}
                컨펌 재요청
              </button>
            )}

            {/* 검토자(편집장/부편집장): 컨펌하기 버튼 (confirmStarted일 때만) */}
            {isReviewer && (status === 'submitted' || status === 'confirming') && confirmStarted && (
              <button
                onClick={handleConfirmDone}
                disabled={saving}
                className="px-6 py-3 rounded-2xl font-bold bg-purple-600 text-white hover:bg-purple-700 transition disabled:opacity-50"
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-check mr-2"></i>}
                컨펌하기
              </button>
            )}

            {/* 검토자: 바로 승인하기 버튼 */}
            {isReviewer && (status === 'submitted' || status === 'confirming') && (
              <button
                onClick={handleApprove}
                disabled={saving || confirmStarted}
                className={'px-6 py-3 rounded-2xl font-bold transition disabled:opacity-50 ' +
                  (confirmStarted ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700')}
                title={confirmStarted ? '컨펌을 시작하면 바로 승인은 비활성화됩니다' : ''}
              >
                <i className="fas fa-check-double mr-2"></i>
                바로 승인하기
              </button>
            )}

            {/* 검토자: 컨펌 완료 상태에서 승인 가능 */}
            {isReviewer && status === 'confirmed' && (
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-6 py-3 rounded-2xl font-bold bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
              >
                <i className="fas fa-check-double mr-2"></i>
                최종 승인하기
              </button>
            )}

            {/* 검토자: 승인 완료 */}
            {isReviewer && status === 'approved' && (
              <span className="px-8 py-3 rounded-2xl font-bold bg-green-100 text-green-700">
                <i className="fas fa-check-circle mr-2"></i>승인 완료
              </span>
            )}

            {/* 검토자: 임시저장 (submitted/confirming에서 컨펌 중 저장) */}
            {isReviewer && (status === 'submitted' || status === 'confirming') && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 rounded-2xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                임시 저장
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default ArticleWrite;
