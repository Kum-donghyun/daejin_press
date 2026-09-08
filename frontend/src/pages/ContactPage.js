import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────
//  각 유형별 메타 정보
// ─────────────────────────────────────────
const META = {
  apply: {
    label: '기자 지원',
    icon: '✏️',
    color: '#1565c0',
    lightColor: '#e3f2fd',
    desc: '대진대학교 신문사 기자로 활동하고 싶으신 분은 아래 양식을 작성해 주세요. 편집장이 검토 후 연락드립니다.',
    notice: '기자 선발은 학교 홈페이지에 공지되는 공개 모집 기간에만 진행되고 지원은 수시로 가능합니다. 지원 현황은 편집장에게 직접 전달됩니다.',
  },
  report: {
    label: '제보하기',
    icon: '📢',
    color: '#2e7d32',
    lightColor: '#e8f5e9',
    desc: '학내외 제보 사항을 알려주세요. 접수된 내용은 모든 기자에게 전달되며 취재 여부를 검토합니다.',
    notice: '익명 제보도 가능합니다. 연락처를 남겨주시면 취재 과정에서 추가 확인이 필요할 때 연락드릴 수 있습니다.',
  },
  advertise: {
    label: '광고 문의',
    icon: '💼',
    color: '#e65100',
    lightColor: '#fff3e0',
    desc: '대진대학교 신문사에 광고를 게재하고 싶으신 분은 아래 양식을 작성해 주세요. 편집장이 검토 후 연락드립니다.',
    notice: '지면 광고, 온라인 배너, 협찬 기사 등 다양한 형태의 광고 협의가 가능합니다.',
  },
};

// ─────────────────────────────────────────
//  공통 스타일
// ─────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#111827',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
};
const fieldWrap = { marginBottom: '20px' };
const requiredMark = { color: '#d32f2f', marginLeft: '2px' };

function Field({ label, required, children }) {
  return (
    <div style={fieldWrap}>
      <label style={labelStyle}>
        {label}{required && <span style={requiredMark}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────
//  기자 지원 폼
// ─────────────────────────────────────────
function ApplyForm({ onSuccess, accentColor }) {
  const [form, setForm] = useState({ name: '', student_id: '', department: '', phone: '', email: '', motivation: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/contact/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSuccess(data.message);
    } catch (err) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <Field label="이름" required>
          <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="홍길동" required />
        </Field>
        <Field label="학번" required>
          <input style={inputStyle} value={form.student_id} onChange={set('student_id')} placeholder="20240000" required />
        </Field>
        <Field label="학과" required>
          <input style={inputStyle} value={form.department} onChange={set('department')} placeholder="컴퓨터공학과" required />
        </Field>
        <Field label="연락처" required>
          <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="010-0000-0000" required />
        </Field>
      </div>
      <Field label="이메일" required>
        <input type="email" style={inputStyle} value={form.email} onChange={set('email')} placeholder="example@daejin.ac.kr" required />
      </Field>
      <Field label="지원 동기" required>
        <textarea
          style={{ ...inputStyle, minHeight: '160px', resize: 'vertical', lineHeight: 1.7 }}
          value={form.motivation} onChange={set('motivation')}
          placeholder="신문사에 지원하게 된 동기와 앞으로의 포부를 자유롭게 작성해 주세요."
          required
        />
      </Field>
      {error && <p style={{ color: '#d32f2f', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
      <button
        type="submit" disabled={loading}
        style={{ width: '100%', padding: '14px', background: loading ? '#9ca3af' : accentColor, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
      >
        {loading ? '제출 중...' : '기자 지원서 제출'}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────
//  제보하기 폼
// ─────────────────────────────────────────
function ReportForm({ onSuccess, accentColor }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', body: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/contact/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSuccess(data.message);
    } catch (err) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#92400e' }}>
        <strong>🔒 익명 제보 가능</strong> — 이름, 연락처, 이메일은 선택 사항입니다. 비워두시면 익명으로 접수됩니다.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <Field label="이름 (선택)">
          <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="익명" />
        </Field>
        <Field label="연락처 (선택)">
          <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="010-0000-0000" />
        </Field>
      </div>
      <Field label="이메일 (선택)">
        <input type="email" style={inputStyle} value={form.email} onChange={set('email')} placeholder="example@email.com" />
      </Field>
      <Field label="제목" required>
        <input style={inputStyle} value={form.subject} onChange={set('subject')} placeholder="제보 제목을 입력해 주세요" required />
      </Field>
      <Field label="내용" required>
        <textarea
          style={{ ...inputStyle, minHeight: '200px', resize: 'vertical', lineHeight: 1.7 }}
          value={form.body} onChange={set('body')}
          placeholder="제보 내용을 상세히 작성해 주세요. 관련 자료나 출처가 있다면 함께 기재해 주시면 취재에 도움이 됩니다."
          required
        />
      </Field>
      {error && <p style={{ color: '#d32f2f', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
      <button
        type="submit" disabled={loading}
        style={{ width: '100%', padding: '14px', background: loading ? '#9ca3af' : accentColor, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
      >
        {loading ? '제출 중...' : '제보 접수하기'}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────
//  광고 문의 폼
// ─────────────────────────────────────────
const AD_TYPES = ['지면 광고', '온라인 배너', '협찬 기사', '이벤트 협찬', '기타'];

function AdvertiseForm({ onSuccess, accentColor }) {
  const [form, setForm] = useState({ company: '', contact_name: '', phone: '', email: '', ad_type: '지면 광고', body: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/contact/advertise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSuccess(data.message);
    } catch (err) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <Field label="회사/단체명" required>
          <input style={inputStyle} value={form.company} onChange={set('company')} placeholder="(주)대진기업" required />
        </Field>
        <Field label="담당자 성함" required>
          <input style={inputStyle} value={form.contact_name} onChange={set('contact_name')} placeholder="홍길동" required />
        </Field>
        <Field label="연락처" required>
          <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="010-0000-0000" required />
        </Field>
        <Field label="이메일" required>
          <input type="email" style={inputStyle} value={form.email} onChange={set('email')} placeholder="contact@company.com" required />
        </Field>
      </div>
      <Field label="광고 종류" required>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {AD_TYPES.map(t => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: form.ad_type === t ? accentColor : '#6b7280', fontWeight: form.ad_type === t ? 700 : 400 }}>
              <input type="radio" name="ad_type" value={t} checked={form.ad_type === t} onChange={set('ad_type')} style={{ accentColor }} />
              {t}
            </label>
          ))}
        </div>
      </Field>
      <Field label="문의 내용" required>
        <textarea
          style={{ ...inputStyle, minHeight: '180px', resize: 'vertical', lineHeight: 1.7 }}
          value={form.body} onChange={set('body')}
          placeholder="광고 목적, 원하시는 규격, 게재 시기 등 구체적인 내용을 작성해 주세요."
          required
        />
      </Field>
      {error && <p style={{ color: '#d32f2f', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
      <button
        type="submit" disabled={loading}
        style={{ width: '100%', padding: '14px', background: loading ? '#9ca3af' : accentColor, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
      >
        {loading ? '제출 중...' : '광고 문의 접수하기'}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────
//  메인 페이지
// ─────────────────────────────────────────
export default function ContactPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');

  const meta = META[type];
  if (!meta) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
        <p style={{ color: '#6b7280' }}>잘못된 접근입니다.</p>
      </div>
    );
  }

  const handleSuccess = msg => { setDoneMsg(msg); setDone(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div style={{ background: '#f9fafb' }}>

      {/* 헤더 배너 */}
      <div style={{ background: meta.color, color: '#fff', padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <span style={{ fontSize: '28px' }}>{meta.icon}</span>
            <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>{meta.label}</h1>
          </div>
          <p style={{ fontSize: '15px', opacity: 0.9, lineHeight: 1.7 }}>{meta.desc}</p>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, maxWidth: '720px', width: '100%', margin: '0 auto', padding: '40px 24px 60px' }}>

        {/* 안내 박스 */}
        <div style={{ background: meta.lightColor, border: `1px solid ${meta.color}30`, borderRadius: '10px', padding: '16px 20px', marginBottom: '32px', fontSize: '13px', color: meta.color, lineHeight: 1.7 }}>
          <strong>안내</strong> — {meta.notice}
        </div>

        {/* 완료 상태 */}
        {done ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>접수 완료!</h2>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7, marginBottom: '32px' }}>{doneMsg}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setDone(false); setDoneMsg(''); }}
                style={{ padding: '12px 24px', background: meta.color, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
              >
                추가 {meta.label}하기
              </button>
              <button
                onClick={() => navigate('/')}
                style={{ padding: '12px 24px', background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        ) : (
          /* 폼 카드 */
          <div style={{ background: '#fff', borderRadius: '12px', padding: '36px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {type === 'apply' && <ApplyForm onSuccess={handleSuccess} accentColor={meta.color} />}
            {type === 'report' && <ReportForm onSuccess={handleSuccess} accentColor={meta.color} />}
            {type === 'advertise' && <AdvertiseForm onSuccess={handleSuccess} accentColor={meta.color} />}
          </div>
        )}

        {/* 연락처 정보 */}
        <div style={{ marginTop: '32px', padding: '20px 24px', background: '#fff', borderRadius: '10px', border: '1px solid #f3f4f6', fontSize: '13px', color: '#6b7280', lineHeight: 1.9 }}>
          <strong style={{ color: '#374151' }}>대진대학교 신문사</strong><br />
          경기도 포천시 호국로 1007 학생회관 3층<br />
          대표전화 031-539-1087 · 이메일 20220875@daejin.ac.kr
        </div>
      </div>
    </div>
  );
}
