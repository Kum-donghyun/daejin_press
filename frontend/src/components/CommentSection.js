import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = '/api';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return '방금 전';
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400)return `${Math.floor(diff/3600)}시간 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function RoleBadge({ role, position, verifiedType }) {
  if (role === 'admin') return (
    <span style={{ fontSize: '10px', fontWeight: 900, padding: '1px 7px', borderRadius: '20px', background: '#003580', color: '#fff', marginLeft: '5px' }}>편집장</span>
  );
  if (role === 'reporter') return (
    <span style={{ fontSize: '10px', fontWeight: 900, padding: '1px 7px', borderRadius: '20px', background: '#d32f2f', color: '#fff', marginLeft: '5px' }}>기자</span>
  );
  if (verifiedType) {
    const label = verifiedType === 'student' ? '실명학생' : verifiedType === 'professor' ? '실명교수' : '실명교직원';
    return (
      <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: '#e8f5e9', color: '#2e7d32', marginLeft: '5px' }}>✓ {label}</span>
    );
  }
  return null;
}

function CommentItem({ comment, allComments, articleId, articleType, onRefresh, isAdmin, currentUserId, isVerified, canReply }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(comment.body || '');
  const [blurLifted, setBlurLifted] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('dju_token');
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const replies = allComments.filter(c => c.parent_id === comment.id);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API}/comments`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ article_id: articleId, article_type: articleType, body: replyText, parent_id: comment.id }),
      });
      setReplyText(''); setReplyOpen(false);
      onRefresh();
    } finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API}/comments/${comment.id}`, {
        method: 'PUT', headers: h,
        body: JSON.stringify({ body: editText }),
      });
      setEditOpen(false); onRefresh();
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    await fetch(`${API}/comments/${comment.id}`, { method: 'DELETE', headers: h });
    onRefresh();
  };

  const handleBlur = async () => {
    await fetch(`${API}/comments/${comment.id}/blur`, { method: 'PUT', headers: h });
    onRefresh();
  };

  const isOwner = currentUserId === comment.user_id;
  const displayName = comment.user_nickname || comment.user_name;
  const isBlurred = comment.is_blurred && !blurLifted;

  if (comment.is_deleted) {
    return (
      <div style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
        <p style={{ fontSize: '13px', color: '#d1d5db', fontStyle: 'italic' }}>삭제된 댓글입니다.</p>
        {replies.map(r => (
          <CommentItem key={r.id} comment={r} allComments={allComments} articleId={articleId} articleType={articleType}
            onRefresh={onRefresh} isAdmin={isAdmin} currentUserId={currentUserId} isVerified={isVerified} canReply={canReply} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 0', borderBottom: replies.length === 0 ? '1px solid #f3f4f6' : 'none' }}>
      {/* 작성자 메타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: comment.user_role === 'admin' ? '#003580' : comment.user_role === 'reporter' ? '#d32f2f' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: comment.user_role === 'reader' ? '#6b7280' : '#fff', flexShrink: 0 }}>
          {displayName?.charAt(0)}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{displayName}</span>
        <RoleBadge role={comment.user_role} position={comment.user_position} verifiedType={comment.user_verified_type} />
        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>{timeAgo(comment.created_at)}</span>
      </div>

      {/* 본문 */}
      {editOpen ? (
        <div style={{ marginBottom: '8px' }}>
          <textarea value={editText} onChange={e => setEditText(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #003580', borderRadius: '6px', fontSize: '14px', resize: 'vertical', minHeight: '72px', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button onClick={handleEdit} disabled={loading} style={{ padding: '5px 14px', background: '#003580', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>저장</button>
            <button onClick={() => setEditOpen(false)} style={{ padding: '5px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => isBlurred && setBlurLifted(true)}
          style={{
            fontSize: '14px', color: '#374151', lineHeight: 1.7, marginBottom: '8px',
            whiteSpace: 'pre-wrap',
            filter: isBlurred ? 'blur(5px)' : 'none',
            cursor: isBlurred ? 'pointer' : 'default',
            userSelect: isBlurred ? 'none' : 'auto',
          }}
          title={isBlurred ? '클릭하면 내용이 표시됩니다' : undefined}
        >
          {isBlurred ? '(블러 처리된 내용입니다. 클릭하여 확인)' : comment.body}
        </div>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {canReply && !comment.parent_id && (
          <button onClick={() => setReplyOpen(p => !p)}
            style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="far fa-comment-alt"></i> 답글
          </button>
        )}
        {isOwner && !comment.is_deleted && (
          <>
            <button onClick={() => { setEditOpen(p => !p); setEditText(comment.body); }}
              style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              수정
            </button>
            <button onClick={handleDelete}
              style={{ fontSize: '12px', color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              삭제
            </button>
          </>
        )}
        {isAdmin && !isOwner && (
          <>
            <button onClick={handleBlur}
              style={{ fontSize: '12px', color: comment.is_blurred ? '#2e7d32' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {comment.is_blurred ? '블러 해제' : '블러'}
            </button>
            <button onClick={handleDelete}
              style={{ fontSize: '12px', color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              삭제
            </button>
          </>
        )}
      </div>

      {/* 답글 입력 */}
      {replyOpen && (
        <div style={{ marginTop: '10px', paddingLeft: '16px', borderLeft: '2px solid #e5e7eb' }}>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
            placeholder="답글을 입력하세요..."
            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', resize: 'vertical', minHeight: '60px', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#003580'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button onClick={handleReply} disabled={loading || !replyText.trim()} style={{ padding: '5px 14px', background: '#003580', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>답글 달기</button>
            <button onClick={() => setReplyOpen(false)} style={{ padding: '5px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {/* 답글 목록 */}
      {replies.length > 0 && (
        <div style={{ marginTop: '8px', paddingLeft: '20px', borderLeft: '2px solid #f3f4f6' }}>
          {replies.map(r => (
            <CommentItem key={r.id} comment={r} allComments={allComments} articleId={articleId} articleType={articleType}
              onRefresh={onRefresh} isAdmin={isAdmin} currentUserId={currentUserId} isVerified={isVerified} canReply={canReply} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ articleId, articleType = 'newspaper' }) {
  const { user, isLoggedIn } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newText, setNewText]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const isAdmin    = user?.role === 'admin';
  const isReporter = user?.role === 'reporter';
  const isVerified = user?.verified_status === 'approved';
  const canComment = isAdmin || isReporter || isVerified;
  const canReply   = isAdmin || isReporter || isVerified;

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/comments?article_id=${articleId}&article_type=${articleType}`);
      const data = await res.json();
      setComments(data.comments || []);
    } finally { setLoading(false); }
  }, [articleId, articleType]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('dju_token');
      const res = await fetch(`${API}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, article_type: articleType, body: newText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setNewText('');
      fetchComments();
    } catch (err) {
      setError(err.message || '댓글 작성에 실패했습니다.');
    } finally { setSubmitting(false); }
  };

  const topComments = comments.filter(c => !c.parent_id);
  const totalCount  = comments.filter(c => !c.is_deleted).length;

  return (
    <section style={{ marginTop: '48px', paddingTop: '32px', borderTop: '2px solid #111827' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#111827' }}>댓글</h3>
        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600 }}>{totalCount}개</span>
      </div>

      {/* 작성란 */}
      <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '20px', marginBottom: '28px' }}>
        {!isLoggedIn ? (
          <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>
            댓글을 보려면 로그인하세요. 댓글 작성은 <strong style={{ color: '#374151' }}>실명 인증된 독자, 기자, 편집장</strong>만 가능합니다.
          </p>
        ) : !canComment ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
              댓글 작성은 <strong style={{ color: '#374151' }}>실명 인증된 독자</strong>만 가능합니다.
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>
              프로필에서 실명 인증을 신청하면 승인 후 댓글을 작성할 수 있습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isAdmin ? '#003580' : isReporter ? '#d32f2f' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
                {user.nickname?.charAt(0) || user.name?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <textarea
                  value={newText} onChange={e => setNewText(e.target.value)}
                  placeholder="댓글을 작성하세요..."
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', resize: 'vertical', minHeight: '80px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = '#003580'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                {error && <p style={{ fontSize: '12px', color: '#d32f2f', marginTop: '4px' }}>{error}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="submit" disabled={submitting || !newText.trim()}
                    style={{ padding: '8px 20px', background: submitting || !newText.trim() ? '#9ca3af' : '#003580', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                    {submitting ? '등록 중...' : '댓글 등록'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* 댓글 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      ) : topComments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#d1d5db' }}>
          <i className="far fa-comment-alt" style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}></i>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>아직 댓글이 없습니다.</p>
        </div>
      ) : (
        <div>
          {topComments.map(c => (
            <CommentItem key={c.id} comment={c} allComments={comments}
              articleId={articleId} articleType={articleType}
              onRefresh={fetchComments}
              isAdmin={isAdmin} currentUserId={user?.id}
              isVerified={isVerified} canReply={canReply}
            />
          ))}
        </div>
      )}
    </section>
  );
}
