import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = `http://${window.location.hostname}:5000/api`;

const DEFAULT_SECTIONS = [
  { section_key: '1면탑', section_name: '1면 탑', page_number: 1, volume: 7.1, title_max_length: 18, subtitle_max_length: 18, photo_required: true, photo_count: 1, photo_orientation: '가로형', caption_required: true, has_body: true, has_subtitle: true, sort_order: 1 },
  { section_key: '1면부탑', section_name: '1면 부탑', page_number: 1, volume: 4.9, title_max_length: 14, subtitle_max_length: 25, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: true, sort_order: 2 },
  { section_key: '2면탑', section_name: '2면 탑', page_number: 2, volume: 7.9, title_max_length: 18, subtitle_max_length: 30, photo_required: true, photo_count: 1, photo_orientation: '가로형', caption_required: true, has_body: true, has_subtitle: true, sort_order: 3 },
  { section_key: '2면부탑', section_name: '2면 부탑', page_number: 2, volume: 5.4, title_max_length: 15, photo_required: true, photo_count: 1, caption_required: true, has_body: true, has_subtitle: false, sort_order: 4 },
  { section_key: '2면토막1', section_name: '2면 토막 1', page_number: 2, volume: 5.6, title_max_length: 12, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: false, sort_order: 5 },
  { section_key: '2면토막2', section_name: '2면 토막 2', page_number: 2, volume: 5.6, title_max_length: 12, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: false, sort_order: 6 },
  { section_key: '3면문화면1', section_name: '3면 문화면 1', page_number: 3, volume: 6.5, title_max_length: 12, photo_required: true, photo_count: 2, caption_required: false, has_body: true, has_subtitle: false, sort_order: 7 },
  { section_key: '3면문화면2', section_name: '3면 문화면 2', page_number: 3, volume: 6.5, title_max_length: 12, photo_required: true, photo_count: 2, caption_required: false, has_body: true, has_subtitle: false, sort_order: 8 },
  { section_key: '3면문화면3', section_name: '3면 문화면 3', page_number: 3, volume: 6.5, title_max_length: 12, photo_required: true, photo_count: 2, caption_required: false, has_body: true, has_subtitle: false, sort_order: 9 },
  { section_key: '3면문화면4', section_name: '3면 문화면 4', page_number: 3, volume: 6.5, title_max_length: 12, photo_required: true, photo_count: 2, caption_required: false, has_body: true, has_subtitle: false, sort_order: 10 },
  { section_key: '4면칼럼', section_name: '4면 칼럼', page_number: 4, volume: 6.8, title_max_length: null, photo_required: true, photo_count: 1, caption_required: false, has_body: true, has_subtitle: false, sort_order: 11 },
  { section_key: '4면기자한마디', section_name: '4면 기자한마디', page_number: 4, volume: 3.6, title_max_length: 15, photo_required: true, photo_count: 1, caption_required: false, has_body: true, has_subtitle: false, sort_order: 12 },
  { section_key: '4면한컷대진', section_name: '4면 한컷대진', page_number: 4, volume: null, title_max_length: null, photo_required: true, photo_count: 1, caption_required: true, has_body: false, has_subtitle: false, sort_order: 13 },
  { section_key: '4면조명탑1', section_name: '4면 조명탑 1', page_number: 4, volume: 3.5, title_max_length: 10, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: false, sort_order: 14 },
  { section_key: '4면조명탑2', section_name: '4면 조명탑 2', page_number: 4, volume: 3.5, title_max_length: 10, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: false, sort_order: 15 },
  { section_key: '5면조명탑3', section_name: '5면 조명탑 3', page_number: 5, volume: 3.5, title_max_length: 10, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: false, sort_order: 16 },
  { section_key: '5면기획탑', section_name: '5면 기획 탑', page_number: 5, volume: 14.1, title_min_length: 16, title_max_length: null, subtitle_min_length: 25, photo_required: true, photo_count: 2, caption_required: false, has_body: true, has_subtitle: true, sort_order: 17 },
  { section_key: '5면지역사회', section_name: '5면 지역사회', page_number: 5, volume: 8.0, title_max_length: 18, subtitle_max_length: 25, photo_required: true, photo_count: 1, caption_required: false, has_body: true, has_subtitle: true, sort_order: 18 },
  { section_key: '6면기획1', section_name: '6면 기획 1', page_number: 6, volume: 7.9, title_max_length: 18, subtitle_max_length: 25, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: true, sort_order: 19 },
  { section_key: '6면기획2', section_name: '6면 기획 2', page_number: 6, volume: 7.8, title_max_length: 14, subtitle_max_length: 18, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: true, sort_order: 20 },
  { section_key: '6면기획3', section_name: '6면 기획 3', page_number: 6, volume: 6.5, title_max_length: 14, photo_required: false, photo_count: 1, caption_required: false, has_body: true, has_subtitle: false, sort_order: 21 },
];

function CreateNewspaper() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [issueNumber, setIssueNumber] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [reporters, setReporters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchReporters();
  }, [user, navigate]);

  const fetchReporters = async () => {
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.get(API + '/newspapers/reporters/list', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setReporters(res.data.reporters);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSectionChange = (index, field, value) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleSubmit = async () => {
    if (!issueNumber || !publishDate) {
      showToast('호수와 발행일을 입력해주세요.', 'error');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('dju_token');
      const payload = {
        issue_number: parseInt(issueNumber),
        publish_date: publishDate,
        sections: sections.map(s => ({
          ...s,
          photo_required: s.photo_required ? 1 : 0,
          caption_required: s.caption_required ? 1 : 0,
          has_body: s.has_body ? 1 : 0,
          has_subtitle: s.has_subtitle ? 1 : 0,
        }))
      };
      await axios.post(API + '/newspapers', payload, {
        headers: { Authorization: 'Bearer ' + token }
      });
      showToast('대진대 신문사 제' + issueNumber + '호 신문이 생성되었습니다!', 'success');
      navigate('/admin');
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '생성에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pages = [1, 2, 3, 4, 5, 6];

  if (!user || user.role !== 'admin') return null;

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-[#004b93] mb-6 flex items-center space-x-2 transition">
        <i className="fas fa-arrow-left"></i>
        <span className="font-semibold">관리자 패널로 돌아가기</span>
      </button>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">호수 별 신문 생성</h1>
      <p className="text-gray-500 mb-8">신문의 기본 정보를 입력하고 지면 배치를 설정합니다.</p>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
        <h2 className="text-xl font-extrabold mb-6 flex items-center">
          <span className="w-2 h-6 bg-[#004b93] mr-3 rounded-full"></span>
          기본 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">호수 번호 *</label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2 font-semibold">대진대 신문사 제</span>
              <input
                type="number"
                value={issueNumber}
                onChange={(e) => setIssueNumber(e.target.value)}
                className="w-24 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#004b93] focus:border-transparent text-center font-bold text-lg"
                placeholder="000"
              />
              <span className="text-gray-500 ml-2 font-semibold">호 신문</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">발행일 *</label>
            <input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#004b93] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
        <h2 className="text-xl font-extrabold mb-2 flex items-center">
          <span className="w-2 h-6 bg-[#004b93] mr-3 rounded-full"></span>
          지면 배치 및 담당 기자 지정
        </h2>
        <p className="text-sm text-gray-400 mb-6">기본 형식이 적용되어 있으며 필요 시 수정할 수 있습니다. 각 지면에 담당 기자를 지정해주세요.</p>

        {pages.map(page => {
          const pageSections = sections.filter(s => s.page_number === page);
          if (pageSections.length === 0) return null;
          return (
            <div key={page} className="mb-8">
              <h3 className="text-lg font-extrabold text-[#004b93] mb-4 pb-2 border-b border-gray-100">
                {page + '면'}
              </h3>
              <div className="space-y-3">
                {pageSections.map((sec) => {
                  const idx = sections.findIndex(s => s.section_key === sec.section_key && s.sort_order === sec.sort_order);
                  return (
                    <div key={sec.sort_order} className="grid grid-cols-12 gap-3 items-center p-4 bg-gray-50 rounded-2xl">
                      <div className="col-span-2">
                        <span className="font-bold text-sm text-gray-800">{sec.section_name}</span>
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-400">분량</label>
                        <input
                          type="number"
                          step="0.1"
                          value={sec.volume || ''}
                          onChange={(e) => handleSectionChange(idx, 'volume', parseFloat(e.target.value) || null)}
                          className="w-full px-2 py-1 rounded-lg border border-gray-200 text-sm text-center"
                          placeholder="-"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-400">제목 글자수</label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={sec.title_min_length || ''}
                            onChange={(e) => handleSectionChange(idx, 'title_min_length', parseInt(e.target.value) || null)}
                            className="w-full px-2 py-1 rounded-lg border border-gray-200 text-sm text-center"
                            placeholder="최소"
                          />
                          <span className="text-gray-400 text-xs">~</span>
                          <input
                            type="number"
                            value={sec.title_max_length || ''}
                            onChange={(e) => handleSectionChange(idx, 'title_max_length', parseInt(e.target.value) || null)}
                            className="w-full px-2 py-1 rounded-lg border border-gray-200 text-sm text-center"
                            placeholder="최대"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center space-x-2">
                        <label className="flex items-center space-x-1 text-xs">
                          <input type="checkbox" checked={sec.photo_required} onChange={(e) => handleSectionChange(idx, 'photo_required', e.target.checked)} className="rounded" />
                          <span>사진필수</span>
                        </label>
                        <input
                          type="number"
                          value={sec.photo_count}
                          onChange={(e) => handleSectionChange(idx, 'photo_count', parseInt(e.target.value) || 1)}
                          className="w-12 px-1 py-1 rounded-lg border border-gray-200 text-sm text-center"
                          min="1" max="5"
                        />
                        <label className="flex items-center space-x-1 text-xs">
                          <input type="checkbox" checked={sec.caption_required} onChange={(e) => handleSectionChange(idx, 'caption_required', e.target.checked)} className="rounded" />
                          <span>캡션필수</span>
                        </label>
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-gray-400">담당 기자</label>
                        <select
                          value={sec.assigned_reporter_id || ''}
                          onChange={(e) => handleSectionChange(idx, 'assigned_reporter_id', parseInt(e.target.value) || null)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                        >
                          <option value="">미지정</option>
                          {reporters.map(r => (
                            <option key={r.id} value={r.id}>{r.name + ' (' + r.email + ')'}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end space-x-4">
        <button onClick={() => navigate('/admin')} className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition">
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[#004b93] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#003a75] transition disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
          <span>{loading ? '생성 중...' : '신문 생성'}</span>
        </button>
      </div>
    </main>
  );
}

export default CreateNewspaper;
