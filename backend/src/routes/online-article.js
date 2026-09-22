const express = require('express');
const multer  = require('multer');
const path    = require('path');
const pool    = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── 파일 업로드 설정 ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `online_${Date.now()}_${Math.random().toString(36).substr(2,9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.gif','.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'));
  },
});

// ── 공개: 승인된 온라인 기사 목록 (최신순) ───────────────────
router.get('/public', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const [rows] = await pool.query(
      `SELECT id, title, subtitle, photo1_url, reporter_name, approved_at, updated_at
       FROM online_articles
       WHERE status = 'approved'
       ORDER BY COALESCE(revised_at, approved_at) DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ articles: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 공개: 승인된 온라인 기사 단건 ────────────────────────────
router.get('/public/:id', async (req, res) => {
  try {
    const [[article]] = await pool.query(
      `SELECT * FROM online_articles WHERE id = ? AND status = 'approved'`,
      [req.params.id]
    );
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    res.json({ article });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 공개: 조회수 기록 (비로그인 포함, 기자/관리자 제외) ──────
router.post('/:id/view', async (req, res) => {
  const articleId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'admin' || decoded.role === 'reporter') {
        return res.json({ counted: false });
      }
    } catch {}
  }

  try {
    await pool.query(
      `INSERT INTO article_views (article_id, article_type, view_type) VALUES (?, 'online', 'view')`,
      [articleId]
    );
    res.json({ counted: true });
  } catch (err) {
    console.error('온라인 기사 조회수 기록 에러:', err.message);
    res.json({ counted: false });
  }
});

// ── 공개: 체류시간 기록 ───────────────────────────────────────
router.post('/:id/read-time', async (req, res) => {
  const articleId = req.params.id;
  const { seconds } = req.body;
  if (!seconds || seconds < 3) return res.json({ ok: false });

  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'admin' || decoded.role === 'reporter') {
        return res.json({ ok: false });
      }
    } catch {}
  }

  try {
    await pool.query(
      `INSERT INTO article_read_times (article_id, article_type, seconds) VALUES (?, 'online', ?)`,
      [articleId, Math.min(Math.round(seconds), 3600)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('온라인 기사 체류시간 기록 에러:', err.message);
    res.json({ ok: false });
  }
});

// ── 통계 조회 (기자/관리자용) ─────────────────────────────────
router.get('/:id/stats', authenticate, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'reporter') {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  try {
    const [[viewRow]] = await pool.query(
      `SELECT COUNT(*) AS view_count FROM article_views WHERE article_id = ? AND article_type = 'online' AND view_type = 'view'`,
      [req.params.id]
    );
    const [[timeRow]] = await pool.query(
      `SELECT COUNT(*) AS read_count, IFNULL(AVG(seconds),0) AS avg_seconds
       FROM article_read_times WHERE article_id = ? AND article_type = 'online'`,
      [req.params.id]
    );
    const [[commentRow]] = await pool.query(
      `SELECT COUNT(*) AS comment_count FROM comments WHERE article_id = ? AND article_type = 'online' AND parent_id IS NULL AND is_deleted = 0`,
      [req.params.id]
    );
    res.json({
      view_count: viewRow.view_count,
      read_count: timeRow.read_count,
      avg_seconds: Math.round(timeRow.avg_seconds),
      comment_count: commentRow.comment_count,
    });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 인증 필요 라우트 ─────────────────────────────────────────

// 내 온라인 기사 목록 (기자/admin)
router.get('/my', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, status, admin_note, created_at, updated_at
       FROM online_articles WHERE reporter_id = ? ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ articles: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 내 온라인 기사 단건 조회 (수정용)
router.get('/mine/:id', authenticate, async (req, res) => {
  try {
    const [[article]] = await pool.query(
      `SELECT * FROM online_articles WHERE id = ? AND reporter_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    res.json({ article });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 온라인 기사 생성 (임시저장)
router.post('/', authenticate, authorize('reporter', 'admin'), async (req, res) => {
  try {
    const { title, subtitle, body, caption1, caption2, reporter_name, reporter_email } = req.body;
    const [result] = await pool.query(
      `INSERT INTO online_articles
        (title, subtitle, body, caption1, caption2, reporter_id, reporter_name, reporter_email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [title||'', subtitle||'', body||'', caption1||'', caption2||'',
       req.user.id, reporter_name||req.user.name, reporter_email||req.user.email]
    );
    const [[article]] = await pool.query(
      `SELECT * FROM online_articles WHERE id = ?`, [result.insertId]
    );
    res.status(201).json({ article });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 온라인 기사 저장 (임시저장 or 컨펌 요청)
router.put('/:id', authenticate, authorize('reporter','admin'), async (req, res) => {
  try {
    const [[article]] = await pool.query(
      `SELECT * FROM online_articles WHERE id = ? AND reporter_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });

    const canEdit = ['draft','rejected'].includes(article.status)
      || (article.status === 'approved');
    if (!canEdit) return res.status(400).json({ message: '현재 상태에서는 수정할 수 없습니다.' });

    const { title, subtitle, body, caption1, caption2, reporter_name, reporter_email, action } = req.body;

    let newStatus = article.status;
    let revisedAt = article.revised_at;
    if (action === 'request_confirm') {
      if (!title?.trim()) return res.status(400).json({ message: '제목을 입력해주세요.' });
      newStatus = 'pending';
    } else if (article.status === 'approved') {
      revisedAt = new Date();
    }

    await pool.query(
      `UPDATE online_articles
       SET title=?, subtitle=?, body=?, caption1=?, caption2=?,
           reporter_name=?, reporter_email=?,
           status=?, revised_at=?, updated_at=NOW()
       WHERE id=?`,
      [title||'', subtitle||'', body||'', caption1||'', caption2||'',
       reporter_name||article.reporter_name, reporter_email||article.reporter_email,
       newStatus, revisedAt||null, req.params.id]
    );

    const [[updated]] = await pool.query(
      `SELECT * FROM online_articles WHERE id=?`, [req.params.id]
    );
    res.json({ article: updated, wasApproved: article.status === 'approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 온라인 기사 삭제 (본인 or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [[article]] = await pool.query(
      `SELECT * FROM online_articles WHERE id=?`, [req.params.id]
    );
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    if (req.user.role !== 'admin' && article.reporter_id !== req.user.id)
      return res.status(403).json({ message: '권한이 없습니다.' });

    await pool.query(`DELETE FROM online_articles WHERE id=?`, [req.params.id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 사진 업로드
router.post('/:id/upload', authenticate, authorize('reporter','admin'), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' });
    const [[article]] = await pool.query(
      `SELECT * FROM online_articles WHERE id=?`, [req.params.id]
    );
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    if (req.user.role !== 'admin' && article.reporter_id !== req.user.id)
      return res.status(403).json({ message: '권한이 없습니다.' });

    const url = `/uploads/${req.file.filename}`;
    const slot = req.body.slot || 'photo1';
    const col  = slot === 'photo2' ? 'photo2_url' : 'photo1_url';
    await pool.query(`UPDATE online_articles SET ${col}=?, updated_at=NOW() WHERE id=?`, [url, req.params.id]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 관리자 전용 ───────────────────────────────────────────────

// 전체 온라인 기사 목록
router.get('/admin/list', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query; // 'pending' | 'all' | etc.
    const cond = status && status !== 'all' ? 'WHERE oa.status = ?' : '';
    const params = status && status !== 'all' ? [status] : [];
    const [rows] = await pool.query(
      `SELECT oa.id, oa.title, oa.status, oa.admin_note,
              oa.reporter_name, oa.reporter_email, oa.reporter_id,
              oa.created_at, oa.updated_at, oa.approved_at
       FROM online_articles oa
       ${cond}
       ORDER BY oa.updated_at DESC`,
      params
    );
    res.json({ articles: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// pending 건수
router.get('/admin/pending-count', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM online_articles WHERE status='pending'`
    );
    res.json({ count: row.cnt });
  } catch (err) {
    res.json({ count: 0 });
  }
});

// 승인
router.put('/admin/:id/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [[article]] = await pool.query(`SELECT * FROM online_articles WHERE id=?`, [req.params.id]);
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    if (article.status !== 'pending') return res.status(400).json({ message: '컨펌 요청 상태가 아닙니다.' });

    await pool.query(
      `UPDATE online_articles SET status='approved', admin_note=?, approved_at=NOW(), updated_at=NOW() WHERE id=?`,
      [req.body.admin_note || null, req.params.id]
    );

    // 알림 (notification 테이블 존재 시)
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, section_id, created_at)
         VALUES (?, 'online_approved', ?, '온라인 기사가 승인되었습니다.', ?, NOW())`,
        [article.reporter_id, `[온라인] ${article.title || '제목 없음'}`, article.id]
      );
    } catch {}

    res.json({ message: '승인되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 거절
router.put('/admin/:id/reject', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [[article]] = await pool.query(`SELECT * FROM online_articles WHERE id=?`, [req.params.id]);
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });

    await pool.query(
      `UPDATE online_articles SET status='rejected', admin_note=?, updated_at=NOW() WHERE id=?`,
      [req.body.admin_note || null, req.params.id]
    );

    // 알림
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, section_id, created_at)
         VALUES (?, 'online_rejected', ?, ?, ?, NOW())`,
        [article.reporter_id, `[온라인] ${article.title || '제목 없음'}`,
         req.body.admin_note || '거절되었습니다.', article.id]
      );
    } catch {}

    res.json({ message: '거절되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 관리자 즉시 수정
router.put('/admin/:id/edit', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, subtitle, body, caption1, caption2, reporter_name, reporter_email } = req.body;
    const [[article]] = await pool.query(`SELECT * FROM online_articles WHERE id=?`, [req.params.id]);
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });

    const revisedAt = article.status === 'approved' ? new Date() : article.revised_at;
    await pool.query(
      `UPDATE online_articles SET title=?, subtitle=?, body=?, caption1=?, caption2=?,
       reporter_name=?, reporter_email=?, revised_at=?, updated_at=NOW() WHERE id=?`,
      [title||'', subtitle||'', body||'', caption1||'', caption2||'',
       reporter_name||article.reporter_name, reporter_email||article.reporter_email,
       revisedAt||null, req.params.id]
    );
    const [[updated]] = await pool.query(`SELECT * FROM online_articles WHERE id=?`, [req.params.id]);
    res.json({ article: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// 관리자 단건 조회 (모든 상태)
router.get('/admin/article/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [[article]] = await pool.query(`SELECT * FROM online_articles WHERE id=?`, [req.params.id]);
    if (!article) return res.status(404).json({ message: '기사를 찾을 수 없습니다.' });
    res.json({ article });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
