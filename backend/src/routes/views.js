const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── 조회수 기록 (비로그인 포함, 기자/관리자 제외) ───
router.post('/:id/view', async (req, res) => {
  const articleId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];

  // 토큰이 있으면 기자/관리자 여부 확인
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
    // 누적 방식: 단순 INSERT (article_views 테이블에는 view_count 컬럼이 없음)
    await pool.query(
      `INSERT INTO article_views (article_id, view_type) VALUES (?, 'view')`,
      [articleId]
    );
    // articles 테이블 캐시 업데이트
    await pool.query(
      `UPDATE articles SET view_count = (SELECT COUNT(*) FROM article_views WHERE article_id = ? AND view_type = 'view') WHERE id = ?`,
      [articleId, articleId]
    );
    res.json({ counted: true });
  } catch (err) {
    console.error('조회수 기록 에러:', err.message);
    res.json({ counted: false });
  }
});

// ─── 체류시간 기록 ───
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
      `INSERT INTO article_read_times (article_id, seconds) VALUES (?, ?)`,
      [articleId, Math.min(Math.round(seconds), 3600)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('체류시간 기록 에러:', err.message);
    res.json({ ok: false });
  }
});

// ─── 기사 통계 조회 (기자/관리자용) ───
router.get('/:id/stats', authenticate, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'reporter') {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  try {
    const [[viewRow]] = await pool.query(
      `SELECT COUNT(*) AS view_count FROM article_views WHERE article_id = ? AND view_type = 'view'`,
      [req.params.id]
    );
    const [[timeRow]] = await pool.query(
      `SELECT COUNT(*) AS read_count, IFNULL(AVG(seconds),0) AS avg_seconds
       FROM article_read_times WHERE article_id = ?`,
      [req.params.id]
    );
    const [[commentRow]] = await pool.query(
      `SELECT COUNT(*) AS comment_count FROM comments WHERE article_id = ? AND article_type = 'newspaper' AND parent_id IS NULL AND is_deleted = 0`,
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

// ─── 핫이슈 (최근 7일, 점수 = 조회수*3 + 체류시간평균*2 + 댓글수*1) ───
router.get('/hot-issues', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const [rows] = await pool.query(`
      SELECT
        a.id, a.title, a.subtitle, a.body, a.photo1_url, a.reporter_name, a.approved_at,
        ns.section_key, ns.section_name, ns.page_number,
        n.issue_number, n.title AS newspaper_title,
        IFNULL(v.cnt, 0)              AS view_count,
        IFNULL(rt.avg_sec, 0)         AS avg_read_sec,
        IFNULL(cm.cnt, 0)             AS comment_count,
        (IFNULL(v.cnt, 0) * 3 + IFNULL(rt.avg_sec, 0) * 2 + IFNULL(cm.cnt, 0)) AS hot_score,
        'newspaper'                   AS article_type
      FROM articles a
      JOIN newspaper_sections ns ON a.section_id = ns.id
      JOIN newspapers n           ON a.newspaper_id = n.id
      LEFT JOIN (
        SELECT article_id, COUNT(*) AS cnt
        FROM article_views
        WHERE view_type = 'view' AND created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY article_id
      ) v  ON v.article_id = a.id
      LEFT JOIN (
        SELECT article_id, AVG(seconds) AS avg_sec
        FROM article_read_times
        WHERE created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY article_id
      ) rt ON rt.article_id = a.id
      LEFT JOIN (
        SELECT article_id, COUNT(*) AS cnt
        FROM comments
        WHERE article_type = 'newspaper' AND parent_id IS NULL AND is_deleted = 0
          AND created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY article_id
      ) cm ON cm.article_id = a.id
      WHERE a.status = 'approved'
      ORDER BY hot_score DESC, a.approved_at DESC
      LIMIT ?
    `, [limit]);

    // 온라인 기사도 합산
    const [oRows] = await pool.query(`
      SELECT
        oa.id, oa.title, oa.subtitle, oa.body, oa.photo1_url, oa.reporter_name, oa.approved_at,
        NULL AS section_key, '온라인' AS section_name, NULL AS page_number,
        NULL AS issue_number, NULL AS newspaper_title,
        IFNULL(v.cnt, 0)             AS view_count,
        IFNULL(rt.avg_sec, 0)        AS avg_read_sec,
        IFNULL(cm.cnt, 0)            AS comment_count,
        (IFNULL(v.cnt, 0) * 3 + IFNULL(rt.avg_sec, 0) * 2 + IFNULL(cm.cnt, 0)) AS hot_score,
        'online'                     AS article_type
      FROM online_articles oa
      LEFT JOIN (
        SELECT article_id, COUNT(*) AS cnt
        FROM article_views
        WHERE view_type = 'view' AND article_type = 'online' AND created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY article_id
      ) v  ON v.article_id = oa.id
      LEFT JOIN (
        SELECT article_id, AVG(seconds) AS avg_sec
        FROM article_read_times
        WHERE article_type = 'online' AND created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY article_id
      ) rt ON rt.article_id = oa.id
      LEFT JOIN (
        SELECT article_id, COUNT(*) AS cnt
        FROM comments
        WHERE article_type = 'online' AND parent_id IS NULL AND is_deleted = 0
          AND created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY article_id
      ) cm ON cm.article_id = oa.id
      WHERE oa.status = 'approved'
      ORDER BY hot_score DESC
      LIMIT ?
    `, [limit]);

    const combined = [...rows, ...oRows]
      .sort((a, b) => b.hot_score - a.hot_score)
      .slice(0, limit);

    res.json({ articles: combined });
  } catch (err) {
    console.error('핫이슈 에러:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
