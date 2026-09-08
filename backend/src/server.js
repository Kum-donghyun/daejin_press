const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const newspaperRoutes = require('./routes/newspaper');
const articleRoutes = require('./routes/article');
const notificationRoutes = require('./routes/notification');
const positionRoutes = require('./routes/position');
const onlineArticleRoutes = require('./routes/online-article');
const videoNewsRoutes = require('./routes/video-news');
const tickerRoutes    = require('./routes/ticker');
const contactRoutes   = require('./routes/contact');
const viewsRoutes     = require('./routes/views');
const commentsRoutes  = require('./routes/comments');
const verifiedRoutes  = require('./routes/verified');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// uploads 폴더 생성
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// DB 마이그레이션: position / revised_at 컬럼 자동 추가
(async () => {
  const migrations = [
    {
      name: 'users.position',
      check: `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='position'`,
      sql: `ALTER TABLE users ADD COLUMN position ENUM('기자','수습기자','편집장','부편집장') DEFAULT NULL`,
    },
    {
      name: 'articles.revised_at',
      check: `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='articles' AND COLUMN_NAME='revised_at'`,
      sql: `ALTER TABLE articles ADD COLUMN revised_at TIMESTAMP NULL DEFAULT NULL COMMENT '승인 후 재수정된 시각'`,
    },
    {
      name: 'articles.confirm_target_id',
      check: `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='articles' AND COLUMN_NAME='confirm_target_id'`,
      sql: `ALTER TABLE articles ADD COLUMN confirm_target_id INT NULL DEFAULT NULL COMMENT '컨펌 요청 대상 (편집장/부편집장) user id'`,
    },
  ];
  for (const m of migrations) {
    try {
      const [[row]] = await pool.query(m.check);
      if (row.cnt === 0) {
        await pool.query(m.sql);
        console.log(`✅ ${m.name} 컬럼 추가 완료`);
      } else {
        console.log(`✅ ${m.name} 컬럼 이미 존재`);
      }
    } catch (e) {
      console.error(`❌ ${m.name} 마이그레이션 실패:`, e.message);
    }
  }

  // 데이터 보정: role='admin'인데 position이 비어있는 계정(초기 시딩된 최고관리자 등)은
  // '편집장' 직책으로 간주해 컨펌 요청 대상 목록에 정상적으로 노출되도록 보정
  try {
    const [result] = await pool.query(
      "UPDATE users SET position = '편집장' WHERE role = 'admin' AND position IS NULL"
    );
    if (result.affectedRows > 0) {
      console.log(`✅ 관리자 계정 ${result.affectedRows}건 position='편집장'으로 보정 완료`);
    }
  } catch (e) {
    console.error('❌ 관리자 position 보정 실패:', e.message);
  }

  // position_requests 테이블 생성
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS position_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        requested_position ENUM('기자','수습기자','편집장','부편집장') NOT NULL,
        requested_role ENUM('reporter','admin') NOT NULL DEFAULT 'reporter',
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        admin_note TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ position_requests 테이블 확인/생성 완료');
  } catch (e) {
    console.error('❌ position_requests 테이블 생성 실패:', e.message);
  }

  // online_articles 테이블 생성
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS online_articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT DEFAULT NULL,
        subtitle TEXT DEFAULT NULL,
        body LONGTEXT DEFAULT NULL,
        photo1_url VARCHAR(500) DEFAULT NULL,
        caption1 TEXT DEFAULT NULL,
        photo2_url VARCHAR(500) DEFAULT NULL,
        caption2 TEXT DEFAULT NULL,
        reporter_id INT NOT NULL,
        reporter_name VARCHAR(100) DEFAULT NULL,
        reporter_email VARCHAR(200) DEFAULT NULL,
        status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
        admin_note TEXT DEFAULT NULL,
        approved_at TIMESTAMP NULL DEFAULT NULL,
        revised_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ online_articles 테이블 확인/생성 완료');
  } catch (e) {
    console.error('❌ online_articles 테이블 생성 실패:', e.message);
  }

  // video_news 테이블 생성
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        youtube_url VARCHAR(500) NOT NULL,
        title VARCHAR(300) NOT NULL,
        upload_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ video_news 테이블 확인/생성 완료');
  } catch (e) {
    console.error('❌ video_news 테이블 생성 실패:', e.message);
  }

  // ticker_items 테이블 생성
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticker_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [[cnt]] = await pool.query('SELECT COUNT(*) AS c FROM ticker_items');
    if (cnt.c === 0) {
      await pool.query(`
        INSERT INTO ticker_items (content, sort_order) VALUES
        ('[속보] 대진대학교 신문사 플랫폼이 오픈되었습니다.', 1),
        ('대진대 신문사 DJU Press — 온라인 기사 서비스 시작', 2)
      `);
    }
    console.log('✅ ticker_items 테이블 확인/생성 완료');
  } catch (e) {
    console.error('❌ ticker_items 테이블 생성 실패:', e.message);
  }

  // contact_submissions 테이블 생성
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('apply','report','advertise') NOT NULL,
        name VARCHAR(100),
        student_id VARCHAR(20),
        department VARCHAR(100),
        phone VARCHAR(30),
        email VARCHAR(200),
        subject VARCHAR(300),
        body TEXT,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ contact_submissions 테이블 확인/생성 완료');
  } catch (e) {
    console.error('❌ contact_submissions 테이블 생성 실패:', e.message);
  }

  // users 실명인증 컬럼
  const verifiedCols = [
    { name: 'verified_type',        sql: `ALTER TABLE users ADD COLUMN verified_type ENUM('student','professor','staff') DEFAULT NULL` },
    { name: 'verified_real_name',   sql: `ALTER TABLE users ADD COLUMN verified_real_name VARCHAR(100) DEFAULT NULL` },
    { name: 'verified_department',  sql: `ALTER TABLE users ADD COLUMN verified_department VARCHAR(200) DEFAULT NULL` },
    { name: 'verified_id',          sql: `ALTER TABLE users ADD COLUMN verified_id VARCHAR(30) DEFAULT NULL` },
    { name: 'verified_status',      sql: `ALTER TABLE users ADD COLUMN verified_status ENUM('pending','approved','rejected') DEFAULT NULL` },
    { name: 'verified_at',          sql: `ALTER TABLE users ADD COLUMN verified_at TIMESTAMP NULL DEFAULT NULL` },
  ];
  for (const col of verifiedCols) {
    try {
      const [[r]] = await pool.query(`SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME=?`, [col.name]);
      if (r.cnt === 0) { await pool.query(col.sql); console.log(`✅ users.${col.name} 추가`); }
    } catch(e) { console.error(`❌ users.${col.name}:`, e.message); }
  }

  // articles.view_count 컬럼
  try {
    const [[r]] = await pool.query(`SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='articles' AND COLUMN_NAME='view_count'`);
    if (r.cnt === 0) await pool.query(`ALTER TABLE articles ADD COLUMN view_count INT NOT NULL DEFAULT 0`);
    console.log('✅ articles.view_count 확인');
  } catch(e) { console.error('❌ articles.view_count:', e.message); }

  // article_views 테이블
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS article_views (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      article_id INT NOT NULL,
      article_type ENUM('newspaper','online') NOT NULL DEFAULT 'newspaper',
      view_type VARCHAR(20) NOT NULL DEFAULT 'view',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_article (article_id, article_type, view_type, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ article_views 테이블 확인/생성 완료');
  } catch(e) { console.error('❌ article_views:', e.message); }

  // article_read_times 테이블
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS article_read_times (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      article_id INT NOT NULL,
      article_type ENUM('newspaper','online') NOT NULL DEFAULT 'newspaper',
      seconds SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_article (article_id, article_type, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ article_read_times 테이블 확인/생성 완료');
  } catch(e) { console.error('❌ article_read_times:', e.message); }

  // comments 테이블
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      article_id INT NOT NULL,
      article_type ENUM('newspaper','online') NOT NULL DEFAULT 'newspaper',
      user_id INT NOT NULL,
      parent_id INT DEFAULT NULL,
      body TEXT,
      is_blurred TINYINT(1) NOT NULL DEFAULT 0,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_article (article_id, article_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ comments 테이블 확인/생성 완료');
  } catch(e) { console.error('❌ comments:', e.message); }
})();

// 미들웨어
app.use(cors({
  origin: true, // 모든 출처 허용 (네트워크 접속 지원)
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/newspapers', newspaperRoutes);
app.use('/api/articles', viewsRoutes);   // view/read-time/stats/hot-issues (먼저 등록)
app.use('/api/articles', articleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/online-articles', onlineArticleRoutes);
app.use('/api/video-news', videoNewsRoutes);
app.use('/api/ticker', tickerRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/verified', verifiedRoutes);

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '대진대학교 신문사 API 서버 정상 작동 중' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`\n🚀 대진대학교 신문사 백엔드 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📡 API 헬스체크: http://localhost:${PORT}/api/health\n`);
});
