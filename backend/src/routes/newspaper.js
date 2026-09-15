const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 기본 지면 배치 형식 정의
const DEFAULT_SECTIONS = [
  { section_key: '1면탑', section_name: '1면 탑', page_number: 1, volume: 7.1, title_max_length: 18, subtitle_max_length: 18, photo_required: 1, photo_count: 1, photo_orientation: '가로형', caption_required: 1, has_body: 1, has_subtitle: 1, sort_order: 1 },
  { section_key: '1면부탑', section_name: '1면 부탑', page_number: 1, volume: 4.9, title_max_length: 14, subtitle_max_length: 25, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 1, sort_order: 2 },
  { section_key: '2면탑', section_name: '2면 탑', page_number: 2, volume: 7.9, title_max_length: 18, subtitle_max_length: 30, photo_required: 1, photo_count: 1, photo_orientation: '가로형', caption_required: 1, has_body: 1, has_subtitle: 1, sort_order: 3 },
  { section_key: '2면부탑', section_name: '2면 부탑', page_number: 2, volume: 5.4, title_max_length: 15, subtitle_max_length: null, photo_required: 1, photo_count: 1, caption_required: 1, has_body: 1, has_subtitle: 0, sort_order: 4 },
  { section_key: '2면토막1', section_name: '2면 토막 1', page_number: 2, volume: 5.6, title_max_length: 12, subtitle_max_length: null, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 5 },
  { section_key: '2면토막2', section_name: '2면 토막 2', page_number: 2, volume: 5.6, title_max_length: 12, subtitle_max_length: null, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 6 },
  { section_key: '3면문화면1', section_name: '3면 문화면 1', page_number: 3, volume: 6.5, title_max_length: 12, subtitle_max_length: null, photo_required: 1, photo_count: 2, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 7 },
  { section_key: '3면문화면2', section_name: '3면 문화면 2', page_number: 3, volume: 6.5, title_max_length: 12, subtitle_max_length: null, photo_required: 1, photo_count: 2, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 8 },
  { section_key: '3면문화면3', section_name: '3면 문화면 3', page_number: 3, volume: 6.5, title_max_length: 12, subtitle_max_length: null, photo_required: 1, photo_count: 2, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 9 },
  { section_key: '3면문화면4', section_name: '3면 문화면 4', page_number: 3, volume: 6.5, title_max_length: 12, subtitle_max_length: null, photo_required: 1, photo_count: 2, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 10 },
  { section_key: '4면칼럼', section_name: '4면 칼럼', page_number: 4, volume: 6.8, title_max_length: null, subtitle_max_length: null, photo_required: 1, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 11 },
  { section_key: '4면기자한마디', section_name: '4면 기자한마디', page_number: 4, volume: 3.6, title_max_length: 15, subtitle_max_length: null, photo_required: 1, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 12 },
  { section_key: '4면한컷대진', section_name: '4면 한컷대진', page_number: 4, volume: null, title_max_length: null, subtitle_max_length: null, photo_required: 1, photo_count: 1, caption_required: 1, has_body: 0, has_subtitle: 0, sort_order: 13 },
  { section_key: '4면조명탑1', section_name: '4면 조명탑 1', page_number: 4, volume: 3.5, title_max_length: 10, subtitle_max_length: null, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 14 },
  { section_key: '4면조명탑2', section_name: '4면 조명탑 2', page_number: 4, volume: 3.5, title_max_length: 10, subtitle_max_length: null, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 15 },
  { section_key: '5면조명탑3', section_name: '5면 조명탑 3', page_number: 5, volume: 3.5, title_max_length: 10, subtitle_max_length: null, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 16 },
  { section_key: '5면기획탑', section_name: '5면 기획 탑', page_number: 5, volume: 14.1, title_min_length: 16, title_max_length: null, subtitle_min_length: 25, subtitle_max_length: null, photo_required: 1, photo_count: 2, caption_required: 0, has_body: 1, has_subtitle: 1, sort_order: 17 },
  { section_key: '5면지역사회', section_name: '5면 지역사회', page_number: 5, volume: 8.0, title_max_length: 18, subtitle_max_length: 25, photo_required: 1, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 1, sort_order: 18 },
  { section_key: '6면기획1', section_name: '6면 기획 1', page_number: 6, volume: 7.9, title_max_length: 18, subtitle_max_length: 25, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 1, sort_order: 19 },
  { section_key: '6면기획2', section_name: '6면 기획 2', page_number: 6, volume: 7.8, title_max_length: 14, subtitle_max_length: 18, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 1, sort_order: 20 },
  { section_key: '6면기획3', section_name: '6면 기획 3', page_number: 6, volume: 6.5, title_max_length: 14, subtitle_max_length: null, photo_required: 0, photo_count: 1, caption_required: 0, has_body: 1, has_subtitle: 0, sort_order: 21 },
];

// ─── 신문 목록 조회 (관리자/기자) ───
router.get('/', authenticate, authorize('admin', 'reporter'), async (req, res) => {
  try {
    const [newspapers] = await pool.query(
      `SELECT n.*, u.name as creator_name,
        (SELECT COUNT(*) FROM articles a WHERE a.newspaper_id = n.id AND a.status = 'submitted') as pending_confirms
      FROM newspapers n
      JOIN users u ON n.created_by = u.id
      ORDER BY n.created_at DESC`
    );
    res.json({ newspapers });
  } catch (err) {
    console.error('신문 목록 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 신문 생성 (관리자만) ───
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { issue_number, publish_date, sections } = req.body;

  if (!issue_number || !publish_date) {
    return res.status(400).json({ message: '호수와 발행일을 입력해주세요.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const title = `대진대 신문사 제${issue_number}호 신문`;

    // 신문 생성
    const [result] = await conn.query(
      'INSERT INTO newspapers (issue_number, title, publish_date, created_by) VALUES (?, ?, ?, ?)',
      [issue_number, title, publish_date, req.user.id]
    );
    const newspaperId = result.insertId;

    // 지면 배치 생성 (사용자 커스텀 또는 기본 형식)
    const sectionsToInsert = (sections && sections.length > 0) ? sections : DEFAULT_SECTIONS;

    for (const sec of sectionsToInsert) {
      const [secResult] = await conn.query(
        `INSERT INTO newspaper_sections
          (newspaper_id, section_key, section_name, page_number, volume,
           title_max_length, title_min_length, subtitle_max_length, subtitle_min_length,
           photo_required, photo_count, photo_orientation, caption_required,
           has_body, has_subtitle, sort_order, assigned_reporter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newspaperId, sec.section_key, sec.section_name, sec.page_number, sec.volume || null,
          sec.title_max_length || null, sec.title_min_length || null,
          sec.subtitle_max_length || null, sec.subtitle_min_length || null,
          sec.photo_required || 0, sec.photo_count || 1, sec.photo_orientation || null,
          sec.caption_required || 0, sec.has_body !== undefined ? sec.has_body : 1,
          sec.has_subtitle !== undefined ? sec.has_subtitle : 1,
          sec.sort_order || 0, sec.assigned_reporter_id || null
        ]
      );

      // 해당 지면에 빈 기사 레코드 생성
      await conn.query(
        `INSERT INTO articles (section_id, newspaper_id, status) VALUES (?, ?, 'empty')`,
        [secResult.insertId, newspaperId]
      );
    }

    await conn.commit();
    res.status(201).json({ message: `${title} 생성 완료`, newspaper_id: newspaperId });
  } catch (err) {
    await conn.rollback();
    console.error('신문 생성 에러:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 존재하는 호수입니다.' });
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  } finally {
    conn.release();
  }
});

// ─── 기자 목록 조회 (관리자용 - 담당 지정 시) ───
router.get('/reporters/list', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [reporters] = await pool.query(
      "SELECT id, name, nickname, email FROM users WHERE role IN ('reporter', 'admin') AND is_active = 1 ORDER BY name"
    );
    res.json({ reporters });
  } catch (err) {
    console.error('기자 목록 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 전체 pending confirm 수 (편집장 알림 뱃지용) ───
router.get('/confirms/count', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      "SELECT COUNT(*) as count FROM articles WHERE status IN ('submitted', 'confirming')"
    );
    res.json({ count: result[0].count });
  } catch (err) {
    console.error('컨펌 카운트 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 기사 검색 (제목·본문·기자명) ───
router.get('/search', async (req, res) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    const keyword = q.trim();
    if (!keyword) return res.json({ articles: [], total: 0, page: 1, totalPages: 0, query: '' });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${keyword}%`;
    const matchParams = [like, like, like];

    const whereClause = `
      a.status = 'approved'
      AND (
        a.title        LIKE ? OR
        a.body         LIKE ? OR
        a.reporter_name LIKE ?
      )
    `;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       JOIN newspapers n ON a.newspaper_id = n.id
       WHERE ${whereClause}`,
      matchParams
    );

    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.subtitle, a.body, a.photo1_url, a.reporter_name,
              a.approved_at,
              ns.section_key, ns.section_name, ns.page_number,
              n.issue_number, n.title AS newspaper_title, n.publish_date
       FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       JOIN newspapers n ON a.newspaper_id = n.id
       WHERE ${whereClause}
       ORDER BY a.approved_at DESC
       LIMIT ? OFFSET ?`,
      [...matchParams, parseInt(limit), offset]
    );

    res.json({
      articles,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      query: keyword,
    });
  } catch (err) {
    console.error('기사 검색 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 신문 상세 + 지면 목록 조회 ───
router.get('/:id', authenticate, authorize('admin', 'reporter'), async (req, res) => {
  try {
    const [newspapers] = await pool.query(
      'SELECT n.*, u.name as creator_name FROM newspapers n JOIN users u ON n.created_by = u.id WHERE n.id = ?',
      [req.params.id]
    );

    if (newspapers.length === 0) {
      return res.status(404).json({ message: '신문을 찾을 수 없습니다.' });
    }

    const [sections] = await pool.query(
      `SELECT ns.*, u.name as reporter_name, u.nickname as reporter_nickname,
        a.id as article_id, a.title as article_title, a.status as article_status,
        a.submitted_at, a.confirmed_at
      FROM newspaper_sections ns
      LEFT JOIN users u ON ns.assigned_reporter_id = u.id
      LEFT JOIN articles a ON a.section_id = ns.id
      WHERE ns.newspaper_id = ?
      ORDER BY ns.sort_order ASC`,
      [req.params.id]
    );

    // pending_confirms 카운트
    const [confirmCount] = await pool.query(
      `SELECT COUNT(*) as count FROM articles WHERE newspaper_id = ? AND status IN ('submitted', 'confirming')`,
      [req.params.id]
    );

    res.json({
      newspaper: newspapers[0],
      sections,
      pending_confirms: confirmCount[0].count
    });
  } catch (err) {
    console.error('신문 상세 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 신문 발행 처리 (관리자만) ───
router.put('/:id/publish', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, status FROM newspapers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '신문을 찾을 수 없습니다.' });
    }

    const [pending] = await pool.query(
      `SELECT COUNT(*) as count FROM articles WHERE newspaper_id = ? AND status IN ('submitted', 'confirming')`,
      [req.params.id]
    );
    if (pending[0].count > 0) {
      return res.status(400).json({ message: '컨펌 대기/진행 중인 기사가 있어 발행할 수 없습니다.' });
    }

    await pool.query(
      `UPDATE newspapers SET status = 'published', published_at = NOW() WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: '신문이 발행되었습니다.' });
  } catch (err) {
    console.error('신문 발행 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 신문 발행 취소 (관리자만) ───
router.put('/:id/unpublish', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query(
      `UPDATE newspapers SET status = 'in_progress', published_at = NULL WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: '신문 발행이 취소되었습니다.' });
  } catch (err) {
    console.error('신문 발행 취소 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 신문 정보 수정 (관리자만 - 호수, 발행일) ───
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { issue_number, publish_date } = req.body;

  if (!issue_number || !publish_date) {
    return res.status(400).json({ message: '호수와 발행일을 입력해주세요.' });
  }

  try {
    const title = `대진대 신문사 제${issue_number}호 신문`;
    
    await pool.query(
      'UPDATE newspapers SET issue_number = ?, publish_date = ?, title = ? WHERE id = ?',
      [issue_number, publish_date, title, req.params.id]
    );

    res.json({ message: '신문 정보가 수정되었습니다.' });
  } catch (err) {
    console.error('신문 수정 에러:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 존재하는 호수입니다.' });
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 지면 담당 기자 지정 (관리자만) ───
router.put('/sections/:sectionId/assign', authenticate, authorize('admin'), async (req, res) => {
  const { reporter_id } = req.body;

  try {
    // 기자 역할 확인
    if (reporter_id) {
      const [users] = await pool.query('SELECT id, role, name FROM users WHERE id = ? AND role IN ("reporter", "admin")', [reporter_id]);
      if (users.length === 0) {
        return res.status(400).json({ message: '유효한 기자를 선택해주세요.' });
      }
    }

    await pool.query(
      'UPDATE newspaper_sections SET assigned_reporter_id = ? WHERE id = ?',
      [reporter_id || null, req.params.sectionId]
    );

    res.json({ message: '담당 기자가 지정되었습니다.' });
  } catch (err) {
    console.error('기자 지정 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 지면 정보 수정 (관리자만 - 이름, 분량, 글자수, 부제목 유무 등) ───
router.put('/sections/:sectionId', authenticate, authorize('admin'), async (req, res) => {
  const {
    section_name, volume, title_max_length, title_min_length,
    subtitle_max_length, subtitle_min_length,
    photo_required, photo_count, photo_orientation,
    caption_required, has_body, has_subtitle
  } = req.body;

  try {
    await pool.query(
      `UPDATE newspaper_sections SET
        section_name = COALESCE(?, section_name),
        volume = COALESCE(?, volume),
        title_max_length = ?,
        title_min_length = ?,
        subtitle_max_length = ?,
        subtitle_min_length = ?,
        photo_required = COALESCE(?, photo_required),
        photo_count = COALESCE(?, photo_count),
        photo_orientation = ?,
        caption_required = COALESCE(?, caption_required),
        has_body = COALESCE(?, has_body),
        has_subtitle = COALESCE(?, has_subtitle)
      WHERE id = ?`,
      [
        section_name || null, volume, title_max_length, title_min_length,
        subtitle_max_length, subtitle_min_length,
        photo_required, photo_count, photo_orientation,
        caption_required, has_body, has_subtitle,
        req.params.sectionId
      ]
    );
    res.json({ message: '지면 정보가 수정되었습니다.' });
  } catch (err) {
    console.error('지면 수정 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 지면(칸) 추가 (관리자만) ───
router.post('/:newspaperId/sections', authenticate, authorize('admin'), async (req, res) => {
  const { page_number, section_name } = req.body;

  if (!page_number || !section_name) {
    return res.status(400).json({ message: '면 번호와 지면 이름을 입력해주세요.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 해당 신문에 속하는지 확인
    const [np] = await conn.query('SELECT id FROM newspapers WHERE id = ?', [req.params.newspaperId]);
    if (np.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: '신문을 찾을 수 없습니다.' });
    }

    // 가장 큰 sort_order 다음 순번 부여
    const [[{ maxSort }]] = await conn.query(
      'SELECT COALESCE(MAX(sort_order), 0) as maxSort FROM newspaper_sections WHERE newspaper_id = ?',
      [req.params.newspaperId]
    );
    const nextSort = maxSort + 1;
    const section_key = `custom${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const [secResult] = await conn.query(
      `INSERT INTO newspaper_sections
        (newspaper_id, section_key, section_name, page_number, volume,
         title_max_length, subtitle_max_length, photo_required, photo_count,
         caption_required, has_body, has_subtitle, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.newspaperId, section_key, section_name, page_number, null,
        null, null, 0, 1, 0, 1, 1, nextSort
      ]
    );

    await conn.query(
      `INSERT INTO articles (section_id, newspaper_id, status) VALUES (?, ?, 'empty')`,
      [secResult.insertId, req.params.newspaperId]
    );

    await conn.commit();
    res.status(201).json({ message: '지면이 추가되었습니다.', section_id: secResult.insertId });
  } catch (err) {
    await conn.rollback();
    console.error('지면 추가 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  } finally {
    conn.release();
  }
});

// ─── 지면(칸) 삭제 (관리자만, 이미 작성/제출된 기사가 있으면 삭제 불가) ───
router.delete('/sections/:sectionId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [articles] = await pool.query(
      "SELECT id, status FROM articles WHERE section_id = ?",
      [req.params.sectionId]
    );

    const hasContent = articles.some(a => !['empty', 'draft'].includes(a.status));
    if (hasContent) {
      return res.status(400).json({ message: '이미 제출되었거나 승인된 기사가 있는 지면은 삭제할 수 없습니다.' });
    }

    await pool.query('DELETE FROM newspaper_sections WHERE id = ?', [req.params.sectionId]);
    res.json({ message: '지면이 삭제되었습니다.' });
  } catch (err) {
    console.error('지면 삭제 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 승인된 기사 조회 (공개 API - 메인 페이지용) ───
router.get('/approved/articles', async (req, res) => {
  try {
    // 관리자가 명시적으로 '발행' 처리한 호수 중 가장 최근 호수를 우선 노출
    // (발행 처리된 호수가 하나도 없다면, 과거 호환을 위해 가장 최근에 승인된 기사가 속한 호수를 사용)
    let [latestNewspaper] = await pool.query(
      `SELECT id, issue_number, title, publish_date FROM newspapers
       WHERE status = 'published'
       ORDER BY published_at DESC LIMIT 1`
    );

    if (latestNewspaper.length === 0) {
      [latestNewspaper] = await pool.query(
        `SELECT n.id, n.issue_number, n.title, n.publish_date FROM newspapers n
         WHERE n.id = (
           SELECT a.newspaper_id FROM articles a WHERE a.status = 'approved'
           ORDER BY a.approved_at DESC LIMIT 1
         )`
      );
    }

    if (latestNewspaper.length === 0) {
      return res.json({ newspaper: null, articles: [], tabs: [] });
    }

    const np = latestNewspaper[0];

    // 해당 호수의 승인된 기사 (한컷대진 제외)
    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.subtitle, a.body, a.photo1_url, a.reporter_name,
              ns.section_key, ns.section_name, ns.page_number, ns.sort_order
       FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       WHERE a.newspaper_id = ? AND a.status = 'approved' AND ns.section_key != '4면한컷대진'
       ORDER BY ns.sort_order ASC`,
      [np.id]
    );

    // 탭 구성: 1면탑, 2면탑, 3면문화면1, 4면칼럼, 5면기획탑, 6면기획1 의 제목
    const tabKeys = ['1면탑', '2면탑', '3면문화면1', '4면칼럼', '5면기획탑', '6면기획1'];
    const tabArticles = tabKeys.map(key => articles.find(a => a.section_key === key)).filter(Boolean);
    const tabs = ['전체뉴스보기', ...tabArticles.map(a => a.title || a.section_name)];

    // 각 탭의 페이지 번호 매핑
    const tabPageMap = [null, ...tabArticles.map(a => a.page_number)];

    res.json({ newspaper: np, articles, tabs, tabPageMap });
  } catch (err) {
    console.error('승인 기사 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 섹션별 승인 기사 목록 (공개) ───
// slug 매핑: 대학뉴스 → 1면·2면, 학술·문화 → 문화면, 오피니언 → 조명탑
// 기획특집 → 기획, 학생자치 → 1면, 지역사회 → 지역사회
// query param: ?section=대학뉴스&page=1&limit=20
router.get('/section/articles', async (req, res) => {
  try {
    const { section = '전체', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 섹션 → section_key 키워드 매핑
    const SECTION_KEYS = {
      '대학뉴스':  ['1면', '2면'],
      '학술·문화': ['문화면', '2면'],
      '오피니언':  ['조명탑', '칼럼', '기자한마디'],
      '기획특집':  ['기획'],
      '학생자치':  ['1면'],
      '지역사회':  ['지역사회'],
    };

    let whereClause = `a.status = 'approved' AND ns.section_key != '4면한컷대진'`;
    let params = [];

    if (section !== '전체' && SECTION_KEYS[section]) {
      const keys = SECTION_KEYS[section];
      const conditions = keys.map(() => `ns.section_key LIKE ?`).join(' OR ');
      whereClause += ` AND (${conditions})`;
      params = keys.map(k => `%${k}%`);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       JOIN newspapers n ON a.newspaper_id = n.id
       WHERE ${whereClause}`,
      params
    );

    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.subtitle, a.body, a.photo1_url, a.reporter_name,
              a.approved_at,
              ns.section_key, ns.section_name, ns.page_number,
              n.issue_number, n.title AS newspaper_title, n.publish_date
       FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       JOIN newspapers n ON a.newspaper_id = n.id
       WHERE ${whereClause}
       ORDER BY a.approved_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      articles,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      section,
    });
  } catch (err) {
    console.error('섹션별 기사 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
