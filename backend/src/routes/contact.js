const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── 공통: 특정 직책 유저에게 알림 전송 ───
async function notifyByPosition(positions, message, link = null) {
  const placeholders = positions.map(() => '?').join(',');
  const [users] = await pool.query(
    `SELECT id FROM users WHERE position IN (${placeholders})`,
    positions
  );
  if (users.length === 0) return;
  const values = users.map(u => [u.id, message, link]);
  await pool.query(
    `INSERT INTO notifications (user_id, message, link) VALUES ?`,
    [values]
  );
}

// ─── 공통: 모든 기자(reporter/admin)에게 알림 전송 ───
async function notifyAllReporters(message, link = null) {
  const [users] = await pool.query(
    `SELECT id FROM users WHERE role IN ('reporter', 'admin')`
  );
  if (users.length === 0) return;
  const values = users.map(u => [u.id, message, link]);
  await pool.query(
    `INSERT INTO notifications (user_id, message, link) VALUES ?`,
    [values]
  );
}

// ─── 기자 지원 제출 ───
router.post('/apply', async (req, res) => {
  const { name, student_id, department, phone, email, motivation } = req.body;
  if (!name || !student_id || !department || !phone || !email || !motivation) {
    return res.status(400).json({ message: '모든 항목을 입력해주세요.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO contact_submissions (type, name, student_id, department, phone, email, subject, body)
       VALUES ('apply', ?, ?, ?, ?, ?, ?, ?)`,
      [name, student_id, department, phone, email, `기자 지원 — ${name}`, motivation]
    );
    const submissionId = result.insertId;
    await notifyByPosition(
      ['편집장'],
      `📋 기자 지원이 도착했습니다 — ${name} (${department} ${student_id})`,
      `/admin/contact/${submissionId}`
    );
    res.json({ message: '기자 지원이 성공적으로 접수되었습니다. 편집장이 검토 후 연락드립니다.' });
  } catch (err) {
    console.error('기자 지원 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 제보하기 제출 ───
router.post('/report', async (req, res) => {
  const { name, phone, email, subject, body } = req.body;
  if (!subject || !body) {
    return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO contact_submissions (type, name, phone, email, subject, body)
       VALUES ('report', ?, ?, ?, ?, ?)`,
      [name || '익명', phone || null, email || null, subject, body]
    );
    const submissionId = result.insertId;
    const displayName = name || '익명';
    await notifyAllReporters(
      `📢 새 제보가 도착했습니다 — "${subject}" (${displayName})`,
      `/admin/contact/${submissionId}`
    );
    res.json({ message: '제보가 성공적으로 접수되었습니다. 기자들이 검토 후 연락드릴 수 있습니다.' });
  } catch (err) {
    console.error('제보 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 광고 문의 제출 ───
router.post('/advertise', async (req, res) => {
  const { company, contact_name, phone, email, ad_type, body } = req.body;
  if (!company || !contact_name || !phone || !email || !body) {
    return res.status(400).json({ message: '모든 항목을 입력해주세요.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO contact_submissions (type, name, department, phone, email, subject, body)
       VALUES ('advertise', ?, ?, ?, ?, ?, ?)`,
      [contact_name, company, phone, email, `광고 문의 — ${company} (${ad_type || '미지정'})`, body]
    );
    const submissionId = result.insertId;
    await notifyByPosition(
      ['편집장'],
      `💼 광고 문의가 도착했습니다 — ${company} (${contact_name})`,
      `/admin/contact/${submissionId}`
    );
    res.json({ message: '광고 문의가 성공적으로 접수되었습니다. 편집장이 검토 후 연락드립니다.' });
  } catch (err) {
    console.error('광고 문의 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 관리자: 문의 목록 조회 ───
router.get('/admin/list', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한이 없습니다.' });
  const { type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const typeFilter = type && type !== 'all' ? 'WHERE type = ?' : '';
  const params = type && type !== 'all' ? [type, parseInt(limit), offset] : [parseInt(limit), offset];
  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM contact_submissions ${typeFilter}`,
      type && type !== 'all' ? [type] : []
    );
    const [submissions] = await pool.query(
      `SELECT * FROM contact_submissions ${typeFilter} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );
    res.json({ submissions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('문의 목록 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 관리자: 단건 조회 ───
router.get('/admin/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한이 없습니다.' });
  try {
    const [[sub]] = await pool.query(`SELECT * FROM contact_submissions WHERE id = ?`, [req.params.id]);
    if (!sub) return res.status(404).json({ message: '존재하지 않는 문의입니다.' });
    if (!sub.is_read) {
      await pool.query(`UPDATE contact_submissions SET is_read = 1 WHERE id = ?`, [req.params.id]);
    }
    res.json({ submission: { ...sub, is_read: true } });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 관리자: 읽음 처리 ───
router.put('/admin/:id/read', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한이 없습니다.' });
  try {
    await pool.query(`UPDATE contact_submissions SET is_read = 1 WHERE id = ?`, [req.params.id]);
    res.json({ message: '읽음 처리 완료' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 관리자: 미읽음 수 ───
router.get('/admin/unread-count', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한이 없습니다.' });
  try {
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM contact_submissions WHERE is_read = 0`
    );
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 관리자: 삭제 ───
router.delete('/admin/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한이 없습니다.' });
  try {
    await pool.query(`DELETE FROM contact_submissions WHERE id = ?`, [req.params.id]);
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
