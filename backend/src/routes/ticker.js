const express = require('express');
const pool    = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── 공개: 티커 목록 조회 ─────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, content, sort_order FROM ticker_items
       WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
    );
    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 인증: 전체 목록 (비활성 포함) ───────────────────────────
router.get('/', authenticate, authorize('reporter', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, content, sort_order, is_active, created_at, updated_at
       FROM ticker_items ORDER BY sort_order ASC, id ASC`
    );
    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 추가 ────────────────────────────────────────────────────
router.post('/', authenticate, authorize('reporter', 'admin'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: '내용을 입력해주세요.' });

    const [[maxRow]] = await pool.query(`SELECT COALESCE(MAX(sort_order),0) AS m FROM ticker_items`);
    const [result] = await pool.query(
      `INSERT INTO ticker_items (content, sort_order, is_active) VALUES (?, ?, 1)`,
      [content.trim(), maxRow.m + 1]
    );
    const [[item]] = await pool.query(`SELECT * FROM ticker_items WHERE id=?`, [result.insertId]);
    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 수정 ────────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('reporter', 'admin'), async (req, res) => {
  try {
    const { content, sort_order, is_active } = req.body;
    const [[item]] = await pool.query(`SELECT * FROM ticker_items WHERE id=?`, [req.params.id]);
    if (!item) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' });

    await pool.query(
      `UPDATE ticker_items SET
         content     = COALESCE(?, content),
         sort_order  = COALESCE(?, sort_order),
         is_active   = COALESCE(?, is_active),
         updated_at  = NOW()
       WHERE id = ?`,
      [
        content !== undefined ? content.trim() : null,
        sort_order !== undefined ? sort_order : null,
        is_active !== undefined ? is_active : null,
        req.params.id,
      ]
    );
    const [[updated]] = await pool.query(`SELECT * FROM ticker_items WHERE id=?`, [req.params.id]);
    res.json({ item: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 삭제 ────────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('reporter', 'admin'), async (req, res) => {
  try {
    const [[item]] = await pool.query(`SELECT id FROM ticker_items WHERE id=?`, [req.params.id]);
    if (!item) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' });
    await pool.query(`DELETE FROM ticker_items WHERE id=?`, [req.params.id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
