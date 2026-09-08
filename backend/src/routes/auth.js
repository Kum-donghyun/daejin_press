const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// ─── 회원가입 ───
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('유효한 이메일을 입력해주세요.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('비밀번호는 최소 6자 이상이어야 합니다.'),
    body('name').notEmpty().withMessage('이름을 입력해주세요.'),
    body('nickname').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, nickname } = req.body;

    try {
      // 이메일 중복 확인
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ message: '이미 등록된 이메일입니다.' });
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, 12);

      // 사용자 생성 (기본 역할: reader 독자)
      const [result] = await pool.query(
        'INSERT INTO users (email, password, name, nickname, role) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, name, nickname || name, 'reader']
      );

      // JWT 발급
      const token = jwt.sign(
        { id: result.insertId, email, name, nickname: nickname || name, role: 'reader' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        message: '회원가입이 완료되었습니다.',
        token,
        user: {
          id: result.insertId,
          email,
          name,
          nickname: nickname || name,
          role: 'reader',
        },
      });
    } catch (err) {
      console.error('회원가입 에러:', err);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// ─── 로그인 ───
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('유효한 이메일을 입력해주세요.'),
    body('password').notEmpty().withMessage('비밀번호를 입력해주세요.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // 사용자 조회
      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      const user = users[0];

      // 계정 활성 상태 확인
      if (!user.is_active) {
        return res.status(403).json({ message: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
      }

      // 비밀번호 확인
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }

      // JWT 발급
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        message: '로그인 성공',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } catch (err) {
      console.error('로그인 에러:', err);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
);

// ─── 내 정보 조회 ───
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, name, nickname, role, position, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user: users[0] });
  } catch (err) {
    console.error('내 정보 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 내 정보 수정 ───
// 주의: position(직책)은 이 라우트로 변경할 수 없습니다. 반드시 /positions/request
// 신청 → 편집장/관리자 승인 절차(/positions/admin/:id/approve)를 거쳐야 합니다.
router.put('/me', authenticate, async (req, res) => {
  const { name, nickname, email } = req.body;

  try {
    // 이메일 변경 시 중복 확인
    if (email && email !== req.user.email) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
      }
    }

    await pool.query(
      `UPDATE users SET
        name     = COALESCE(?, name),
        nickname = COALESCE(?, nickname),
        email    = COALESCE(?, email)
       WHERE id = ?`,
      [name || null, nickname || null, email || null, req.user.id]
    );

    const [users] = await pool.query(
      'SELECT id, email, name, nickname, role, position, avatar FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: '정보가 수정되었습니다.', user: users[0] });
  } catch (err) {
    console.error('정보 수정 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });

  }
});

// ─── 비밀번호 변경 ───
router.put('/me/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
  }

  try {
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    console.error('비밀번호 변경 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── [관리자] 사용자 목록 조회 ───
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, name, nickname, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (err) {
    console.error('사용자 목록 조회 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── [관리자] 사용자 역할 변경 ───
router.put('/users/:id/role', authenticate, authorize('admin'), async (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;

  if (!['admin', 'reporter', 'reader'].includes(role)) {
    return res.status(400).json({ message: '유효하지 않은 역할입니다. (admin, reporter, reader)' });
  }

  try {
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({ message: `사용자 역할이 '${role}'(으)로 변경되었습니다.` });
  } catch (err) {
    console.error('역할 변경 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── [관리자] 사용자 활성/비활성 ───
router.put('/users/:id/status', authenticate, authorize('admin'), async (req, res) => {
  const { is_active } = req.body;
  const userId = req.params.id;

  try {
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, userId]);
    res.json({ message: is_active ? '계정이 활성화되었습니다.' : '계정이 비활성화되었습니다.' });
  } catch (err) {
    console.error('상태 변경 에러:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
