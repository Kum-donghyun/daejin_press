const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── 내 알림 목록 ───
router.get('/', authenticate, async (req, res) => {
  try {
    const [notifications] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications });
  } catch (err) {
    console.error('알림 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 읽지 않은 알림 수 ───
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const [result] = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );
    res.json({ count: result[0].count });
  } catch (err) {
    console.error('알림 카운트 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 모든 알림 읽음 처리 ───
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [req.user.id]
    );
    res.json({ message: '모든 알림을 읽음 처리했습니다.' });
  } catch (err) {
    console.error('전체 읽음 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 알림 읽음 처리 ───
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ message: '알림을 읽음 처리했습니다.' });
  } catch (err) {
    console.error('알림 읽음 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
