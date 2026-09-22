const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'));
  }
});

// ─── 컨펌 요청 대상(편집장/부편집장) 목록 조회 ───
// 기자/수습기자(또는 직책 미지정) → 편집장·부편집장 전체
// 편집장 → 부편집장만 / 부편집장 → 편집장만 (서로에게만 요청 가능)
router.get('/confirm-targets', authenticate, authorize('admin', 'reporter'), async (req, res) => {
  try {
    const [[me]] = await pool.query('SELECT position FROM users WHERE id = ?', [req.user.id]);
    const myPos = me ? me.position : null;

    let targets;
    if (myPos === '편집장' || myPos === '부편집장') {
      const other = myPos === '편집장' ? '부편집장' : '편집장';
      // position이 비어있는 관리자 계정(초기 시딩된 최고관리자 등)은 '편집장'으로 간주
      [targets] = await pool.query(
        other === '편집장'
          ? "SELECT id, name, nickname, COALESCE(position, '편집장') as position FROM users WHERE (position = '편집장' OR position IS NULL) AND role = 'admin' AND is_active = 1 AND id != ?"
          : "SELECT id, name, nickname, position FROM users WHERE position = '부편집장' AND role = 'admin' AND is_active = 1 AND id != ?",
        [req.user.id]
      );
    } else {
      [targets] = await pool.query(
        "SELECT id, name, nickname, COALESCE(position, '편집장') as position FROM users WHERE (position IN ('편집장','부편집장') OR position IS NULL) AND role = 'admin' AND is_active = 1"
      );
    }

    res.json({ targets, my_position: myPos });
  } catch (err) {
    console.error('컨펌 대상 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 공개: 기사 단건 조회 (승인된 기사, 인증 불필요) ───
router.get('/:articleId/public', async (req, res) => {
  try {
    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.subtitle, a.body,
              a.photo1_url, a.photo2_url,
              a.caption1, a.caption2,
              a.reporter_name, a.reporter_email,
              a.approved_at, a.revised_at,
              ns.section_key, ns.section_name, ns.page_number,
              ns.has_subtitle, ns.has_body, ns.photo_count, ns.caption_required,
              n.issue_number, n.title as newspaper_title, n.publish_date
       FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       JOIN newspapers n ON a.newspaper_id = n.id
       WHERE a.id = ? AND a.status = 'approved'`,
      [req.params.articleId]
    );
    if (articles.length === 0) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    res.json({ article: articles[0] });
  } catch (err) {
    console.error('공개 기사 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 조회수/체류시간 기록은 routes/views.js 에서 처리 (server.js에서 먼저 등록됨) ───


// ─── 내가 담당하는 기사 목록 (기자용) ───
router.get('/my/assigned', authenticate, authorize('admin', 'reporter'), async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `
        SELECT a.id as article_id, a.status as article_status, a.title as article_title,
          ns.*, n.title as newspaper_title, n.issue_number, n.publish_date,
          u.name as reporter_name
        FROM newspaper_sections ns
        JOIN articles a ON a.section_id = ns.id
        JOIN newspapers n ON ns.newspaper_id = n.id
        LEFT JOIN users u ON ns.assigned_reporter_id = u.id
        ORDER BY n.issue_number DESC, ns.sort_order ASC`;
      params = [];
    } else {
      query = `
        SELECT a.id as article_id, a.status as article_status, a.title as article_title,
          ns.*, n.title as newspaper_title, n.issue_number, n.publish_date,
          u.name as reporter_name
        FROM newspaper_sections ns
        JOIN articles a ON a.section_id = ns.id
        JOIN newspapers n ON ns.newspaper_id = n.id
        LEFT JOIN users u ON ns.assigned_reporter_id = u.id
        WHERE ns.assigned_reporter_id = ?
        ORDER BY n.issue_number DESC, ns.sort_order ASC`;
      params = [req.user.id];
    }

    const [articles] = await pool.query(query, params);
    res.json({ articles });
  } catch (err) {
    console.error('담당 기사 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 기사 조회 (지면별) ───
router.get('/section/:sectionId', authenticate, authorize('admin', 'reporter'), async (req, res) => {
  try {
    const [articles] = await pool.query(
      `SELECT a.*, ns.section_key, ns.section_name, ns.page_number, ns.volume,
        ns.title_max_length, ns.title_min_length, ns.subtitle_max_length, ns.subtitle_min_length,
        ns.photo_required, ns.photo_count, ns.photo_orientation, ns.caption_required,
        ns.has_body, ns.has_subtitle, ns.assigned_reporter_id,
        u.name as assigned_reporter_name,
        t.name as confirm_target_name, t.position as confirm_target_position
      FROM articles a
      JOIN newspaper_sections ns ON a.section_id = ns.id
      LEFT JOIN users u ON ns.assigned_reporter_id = u.id
      LEFT JOIN users t ON a.confirm_target_id = t.id
      WHERE a.section_id = ?`,
      [req.params.sectionId]
    );

    if (articles.length === 0) {
      return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    }

    const article = articles[0];

    // 기자인 경우 본인 담당 지면만 접근 가능
    if (req.user.role === 'reporter' && article.assigned_reporter_id !== req.user.id) {
      return res.status(403).json({ message: '본인이 담당하지 않는 지면입니다.' });
    }

    res.json({ article });
  } catch (err) {
    console.error('기사 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 기사 저장 (임시저장/작성) ───
router.put('/:articleId', authenticate, authorize('admin', 'reporter'), async (req, res) => {
  const { title, subtitle, body, caption1, caption2, reporter_name, reporter_email } = req.body;

  try {
    const [articles] = await pool.query(
      `SELECT a.*, ns.assigned_reporter_id FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       WHERE a.id = ?`,
      [req.params.articleId]
    );

    if (articles.length === 0) {
      return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    }

    const article = articles[0];

    if (article.assigned_reporter_id !== req.user.id) {
      return res.status(403).json({ message: '본인이 담당하지 않는 지면입니다.' });
    }

    // 작성자는 submitted/confirming 상태에서 수정 불가
    if (['submitted', 'confirming'].includes(article.status)) {
      return res.status(403).json({ message: '컨펌 대기/진행 중인 기사는 수정할 수 없습니다.' });
    }

    const wasApproved = article.status === 'approved';

    await pool.query(
      `UPDATE articles SET
        title = ?, subtitle = ?, body = ?,
        caption1 = ?, caption2 = ?,
        reporter_name = ?, reporter_email = ?,
        written_by = ?,
        status = CASE
          WHEN status IN ('empty', 'approved') THEN 'draft'
          ELSE status
        END,
        revised_at = CASE WHEN status = 'approved' THEN NOW() ELSE revised_at END
      WHERE id = ?`,
      [title, subtitle, body, caption1, caption2, reporter_name, reporter_email, req.user.id, req.params.articleId]
    );

    res.json({ message: '기사가 저장되었습니다.', wasApproved });
  } catch (err) {
    console.error('기사 저장 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 사진 업로드 ───
router.post('/:articleId/upload', authenticate, authorize('admin', 'reporter'), upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '파일을 선택해주세요.' });
  }

  const { slot } = req.body; // 'photo1' or 'photo2'
  const photoUrl = `/uploads/${req.file.filename}`;
  const column = slot === 'photo2' ? 'photo2_url' : 'photo1_url';

  try {
    await pool.query(`UPDATE articles SET ${column} = ? WHERE id = ?`, [photoUrl, req.params.articleId]);
    res.json({ message: '사진이 업로드되었습니다.', url: photoUrl });
  } catch (err) {
    console.error('사진 업로드 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 컨펌 요청 (기자/편집장/부편집장 → 지정한 편집장 또는 부편집장) ───
router.put('/:articleId/submit', authenticate, authorize('admin', 'reporter'), async (req, res) => {
  const { target_id } = req.body;
  try {
    const [articles] = await pool.query(
      `SELECT a.*, ns.assigned_reporter_id, ns.section_name FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       WHERE a.id = ?`,
      [req.params.articleId]
    );

    if (articles.length === 0) {
      return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    }

    const article = articles[0];

    if (article.assigned_reporter_id !== req.user.id) {
      return res.status(403).json({ message: '본인이 담당하지 않는 기사입니다.' });
    }

    if (!target_id) {
      return res.status(400).json({ message: '컨펌을 요청할 편집장/부편집장을 선택해주세요.' });
    }

    const [[me]] = await pool.query('SELECT position FROM users WHERE id = ?', [req.user.id]);
    const myPos = me ? me.position : null;

    const [[target]] = await pool.query(
      "SELECT id, name, COALESCE(position, '편집장') as position FROM users WHERE id = ? AND role = 'admin' AND is_active = 1",
      [target_id]
    );
    if (!target || !['편집장', '부편집장'].includes(target.position)) {
      return res.status(400).json({ message: '유효한 편집장/부편집장을 선택해주세요.' });
    }
    if (myPos === '편집장' || myPos === '부편집장') {
      const expectedOther = myPos === '편집장' ? '부편집장' : '편집장';
      if (target.position !== expectedOther) {
        return res.status(403).json({ message: '편집장과 부편집장은 서로에게만 컨펌을 요청할 수 있습니다.' });
      }
    }

    await pool.query(
      `UPDATE articles SET status = 'submitted', submitted_at = NOW(), confirm_target_id = ? WHERE id = ?`,
      [target_id, req.params.articleId]
    );

    await pool.query(
      `UPDATE newspapers SET status = 'in_progress' WHERE id = ? AND status = 'draft'`,
      [article.newspaper_id]
    );

    // 지정된 대상에게만 알림
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, article_id, section_id)
       VALUES (?, 'confirm_request', ?, ?, ?, ?)`,
      [target_id, `[${article.section_name}] 컨펌 요청`, `${req.user.name}님이 기사를 제출했습니다.`, req.params.articleId, article.section_id]
    );

    res.json({ message: `${target.name}(${target.position})님께 컨펌 요청이 완료되었습니다.` });
  } catch (err) {
    console.error('컨펌 요청 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 편집장/부편집장: 컨펌 시작 (submitted → confirming) ───
router.put('/:articleId/start-confirm', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.articleId]);
    if (articles.length === 0) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });

    const article = articles[0];
    if (article.status !== 'submitted') {
      return res.status(400).json({ message: '컨펌 대기 상태의 기사만 컨펌을 시작할 수 있습니다.' });
    }
    if (article.confirm_target_id && article.confirm_target_id !== req.user.id) {
      return res.status(403).json({ message: '지정된 컨펌 대상자만 컨펌을 진행할 수 있습니다.' });
    }

    await pool.query(`UPDATE articles SET status = 'confirming' WHERE id = ?`, [req.params.articleId]);
    res.json({ message: '컨펌이 시작되었습니다.', status: 'confirming' });
  } catch (err) {
    console.error('컨펌 시작 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 편집장: 컨펌 완료 (confirming → confirmed, confirm_content 저장) ───
router.put('/:articleId/confirm', authenticate, authorize('admin'), async (req, res) => {
  const { confirm_content } = req.body;
  try {
    const [articles] = await pool.query(
      `SELECT a.*, ns.assigned_reporter_id, ns.section_name FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       WHERE a.id = ?`,
      [req.params.articleId]
    );
    if (articles.length === 0) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });

    const article = articles[0];
    if (!['submitted', 'confirming'].includes(article.status)) {
      return res.status(400).json({ message: '컨펌 대기/진행 중인 기사만 컨펌할 수 있습니다.' });
    }
    if (article.confirm_target_id && article.confirm_target_id !== req.user.id) {
      return res.status(403).json({ message: '지정된 컨펌 대상자만 컨펌을 완료할 수 있습니다.' });
    }

    await pool.query(
      `UPDATE articles SET status = 'confirmed', confirm_content = ?, confirm_round = confirm_round + 1, confirmed_at = NOW() WHERE id = ?`,
      [JSON.stringify(confirm_content), req.params.articleId]
    );

    // 편집장 컨펌 알림 삭제
    await pool.query(
      `DELETE FROM notifications WHERE article_id = ? AND type = 'confirm_request'`,
      [req.params.articleId]
    );

    // 담당 기자에게 컨펌 완료 알림
    if (article.assigned_reporter_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, article_id, section_id)
         VALUES (?, 'confirm_done', ?, ?, ?, ?)`,
        [article.assigned_reporter_id, `[${article.section_name}] 컨펌 완료`, `편집장이 기사를 컨펌했습니다. 수정 사항을 확인해주세요.`, req.params.articleId, article.section_id]
      );
    }

    res.json({ message: '컨펌이 완료되었습니다.' });
  } catch (err) {
    console.error('컨펌 완료 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 편집장: 바로 승인 (submitted/confirming → approved) ───
router.put('/:articleId/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [articles] = await pool.query(
      `SELECT a.*, ns.assigned_reporter_id, ns.section_name FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       WHERE a.id = ?`,
      [req.params.articleId]
    );
    if (articles.length === 0) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });

    const article = articles[0];
    if (!['submitted', 'confirming', 'confirmed'].includes(article.status)) {
      return res.status(400).json({ message: '승인할 수 없는 상태입니다.' });
    }
    if (article.confirm_target_id && article.confirm_target_id !== req.user.id) {
      return res.status(403).json({ message: '지정된 컨펌 대상자만 승인할 수 있습니다.' });
    }

    await pool.query(
      `UPDATE articles SET status = 'approved', approved_at = NOW(), confirm_content = NULL WHERE id = ?`,
      [req.params.articleId]
    );

    // 편집장 컨펌 알림 삭제
    await pool.query(
      `DELETE FROM notifications WHERE article_id = ? AND type = 'confirm_request'`,
      [req.params.articleId]
    );

    // 담당 기자에게 승인 알림
    if (article.assigned_reporter_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, article_id, section_id)
         VALUES (?, 'approved', ?, ?, ?, ?)`,
        [article.assigned_reporter_id, `[${article.section_name}] 기사 승인`, `축하합니다! 기사가 최종 승인되었습니다.`, req.params.articleId, article.section_id]
      );
    }

    res.json({ message: '기사가 승인되었습니다.' });
  } catch (err) {
    console.error('승인 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 담당 작성자: 컨펌 후 수정 저장 + 재컨펌 요청 ───
router.put('/:articleId/resubmit', authenticate, authorize('admin', 'reporter'), async (req, res) => {
  const { title, subtitle, body, caption1, caption2, target_id } = req.body;
  try {
    const [articles] = await pool.query(
      `SELECT a.*, ns.assigned_reporter_id, ns.section_name FROM articles a
       JOIN newspaper_sections ns ON a.section_id = ns.id
       WHERE a.id = ?`,
      [req.params.articleId]
    );
    if (articles.length === 0) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });

    const article = articles[0];
    if (article.assigned_reporter_id !== req.user.id) {
      return res.status(403).json({ message: '본인이 담당하지 않는 기사입니다.' });
    }
    if (article.status !== 'confirmed') {
      return res.status(400).json({ message: '컨펌 완료 상태의 기사만 재제출 가능합니다.' });
    }

    // 재요청 대상: 지정된 target_id가 있으면 그것을, 없으면 기존 confirm_target_id 유지
    let newTargetId = article.confirm_target_id;
    if (target_id) {
      const [[me]] = await pool.query('SELECT position FROM users WHERE id = ?', [req.user.id]);
      const myPos = me ? me.position : null;
      const [[target]] = await pool.query(
        "SELECT id, name, COALESCE(position, '편집장') as position FROM users WHERE id = ? AND role = 'admin' AND is_active = 1",
        [target_id]
      );
      if (!target || !['편집장', '부편집장'].includes(target.position)) {
        return res.status(400).json({ message: '유효한 편집장/부편집장을 선택해주세요.' });
      }
      if (myPos === '편집장' || myPos === '부편집장') {
        const expectedOther = myPos === '편집장' ? '부편집장' : '편집장';
        if (target.position !== expectedOther) {
          return res.status(403).json({ message: '편집장과 부편집장은 서로에게만 컨펌을 요청할 수 있습니다.' });
        }
      }
      newTargetId = target_id;
    }

    await pool.query(
      `UPDATE articles SET title = ?, subtitle = ?, body = ?, caption1 = ?, caption2 = ?,
       status = 'submitted', submitted_at = NOW(), confirm_content = NULL, confirm_target_id = ? WHERE id = ?`,
      [title, subtitle, body, caption1, caption2, newTargetId, req.params.articleId]
    );

    if (newTargetId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, article_id, section_id)
         VALUES (?, 'confirm_request', ?, ?, ?, ?)`,
        [newTargetId, `[${article.section_name}] 재컨펌 요청`, `${req.user.name}님이 수정된 기사를 재제출했습니다. (${article.confirm_round + 1}차)`, req.params.articleId, article.section_id]
      );
    }

    res.json({ message: '컨펌 재요청이 완료되었습니다.' });
  } catch (err) {
    console.error('재제출 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 편집장: 기사 즉시 수정 (기사 상세 페이지에서) ───
router.put('/:articleId/admin-edit', authenticate, authorize('admin'), async (req, res) => {
  const { title, subtitle, body, caption1, caption2, reporter_name, reporter_email } = req.body;
  try {
    const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.articleId]);
    if (articles.length === 0) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });

    const wasApproved = articles[0].status === 'approved';

    await pool.query(
      `UPDATE articles SET
        title          = COALESCE(?, title),
        subtitle       = COALESCE(?, subtitle),
        body           = COALESCE(?, body),
        caption1       = COALESCE(?, caption1),
        caption2       = COALESCE(?, caption2),
        reporter_name  = COALESCE(?, reporter_name),
        reporter_email = COALESCE(?, reporter_email),
        revised_at     = CASE WHEN status = 'approved' THEN NOW() ELSE revised_at END
      WHERE id = ?`,
      [
        title  ?? null, subtitle ?? null, body     ?? null,
        caption1 ?? null, caption2 ?? null,
        reporter_name ?? null, reporter_email ?? null,
        req.params.articleId,
      ]
    );

    res.json({ message: '기사가 수정되었습니다.', wasApproved });
  } catch (err) {
    console.error('즉시 수정 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
