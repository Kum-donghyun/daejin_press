const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── 댓글 목록 조회 (공개) ───
router.get('/', async (req, res) => {
  const { article_id, article_type = 'newspaper' } = req.query;
  if (!article_id) return res.status(400).json({ message: 'article_id 필요' });
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id, c.parent_id, c.article_id, c.article_type,
        c.user_id, c.body, c.is_blurred, c.is_deleted,
        c.created_at, c.updated_at,
        u.name AS user_name, u.nickname AS user_nickname,
        u.role AS user_role, u.position AS user_position,
        u.verified_type AS user_verified_type
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.article_id = ? AND c.article_type = ?
      ORDER BY c.parent_id IS NOT NULL, c.parent_id, c.created_at ASC
    `, [article_id, article_type]);

    // 삭제된 댓글은 내용 숨김
    const cleaned = rows.map(r => ({
      ...r,
      body: r.is_deleted ? null : r.body,
    }));

    res.json({ comments: cleaned });
  } catch (err) {
    console.error('댓글 조회 에러:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ─── 댓글 작성 (실명독자 + 기자 + 편집장) ───
router.post('/', authenticate, async (req, res) => {
  const { article_id, article_type = 'newspaper', body, parent_id } = req.body;
  if (!article_id || !body?.trim()) {
    return res.status(400).json({ message: '내용을 입력해주세요.' });
  }

  const u = req.user;
  // 일반 독자는 실명 인증 필요
  if (u.role === 'reader') {
    // verified_status 확인
    const [[user]] = await pool.query('SELECT verified_status FROM users WHERE id = ?', [u.id]);
    if (!user || user.verified_status !== 'approved') {
      return res.status(403).json({ message: '실명 인증이 필요합니다.' });
    }
  }

  // 답글은 실명독자/기자/편집장만
  if (parent_id) {
    const allowed = u.role === 'admin' || u.role === 'reporter';
    if (!allowed) {
      const [[user]] = await pool.query('SELECT verified_status FROM users WHERE id = ?', [u.id]);
      if (!user || user.verified_status !== 'approved') {
        return res.status(403).json({ message: '답글은 실명 독자, 기자, 편집장만 가능합니다.' });
      }
    }
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO comments (article_id, article_type, user_id, body, parent_id)
       VALUES (?, ?, ?, ?, ?)`,
      [article_id, article_type, u.id, body.trim(), parent_id || null]
    );
    const [[inserted]] = await pool.query(`
      SELECT c.*, u.name AS user_name, u.nickname AS user_nickname,
             u.role AS user_role, u.position AS user_position,
             u.verified_type AS user_verified_type
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.id = ?`, [result.insertId]);
    res.status(201).json({ comment: inserted });
  } catch (err) {
    console.error('댓글 작성 에러:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ─── 댓글 수정 (본인만) ───
router.put('/:id', authenticate, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ message: '내용을 입력해주세요.' });
  try {
    const [[comment]] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.user_id !== req.user.id) return res.status(403).json({ message: '권한이 없습니다.' });
    if (comment.is_deleted) return res.status(400).json({ message: '삭제된 댓글입니다.' });
    await pool.query('UPDATE comments SET body = ? WHERE id = ?', [body.trim(), req.params.id]);
    res.json({ message: '수정되었습니다.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// ─── 댓글 삭제 (본인 또는 편집장) ───
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [[comment]] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    const isOwner = comment.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: '권한이 없습니다.' });
    await pool.query('UPDATE comments SET is_deleted = 1, body = NULL WHERE id = ?', [req.params.id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// ─── 블러 처리 토글 (편집장만) ───
router.put('/:id/blur', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한이 없습니다.' });
  try {
    const [[comment]] = await pool.query('SELECT is_blurred FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    const newVal = comment.is_blurred ? 0 : 1;
    await pool.query('UPDATE comments SET is_blurred = ? WHERE id = ?', [newVal, req.params.id]);
    res.json({ is_blurred: newVal });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
