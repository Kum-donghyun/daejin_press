import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = '/api';

/**
 * 24h DJU 속보 관리 패널 (기자/편집장 공통 사용 컴포넌트)
 * ReporterPanel 과 AdminPanel 양쪽에서 탭 내용으로 삽입됩니다.
 */
function TickerManager() {
  const { showToast } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [newText, setNewText] = useState('');
  const [adding, setAdding]   = useState(false);
  // 인라인 수정 상태: { [id]: '수정 중인 텍스트' }
  const [editMap, setEditMap] = useState({});
  const [savingMap, setSavingMap] = useState({});

  const token = localStorage.getItem('dju_token');
  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ticker`, { headers: h });
      setItems(res.data.items);
    } catch { showToast('목록을 불러올 수 없습니다.', 'error'); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newText.trim()) { showToast('내용을 입력해주세요.', 'error'); return; }
    setAdding(true);
    try {
      await axios.post(`${API}/ticker`, { content: newText.trim() }, { headers: h });
      setNewText('');
      showToast('추가되었습니다.', 'success');
      fetchItems();
    } catch (err) { showToast(err.response?.data?.message || '추가 실패', 'error'); }
    finally { setAdding(false); }
  };

  const handleSaveEdit = async (id) => {
    const content = editMap[id];
    if (content === undefined) return;
    setSavingMap(m => ({ ...m, [id]: true }));
    try {
      await axios.put(`${API}/ticker/${id}`, { content }, { headers: h });
      showToast('수정되었습니다.', 'success');
      setEditMap(m => { const n = { ...m }; delete n[id]; return n; });
      fetchItems();
    } catch (err) { showToast(err.response?.data?.message || '수정 실패', 'error'); }
    finally { setSavingMap(m => ({ ...m, [id]: false })); }
  };

  const handleToggleActive = async (item) => {
    try {
      await axios.put(`${API}/ticker/${item.id}`, { is_active: item.is_active ? 0 : 1 }, { headers: h });
      fetchItems();
    } catch { showToast('변경 실패', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 속보 항목을 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`${API}/ticker/${id}`, { headers: h });
      showToast('삭제되었습니다.', 'info');
      fetchItems();
    } catch { showToast('삭제 실패', 'error'); }
  };

  const handleMoveUp = async (item, idx) => {
    if (idx === 0) return;
    const prev = items[idx - 1];
    try {
      await Promise.all([
        axios.put(`${API}/ticker/${item.id}`,  { sort_order: prev.sort_order }, { headers: h }),
        axios.put(`${API}/ticker/${prev.id}`,  { sort_order: item.sort_order }, { headers: h }),
      ]);
      fetchItems();
    } catch { showToast('순서 변경 실패', 'error'); }
  };

  const handleMoveDown = async (item, idx) => {
    if (idx === items.length - 1) return;
    const next = items[idx + 1];
    try {
      await Promise.all([
        axios.put(`${API}/ticker/${item.id}`,  { sort_order: next.sort_order }, { headers: h }),
        axios.put(`${API}/ticker/${next.id}`,  { sort_order: item.sort_order }, { headers: h }),
      ]);
      fetchItems();
    } catch { showToast('순서 변경 실패', 'error'); }
  };

  const inputS = {
    padding: '9px 12px', border: '1.5px solid #e5e7eb',
    borderRadius: '8px', fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div>
      {/* 미리보기 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', overflow: 'hidden' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px', letterSpacing: '0.5px' }}>티커 미리보기</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <div style={{ background: '#d32f2f', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '6px 12px', flexShrink: 0, letterSpacing: '1px', borderRadius: '4px 0 0 4px' }}>
            <i className="fas fa-bolt" style={{ marginRight: '5px' }}></i>24h DJU
          </div>
          <div style={{ flex: 1, background: '#f9fafb', border: '1px solid #e5e7eb', borderLeft: 'none', padding: '6px 12px', borderRadius: '0 4px 4px 0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '13px', color: '#374151' }}>
            {items.filter(i => i.is_active).map(i => `◆ ${i.content}`).join('   ')}
            {items.filter(i => i.is_active).length === 0 && <span style={{ color: '#9ca3af' }}>활성화된 속보가 없습니다</span>}
          </div>
        </div>
      </div>

      {/* 추가 폼 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 18px', marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#111', marginBottom: '10px' }}>
          <i className="fas fa-plus" style={{ marginRight: '7px', color: '#003580' }}></i>속보 추가
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="속보 내용을 입력하세요 (Enter로 추가)"
            style={inputS}
            onFocus={e => e.target.style.borderColor = '#003580'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <button onClick={handleAdd} disabled={adding}
            style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#fff', background: adding ? '#9ca3af' : '#003580', cursor: adding ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
            {adding ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '22px', display: 'block', marginBottom: '8px' }}></i>
          불러오는 중...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#9ca3af' }}>
          <i className="fas fa-bolt" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}></i>
          등록된 속보가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item, idx) => {
            const isEditing = editMap[item.id] !== undefined;
            return (
              <div key={item.id} style={{
                background: '#fff', border: `1px solid ${item.is_active ? '#e5e7eb' : '#f3f4f6'}`,
                borderRadius: '10px', padding: '12px 16px',
                opacity: item.is_active ? 1 : 0.55,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* 순서 버튼 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                    <button onClick={() => handleMoveUp(item, idx)} disabled={idx === 0}
                      style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#e5e7eb' : '#6b7280', padding: '1px 5px', fontSize: '11px' }}>
                      <i className="fas fa-chevron-up"></i>
                    </button>
                    <button onClick={() => handleMoveDown(item, idx)} disabled={idx === items.length - 1}
                      style={{ background: 'none', border: 'none', cursor: idx === items.length - 1 ? 'default' : 'pointer', color: idx === items.length - 1 ? '#e5e7eb' : '#6b7280', padding: '1px 5px', fontSize: '11px' }}>
                      <i className="fas fa-chevron-down"></i>
                    </button>
                  </div>

                  {/* 번호 */}
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#d32f2f', fontFamily: 'monospace', flexShrink: 0, minWidth: '22px' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* 내용 (편집 or 표시) */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={editMap[item.id]}
                      onChange={e => setEditMap(m => ({ ...m, [item.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(item.id); if (e.key === 'Escape') setEditMap(m => { const n={...m}; delete n[item.id]; return n; }); }}
                      autoFocus
                      style={{ ...inputS, flex: 1, fontSize: '13px', padding: '6px 10px' }}
                      onFocus={e => e.target.style.borderColor = '#003580'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: '13px', color: '#111', lineHeight: 1.5 }}>{item.content}</span>
                  )}

                  {/* 액션 버튼 */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveEdit(item.id)} disabled={savingMap[item.id]}
                          style={{ padding: '5px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#fff', background: '#003580', cursor: 'pointer' }}>
                          {savingMap[item.id] ? '저장중' : '저장'}
                        </button>
                        <button onClick={() => setEditMap(m => { const n={...m}; delete n[item.id]; return n; })}
                          style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#6b7280', background: '#fff', cursor: 'pointer' }}>
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        {/* 활성/비활성 토글 */}
                        <button onClick={() => handleToggleActive(item)}
                          title={item.is_active ? '비활성화' : '활성화'}
                          style={{ padding: '5px 10px', border: `1px solid ${item.is_active ? '#d1fae5' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: item.is_active ? '#065f46' : '#9ca3af', background: item.is_active ? '#f0fdf4' : '#f9fafb', cursor: 'pointer' }}>
                          <i className={`fas ${item.is_active ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                        </button>
                        <button onClick={() => setEditMap(m => ({ ...m, [item.id]: item.content }))}
                          style={{ padding: '5px 10px', border: '1px solid #003580', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#003580', background: '#fff', cursor: 'pointer' }}>
                          <i className="fas fa-pen"></i>
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          style={{ padding: '5px 10px', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#d32f2f', background: '#fff', cursor: 'pointer' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TickerManager;
