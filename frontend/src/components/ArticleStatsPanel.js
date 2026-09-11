import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = '/api';

function formatSec(sec) {
  if (!sec || sec === 0) return '-';
  if (sec < 60) return `${sec}초`;
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

function StatBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = '#003580' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
        <i className={icon} style={{ color }}></i>
      </div>
      <div>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '22px', fontWeight: 900, color: '#111827', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function ArticleStatsPanel({ scope = 'reporter' }) {
  // scope: 'reporter' | 'admin'
  const [articles, setArticles] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [sort, setSort]         = useState('view_count'); // view_count | avg_seconds | comment_count
  const [loadingStats, setLoadingStats] = useState(false);

  const token = localStorage.getItem('dju_token');
  const h = { Authorization: `Bearer ${token}` };

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/articles/my/assigned`, { headers: h });
      const list = (res.data.articles || []).filter(a => a.article_status === 'approved');
      setArticles(list);

      // 통계 일괄 로드
      const results = await Promise.allSettled(
        list.map(a =>
          axios.get(`${API}/articles/${a.article_id}/stats`, { headers: h })
            .then(r => ({ id: a.article_id, ...r.data }))
        )
      );
      const map = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') map[r.value.id] = r.value;
      });
      setStatsMap(map);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const sorted = [...articles].sort((a, b) => {
    const sa = statsMap[a.article_id] || {};
    const sb = statsMap[b.article_id] || {};
    return (sb[sort] || 0) - (sa[sort] || 0);
  });

  const maxView    = Math.max(1, ...Object.values(statsMap).map(s => s.view_count    || 0));
  const maxTime    = Math.max(1, ...Object.values(statsMap).map(s => s.avg_seconds   || 0));
  const maxComment = Math.max(1, ...Object.values(statsMap).map(s => s.comment_count || 0));

  const selStats = selected ? (statsMap[selected.article_id] || {}) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: '20px', alignItems: 'start' }}>

      {/* ── 목록 ── */}
      <div>
        {/* 정렬 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[['view_count','👁 조회수'],['avg_seconds','⏱ 체류시간'],['comment_count','💬 댓글']].map(([k,l]) => (
            <button key={k} onClick={() => setSort(k)}
              style={{ padding: '5px 14px', borderRadius: '20px', border: '1.5px solid', borderColor: sort === k ? '#003580' : '#e5e7eb', background: sort === k ? '#003580' : '#fff', color: sort === k ? '#fff' : '#6b7280', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              {l} 순
            </button>
          ))}
          <button onClick={fetchArticles} style={{ marginLeft: 'auto', padding: '5px 12px', border: '1px solid #e5e7eb', borderRadius: '20px', background: '#fff', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>
            <i className="fas fa-sync-alt" style={{ marginRight: '4px' }}></i>새로고침
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', background: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
            <i className="fas fa-chart-bar" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', opacity: 0.3 }}></i>
            <p>승인된 기사가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.map((art, idx) => {
              const st = statsMap[art.article_id] || {};
              const isSelected = selected?.article_id === art.article_id;
              return (
                <div key={art.article_id}
                  onClick={() => setSelected(isSelected ? null : art)}
                  style={{ background: '#fff', border: `1.5px solid ${isSelected ? '#003580' : '#f3f4f6'}`, borderRadius: '10px', padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#bfdbfe'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#f3f4f6'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#9ca3af', width: '22px', flexShrink: 0 }}>#{idx + 1}</span>
                    <p style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {art.article_title || '(제목 없음)'}
                    </p>
                    <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>
                      제{art.issue_number}호 · {art.section_name}
                    </span>
                  </div>

                  {/* 통계 바 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingLeft: '32px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                        <span><i className="far fa-eye" style={{ marginRight: '3px' }}></i>조회수</span>
                        <span style={{ fontWeight: 700, color: '#111' }}>{(st.view_count || 0).toLocaleString()}</span>
                      </div>
                      <StatBar value={st.view_count || 0} max={maxView} color="#003580" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                        <span><i className="far fa-clock" style={{ marginRight: '3px' }}></i>평균체류</span>
                        <span style={{ fontWeight: 700, color: '#111' }}>{formatSec(st.avg_seconds)}</span>
                      </div>
                      <StatBar value={st.avg_seconds || 0} max={maxTime} color="#7c3aed" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                        <span><i className="far fa-comment" style={{ marginRight: '3px' }}></i>댓글</span>
                        <span style={{ fontWeight: 700, color: '#111' }}>{st.comment_count || 0}</span>
                      </div>
                      <StatBar value={st.comment_count || 0} max={maxComment} color="#059669" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 상세 패널 ── */}
      {selected && selStats && (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #e5e7eb', padding: '24px', position: 'sticky', top: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', lineHeight: 1.4, flex: 1, marginRight: '8px' }}>
              {selected.article_title || '(제목 없음)'}
            </h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', flexShrink: 0 }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '20px' }}>
            제{selected.issue_number}호 · {selected.section_name}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <StatCard icon="far fa-eye"    label="총 조회수"    value={(selStats.view_count || 0).toLocaleString()} color="#003580" />
            <StatCard icon="far fa-clock"  label="실질 조회수"  value={selStats.read_count || 0} sub="체류 3초 이상" color="#7c3aed" />
            <StatCard icon="fas fa-stopwatch" label="평균 체류시간" value={formatSec(selStats.avg_seconds)} color="#d97706" />
            <StatCard icon="far fa-comment"   label="댓글 수"     value={selStats.comment_count || 0} color="#059669" />
          </div>

          {/* 체류율 */}
          {selStats.view_count > 0 && (
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>실질 독자 비율 (체류 3초+)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, ((selStats.read_count || 0) / selStats.view_count) * 100).toFixed(0)}%`, background: '#7c3aed', borderRadius: '4px' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', flexShrink: 0 }}>
                  {selStats.view_count > 0 ? `${Math.min(100, ((selStats.read_count || 0) / selStats.view_count) * 100).toFixed(0)}%` : '-'}
                </span>
              </div>
            </div>
          )}

          <a href={`/article/${selected.article_id}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', marginTop: '16px', textAlign: 'center', padding: '10px', background: '#003580', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
            <i className="fas fa-external-link-alt" style={{ marginRight: '6px' }}></i>기사 보기
          </a>
        </div>
      )}
    </div>
  );
}
