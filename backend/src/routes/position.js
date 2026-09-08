const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 직책별 부여 역할 매핑
const POSITION_ROLE = {
  '기자':    'reporter',
  '수습기자': 'reporter',
  '편집장':  'admin',
  '부편집장': 'admin',
};

// ─── 독자: 직책 신청 ───
router.post('/request', authenticate, async (req, res) => {
  const { position } = req.body;
  const userId = req.user.id;

  if (!POSITION_ROLE[position]) {
    return res.status(400).json({ message: '유효하지 않은 직책입니다.' });
  }

  try {
    // 이미 대기 중인 신청이 있는지 확인
    const [existing] = await pool.query(
      `SELECT id FROM position_requests WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: '이미 처리 대기 중인 직책 신청이 있습니다.' });
    }

    await pool.query(
      `INSERT INTO position_requests (user_id, requested_position, requested_role)
       VALUES (?, ?, ?)`,
      [userId, position, POSITION_ROLE[position]]
    );

    res.status(201).json({ message: `'${position}' 직책 신청이 완료되었습니다. 편집장 승인을 기다려주세요.` });
  } catch (err) {
    console.error('직책 신청 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 독자: 내 신청 현황 조회 ───
router.get('/my', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, requested_position, requested_role, status, admin_note, created_at, updated_at
       FROM position_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [req.user.id]
    );
    res.json({ requests: rows });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 독자: 대기 중인 신청 취소 ───
router.delete('/my/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id FROM position_requests WHERE id = ? AND user_id = ? AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: '취소할 수 있는 신청이 없습니다.' });
    await pool.query(`DELETE FROM position_requests WHERE id = ?`, [req.params.id]);
    res.json({ message: '신청이 취소되었습니다.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 편집장: 전체 신청 목록 조회 ───
router.get('/admin/list', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pr.id, pr.requested_position, pr.requested_role, pr.status,
              pr.admin_note, pr.created_at, pr.updated_at,
              u.id as user_id, u.name, u.email, u.role as current_role, u.position as current_position
       FROM position_requests pr
       JOIN users u ON pr.user_id = u.id
       ORDER BY FIELD(pr.status,'pending','approved','rejected'), pr.created_at DESC`
    );
    res.json({ requests: rows });
  } catch (err) {
    console.error('직책 신청 목록 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 편집장: 승인 ───
router.put('/admin/:id/approve', authenticate, authorize('admin'), async (req, res) => {
  const { admin_note } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT pr.*, u.email FROM position_requests pr JOIN users u ON pr.user_id = u.id WHERE pr.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: '신청을 찾을 수 없습니다.' });

    const req_data = rows[0];
    if (req_data.status !== 'pending') {
      return res.status(400).json({ message: '이미 처리된 신청입니다.' });
    }

    // 신청 승인 + 유저 role/position 업데이트
    await pool.query(
      `UPDATE position_requests SET status='approved', admin_note=? WHERE id=?`,
      [admin_note || null, req.params.id]
    );
    await pool.query(
      `UPDATE users SET role=?, position=? WHERE id=?`,
      [req_data.requested_role, req_data.requested_position, req_data.user_id]
    );

    // 알림 전송
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES (?, 'approved', ?, ?)`,
      [
        req_data.user_id,
        `'${req_data.requested_position}' 직책 신청 승인`,
        `축하합니다! '${req_data.requested_position}' 직책 신청이 승인되었습니다.${admin_note ? ' 메모: ' + admin_note : ''}`,
      ]
    );

    res.json({ message: '직책 신청이 승인되었습니다.' });
  } catch (err) {
    console.error('직책 승인 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 편집장: 거절 ───
router.put('/admin/:id/reject', authenticate, authorize('admin'), async (req, res) => {
  const { admin_note } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM position_requests WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: '신청을 찾을 수 없습니다.' });
    if (rows[0].status !== 'pending') return res.status(400).json({ message: '이미 처리된 신청입니다.' });

    await pool.query(
      `UPDATE position_requests SET status='rejected', admin_note=? WHERE id=?`,
      [admin_note || null, req.params.id]
    );

    // 알림 전송
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES (?, 'confirm_done', ?, ?)`,
      [
        rows[0].user_id,
        `'${rows[0].requested_position}' 직책 신청 거절`,
        `'${rows[0].requested_position}' 직책 신청이 거절되었습니다.${admin_note ? ' 사유: ' + admin_note : ''}`,
      ]
    );

    res.json({ message: '직책 신청이 거절되었습니다.' });
  } catch (err) {
    console.error('직책 거절 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 편집장: 대기 중인 신청 수 ───
router.get('/admin/pending-count', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM position_requests WHERE status = 'pending'`
    );
    res.json({ count: row.cnt });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

module.exports = router;
