import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = '/api';

function NewspaperDetail({ mode }) {
  const { id } = useParams();
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [newspaper, setNewspaper] = useState(null);
  const [sections, setSections] = useState([]);
  const [reporters, setReporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingConfirms, setPendingConfirms] = useState(0);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editIssueNumber, setEditIssueNumber] = useState('');
  const [editPublishDate, setEditPublishDate] = useState('');
  const [editSectionsMode, setEditSectionsMode] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [sectionForm, setSectionForm] = useState({});
  const [addingPage, setAddingPage] = useState(null);
  const [newSectionName, setNewSectionName] = useState('');


  const isAdmin = mode === 'admin';

  useEffect(() => {
    if (!user || !['admin', 'reporter'].includes(user.role)) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('dju_token');
      const res = await axios.get(API + '/newspapers/' + id, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setNewspaper(res.data.newspaper);
      setSections(res.data.sections);
      setPendingConfirms(res.data.pending_confirms || 0);
      setEditIssueNumber(res.data.newspaper.issue_number);
      setEditPublishDate(res.data.newspaper.publish_date ? res.data.newspaper.publish_date.split('T')[0] : '');
      if (isAdmin) {
        const repRes = await axios.get(API + '/newspapers/reporters/list', {
          headers: { Authorization: 'Bearer ' + token }
        });
        setReporters(repRes.data.reporters);
      }
    } catch (err) {
      showToast('신문 정보를 불러올 수 없습니다.', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignReporter = async (sectionId, reporterId) => {
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(API + '/newspapers/sections/' + sectionId + '/assign', {
        reporter_id: reporterId || null
      }, { headers: { Authorization: 'Bearer ' + token } });
      showToast('담당 기자가 지정되었습니다.', 'success');
      fetchData();
    } catch (err) {
      showToast('기자 지정에 실패했습니다.', 'error');
    }
  };

  const handleSaveInfo = async () => {
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(API + '/newspapers/' + id, {
        issue_number: parseInt(editIssueNumber),
        publish_date: editPublishDate,
      }, { headers: { Authorization: 'Bearer ' + token } });
      showToast('신문 정보가 수정되었습니다.', 'success');
      setEditingInfo(false);
      fetchData();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '수정에 실패했습니다.', 'error');
    }
  };

  const startEditSection = (sec) => {
    setEditingSectionId(sec.id);
    setSectionForm({
      section_name: sec.section_name || '',
      volume: sec.volume != null ? sec.volume : '',
      title_max_length: sec.title_max_length != null ? sec.title_max_length : '',
      subtitle_max_length: sec.subtitle_max_length != null ? sec.subtitle_max_length : '',
      has_subtitle: !!sec.has_subtitle,
      photo_required: !!sec.photo_required,
      photo_count: sec.photo_count != null ? sec.photo_count : 1,
    });
  };

  const cancelEditSection = () => {
    setEditingSectionId(null);
    setSectionForm({});
  };

  const handleSaveSection = async (sectionId) => {
    try {
      const token = localStorage.getItem('dju_token');
      await axios.put(API + '/newspapers/sections/' + sectionId, {
        section_name: sectionForm.section_name,
        volume: sectionForm.volume === '' ? null : parseFloat(sectionForm.volume),
        title_max_length: sectionForm.title_max_length === '' ? null : parseInt(sectionForm.title_max_length),
        subtitle_max_length: sectionForm.has_subtitle ? (sectionForm.subtitle_max_length === '' ? null : parseInt(sectionForm.subtitle_max_length)) : null,
        has_subtitle: sectionForm.has_subtitle ? 1 : 0,
        photo_required: sectionForm.photo_required ? 1 : 0,
        photo_count: sectionForm.photo_count === '' ? 1 : parseInt(sectionForm.photo_count),
      }, { headers: { Authorization: 'Bearer ' + token } });
      showToast('지면 정보가 수정되었습니다.', 'success');
      cancelEditSection();
      fetchData();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '지면 수정에 실패했습니다.', 'error');
    }
  };

  const handleAddSection = async (pageNumber) => {
    if (!newSectionName.trim()) {
      showToast('지면 이름을 입력해주세요.', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('dju_token');
      await axios.post(API + '/newspapers/' + id + '/sections', {
        page_number: pageNumber,
        section_name: newSectionName.trim(),
      }, { headers: { Authorization: 'Bearer ' + token } });
      showToast('지면이 추가되었습니다.', 'success');
      setAddingPage(null);
      setNewSectionName('');
      fetchData();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '지면 추가에 실패했습니다.', 'error');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('정말 이 지면을 삭제하시겠습니까? 배치된 빈 기사도 함께 삭제됩니다.')) return;
    try {
      const token = localStorage.getItem('dju_token');
      await axios.delete(API + '/newspapers/sections/' + sectionId, {
        headers: { Authorization: 'Bearer ' + token }
      });
      showToast('지면이 삭제되었습니다.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response && err.response.data ? err.response.data.message : '지면 삭제에 실패했습니다.', 'error');
    }
  };


  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
        return React.createElement('span', { className: 'bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full' }, '컨펌 대기');
      case 'confirming':
        return React.createElement('span', { className: 'bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full' }, '컨펌 진행중');
      case 'confirmed':
        return React.createElement('span', { className: 'bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full' }, '컨펌 완료');
      case 'approved':
        return React.createElement('span', { className: 'bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full' }, '승인 완료');
      case 'draft':
        return React.createElement('span', { className: 'bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full' }, '작성중');
      default:
        return React.createElement('span', { className: 'bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full' }, '미작성');
    }
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-20 text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-3xl mb-4"></i>
        <p>불러오는 중...</p>
      </main>
    );
  }

  if (!newspaper) return null;

  const pages = [...new Set(sections.map(s => s.page_number))].sort((a, b) => a - b);
  const backPath = isAdmin ? '/admin' : '/write';
  const backLabel = isAdmin ? '관리자 패널로 돌아가기' : '기사 작성으로 돌아가기';

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <button
        onClick={() => navigate(backPath)}
        className="text-gray-400 hover:text-[#004b93] mb-6 flex items-center space-x-2 transition"
      >
        <i className="fas fa-arrow-left"></i>
        <span className="font-semibold">{backLabel}</span>
      </button>

      <div className="bg-[#004b93] text-white rounded-3xl p-8 mb-8">
        {editingInfo && isAdmin ? (
          <div>
            <h2 className="text-lg font-bold mb-4">신문 정보 수정</h2>
            <div className="flex items-center space-x-4 mb-4">
              <div>
                <label className="text-blue-200 text-xs block">호수</label>
                <input
                  type="number"
                  value={editIssueNumber}
                  onChange={(e) => setEditIssueNumber(e.target.value)}
                  className="block w-24 px-3 py-2 rounded-lg text-gray-900 font-bold text-center"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs block">발행일</label>
                <input
                  type="date"
                  value={editPublishDate}
                  onChange={(e) => setEditPublishDate(e.target.value)}
                  className="block px-3 py-2 rounded-lg text-gray-900"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button onClick={handleSaveInfo} className="bg-white text-[#004b93] px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition">
                저장
              </button>
              <button onClick={() => setEditingInfo(false)} className="bg-white/20 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/30 transition">
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold mb-2">{newspaper.title}</h1>
              <p className="text-blue-200">
                {'발행일 ' + new Date(newspaper.publish_date).toLocaleDateString('ko-KR') + ' | 작성자 ' + newspaper.creator_name}
              </p>
              {pendingConfirms > 0 && (
                <div className="mt-3 bg-red-500/20 rounded-xl px-4 py-2 inline-block">
                  <span className="font-bold">{'편집장 컨펌 대기 ' + pendingConfirms + '건'}</span>
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingInfo(true)}
                  className="bg-white/20 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/30 transition"
                >
                  <i className="fas fa-edit mr-1"></i>
                  <span>정보 수정</span>
                </button>
                <button
                  onClick={() => { setEditSectionsMode(!editSectionsMode); cancelEditSection(); setAddingPage(null); }}
                  className={'px-4 py-2 rounded-lg font-bold text-sm transition ' + (editSectionsMode ? 'bg-white text-[#004b93] hover:bg-blue-50' : 'bg-white/20 text-white hover:bg-white/30')}
                >
                  <i className="fas fa-layer-group mr-1"></i>
                  <span>{editSectionsMode ? '지면 편집 종료' : '지면 편집'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {pages.map(page => {
        const pageSections = sections.filter(s => s.page_number === page);
        return (
          <div key={page} className="mb-8">
            <h2 className="text-xl font-extrabold text-[#004b93] mb-4 pb-2 border-b border-gray-100">
              {page + '면'}
            </h2>
            <div className="space-y-3">
              {pageSections.map((sec) => {
                const statusClass = sec.article_status === 'submitted' ? 'border-orange-300 bg-orange-50/30' : '';
                const volText = sec.volume ? ('분량 ' + sec.volume) : '';
                const titleText = sec.title_max_length ? (' | 제목 ' + sec.title_max_length + '자') : '';
                const photoText = sec.photo_required ? (' | 사진 ' + sec.photo_count + '장') : '';

                if (isAdmin && editSectionsMode) {
                  if (editingSectionId === sec.id) {
                    return (
                      <div key={sec.id} className="bg-blue-50 rounded-2xl p-5 border-2 border-[#004b93]">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">지면 이름</label>
                            <input
                              type="text"
                              value={sectionForm.section_name}
                              onChange={(e) => setSectionForm({ ...sectionForm, section_name: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">분량</label>
                            <input
                              type="number" step="0.1"
                              value={sectionForm.volume}
                              onChange={(e) => setSectionForm({ ...sectionForm, volume: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">제목 최대 글자수</label>
                            <input
                              type="number"
                              value={sectionForm.title_max_length}
                              onChange={(e) => setSectionForm({ ...sectionForm, title_max_length: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-5">
                            <input
                              type="checkbox"
                              checked={sectionForm.has_subtitle}
                              onChange={(e) => setSectionForm({ ...sectionForm, has_subtitle: e.target.checked })}
                              id={'sub-' + sec.id}
                            />
                            <label htmlFor={'sub-' + sec.id} className="text-sm font-semibold text-gray-700">부제목란 사용</label>
                          </div>
                          {sectionForm.has_subtitle && (
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">부제목 최대 글자수</label>
                              <input
                                type="number"
                                value={sectionForm.subtitle_max_length}
                                onChange={(e) => setSectionForm({ ...sectionForm, subtitle_max_length: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                              />
                            </div>
                          )}
                          <div className="flex items-center space-x-2 pt-5">
                            <input
                              type="checkbox"
                              checked={sectionForm.photo_required}
                              onChange={(e) => setSectionForm({ ...sectionForm, photo_required: e.target.checked })}
                              id={'photo-' + sec.id}
                            />
                            <label htmlFor={'photo-' + sec.id} className="text-sm font-semibold text-gray-700">사진 필요</label>
                          </div>
                          {sectionForm.photo_required && (
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">사진 수</label>
                              <input
                                type="number" min="1"
                                value={sectionForm.photo_count}
                                onChange={(e) => setSectionForm({ ...sectionForm, photo_count: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => handleSaveSection(sec.id)} className="bg-[#004b93] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003a73] transition">저장</button>
                          <button onClick={cancelEditSection} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-300 transition">취소</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={sec.id} className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-extrabold text-gray-900">{sec.section_name}</h3>
                        <p className="text-sm text-gray-400">{volText + titleText + photoText + (sec.has_subtitle ? ' | 부제목 있음' : ' | 부제목 없음')}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => startEditSection(sec)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button onClick={() => handleDeleteSection(sec.id)} className="bg-red-50 text-red-600 px-3 py-2 rounded-xl font-bold text-sm hover:bg-red-100 transition">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  );
                }

                let btnClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
                let btnLabel = '기사 작성';

                if (isAdmin) {
                  btnLabel = sec.article_status === 'submitted' ? '컨펌하기' : sec.article_status === 'confirming' ? '컨펌 중' : sec.article_status === 'approved' ? '승인됨' : '확인하기';
                  if (sec.article_status === 'submitted') btnClass = 'bg-orange-500 text-white hover:bg-orange-600';
                  else if (sec.article_status === 'confirming') btnClass = 'bg-yellow-500 text-white hover:bg-yellow-600';
                  else if (sec.article_status === 'confirmed') btnClass = 'bg-purple-100 text-purple-700 hover:bg-purple-200';
                  else if (sec.article_status === 'approved') btnClass = 'bg-green-100 text-green-700 hover:bg-green-200';
                } else {
                  if (sec.article_status === 'submitted' || sec.article_status === 'confirming') { btnLabel = '컨펌 대기중'; btnClass = 'bg-orange-100 text-orange-700'; }
                  else if (sec.article_status === 'confirmed') { btnLabel = '컨펌 확인'; btnClass = 'bg-purple-500 text-white hover:bg-purple-600'; }
                  else if (sec.article_status === 'approved') { btnLabel = '승인 완료'; btnClass = 'bg-green-100 text-green-700'; }
                }

                return (
                  <div
                    key={sec.id}
                    className={'bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition ' + statusClass}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-10 h-10 bg-[#004b93]/10 rounded-xl flex items-center justify-center text-[#004b93] font-black text-sm">
                          {sec.sort_order}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-extrabold text-gray-900">{sec.section_name}</h3>
                            {getStatusBadge(sec.article_status)}
                          </div>
                          <p className="text-sm text-gray-400">
                            {volText + titleText + photoText}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {isAdmin ? (
                          <select
                            value={sec.assigned_reporter_id || ''}
                            onChange={(e) => handleAssignReporter(sec.id, parseInt(e.target.value) || null)}
                            className="px-3 py-2 rounded-xl border border-gray-200 text-sm min-w-[160px]"
                          >
                            <option value="">미지정</option>
                            {reporters.map(r => (
                              <option key={r.id} value={r.id}>{r.name + ' (' + r.email + ')'}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {sec.reporter_name ? (sec.reporter_name + ' 기자') : '미지정'}
                          </span>
                        )}

                        {sec.article_id && (
                          <button
                            onClick={() => navigate('/write/article/' + sec.id)}
                            className={'px-4 py-2 rounded-xl font-bold text-sm transition ' + btnClass}
                          >
                            {btnLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {isAdmin && editSectionsMode && (
              addingPage === page ? (
                <div className="mt-3 bg-blue-50 rounded-2xl p-4 border-2 border-dashed border-[#004b93] flex items-center space-x-3">
                  <input
                    type="text"
                    autoFocus
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="지면 이름 (예: 2면 토막 3)"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                  <button onClick={() => handleAddSection(page)} className="bg-[#004b93] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003a73] transition">추가</button>
                  <button onClick={() => { setAddingPage(null); setNewSectionName(''); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-300 transition">취소</button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingPage(page); setNewSectionName(''); }}
                  className="mt-3 w-full border-2 border-dashed border-gray-300 text-gray-400 hover:text-[#004b93] hover:border-[#004b93] rounded-2xl p-4 font-bold text-sm transition"
                >
                  <i className="fas fa-plus mr-2"></i>
                  {page + '면에 지면 추가'}
                </button>
              )
            )}
          </div>
        );
      })}
    </main>
  );
}

export default NewspaperDetail;
