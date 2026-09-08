const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── 실명 인증 신청 ───
router.post('/request', authenticate, async (req, res) => {
  const { verified_type, real_name, department, id_number } = req.body;
  // verified_type: 'student' | 'professor' | 'staff'
  if (!verified_type || !real_name || !department || !id_number) {
    return res.status(400).json({ message: '모든 항목을 입력해주세요.' });
  }

  if (!['student', 'professor', 'staff'].includes(verified_type)) {
    return res.status(400).json({ message: '잘못된 인증 유형입니다.' });
  }

  // 학생: 학번 형식 검증 (8자리, 앞4자리 1900-2099)
  if (verified_type === 'student') {
    if (!/^\d{8}$/.test(id_number)) {
      return res.status(400).json({ message: '학번은 8자리 숫자여야 합니다.' });
    }
    const year = parseInt(id_number.substring(0, 4));
    if (year < 1900 || year > 2099) {
      return res.status(400).json({ message: '학번 앞 4자리는 입학 연도(1900~2099)여야 합니다.' });
    }
  }

  try {
    // 중복 신청 확인
    const [[existing]] = await pool.query(
      `SELECT id, status FROM users WHERE id = ?`, [req.user.id]
    );
    if (existing.verified_status === 'approved') {
      return res.status(400).json({ message: '이미 실명 인증된 계정입니다.' });
    }
    if (existing.verified_status === 'pending') {
      return res.status(400).json({ message: '이미 심사 중인 신청이 있습니다.' });
    }

    // 학생: 자동 승인
    if (verified_type === 'student') {
      await pool.query(
        `UPDATE users SET
          verified_type = ?, verified_real_name = ?, verified_department = ?,
          verified_id = ?, verified_status = 'approved', verified_at = NOW()
         WHERE id = ?`,
        [verified_type, real_name, department, id_number, req.user.id]
      );

      // 편집장에게 알림
      const [admins] = await pool.query(`SELECT id FROM users WHERE position = '편집장'`);
      if (admins.length > 0) {
        const vals = admins.map(a => [
          a.id,
          `📋 학생 실명 인증 자동승인 — ${real_name} (${department} ${id_number})`,
          '/admin'
        ]);
        await pool.query(`INSERT INTO notifications (user_id, message, link) VALUES ?`, [vals]);
      }

      const [[updated]] = await pool.query(
        `SELECT id, email, name, nickname, role, position, verified_status, verified_type FROM users WHERE id = ?`,
        [req.user.id]
      );
      return res.json({ message: '실명 인증이 완료되었습니다.', user: updated });
    }

    // 교수/교직원: 대기 상태로 저장 + 편집장 알림
    await pool.query(
      `UPDATE users SET
        verified_type = ?, verified_real_name = ?, verified_department = ?,
        verified_id = ?, verified_status = 'pending'
       WHERE id = ?`,
      [verified_type, real_name, department, id_number, req.user.id]
    );

    const [admins] = await pool.query(`SELECT id FROM users WHERE position = '편집장'`);
    if (admins.length > 0) {
      const typeLabel = verified_type === 'professor' ? '교수' : '교직원';
      const vals = admins.map(a => [
        a.id,
        `🔍 ${typeLabel} 실명 인증 신청 — ${real_name} (${department} ${id_number})`,
        '/admin?tab=verified'
      ]);
      await pool.query(`INSERT INTO notifications (user_id, message, link) VALUES ?`, [vals]);
    }

    res.json({ message: '실명 인증 신청이 접수되었습니다. 편집장 검토 후 승인됩니다.' });
  } catch (err) {
    console.error('실명인증 에러:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ─── 관리자: 실명 인증 목록 ───
router.get('/admin/list', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한 없음' });
  try {
    const [users] = await pool.query(`
      SELECT id, name, nickname, email, verified_type, verified_real_name,
             verified_department, verified_id, verified_status, verified_at, created_at
      FROM users
      WHERE verified_status IN ('pending', 'approved', 'rejected')
      ORDER BY verified_status = 'pending' DESC, created_at DESC
    `);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// ─── 관리자: 대기 수 ───
router.get('/admin/pending-count', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한 없음' });
  try {
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE verified_status = 'pending'`
    );
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// ─── 관리자: 승인 ───
router.put('/admin/:id/approve', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한 없음' });
  try {
    await pool.query(
      `UPDATE users SET verified_status = 'approved', verified_at = NOW() WHERE id = ?`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
      [req.params.id, '✅ 실명 인증이 승인되었습니다. 이제 댓글을 작성할 수 있습니다.']
    );
    res.json({ message: '승인되었습니다.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

// ─── 관리자: 거절 ───
router.put('/admin/:id/reject', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한 없음' });
  const { note } = req.body;
  try {
    await pool.query(
      `UPDATE users SET verified_status = 'rejected' WHERE id = ?`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
      [req.params.id, `❌ 실명 인증이 거절되었습니다.${note ? ' 사유: ' + note : ''} 다시 신청하실 수 있습니다.`]
    );
    // 재신청 가능하도록 verified_status 초기화
    await pool.query(
      `UPDATE users SET verified_status = NULL WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: '거절되었습니다.' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
