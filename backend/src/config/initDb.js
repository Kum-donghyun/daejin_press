const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log('✅ MySQL 연결 성공');

  await connection.query(
    'CREATE DATABASE IF NOT EXISTS `dju_press` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  console.log('✅ 데이터베이스 dju_press 생성/확인 완료');

  await connection.query('USE `dju_press`');

  // ─── users 테이블 ───
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      nickname VARCHAR(100) DEFAULT NULL,
      role ENUM('admin', 'reporter', 'reader') NOT NULL DEFAULT 'reader',
      avatar VARCHAR(500) DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ users 테이블 생성/확인 완료');

  // ─── newspapers (신문 호수) 테이블 ───
  await connection.query(`
    CREATE TABLE IF NOT EXISTS newspapers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      issue_number INT NOT NULL UNIQUE COMMENT '호수 번호',
      title VARCHAR(255) NOT NULL COMMENT '대진대 신문사 제N호 신문',
      publish_date DATE NOT NULL COMMENT '발행일',
      status ENUM('draft', 'in_progress', 'published') NOT NULL DEFAULT 'draft',
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ newspapers 테이블 생성/확인 완료');

  // ─── newspaper_sections (지면 배치) 테이블 ───
  await connection.query(`
    CREATE TABLE IF NOT EXISTS newspaper_sections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      newspaper_id INT NOT NULL,
      section_key VARCHAR(50) NOT NULL,
      section_name VARCHAR(100) NOT NULL,
      page_number INT NOT NULL,
      volume DECIMAL(4,1) DEFAULT NULL COMMENT '원고지 200자 기준 분량',
      title_max_length INT DEFAULT NULL,
      title_min_length INT DEFAULT NULL,
      subtitle_max_length INT DEFAULT NULL,
      subtitle_min_length INT DEFAULT NULL,
      photo_required TINYINT(1) DEFAULT 0,
      photo_count INT DEFAULT 1,
      photo_orientation VARCHAR(20) DEFAULT NULL,
      caption_required TINYINT(1) DEFAULT 0,
      has_body TINYINT(1) DEFAULT 1,
      has_subtitle TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      assigned_reporter_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (newspaper_id) REFERENCES newspapers(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_reporter_id) REFERENCES users(id),
      UNIQUE KEY unique_section (newspaper_id, section_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ newspaper_sections 테이블 생성/확인 완료');

  // ─── articles (기사) 테이블 ───
  await connection.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      section_id INT NOT NULL,
      newspaper_id INT NOT NULL,
      title VARCHAR(500) DEFAULT NULL,
      subtitle VARCHAR(500) DEFAULT NULL,
      body LONGTEXT DEFAULT NULL,
      caption1 TEXT DEFAULT NULL,
      caption2 TEXT DEFAULT NULL,
      photo1_url VARCHAR(1000) DEFAULT NULL,
      photo2_url VARCHAR(1000) DEFAULT NULL,
      reporter_name VARCHAR(100) DEFAULT NULL,
      reporter_email VARCHAR(255) DEFAULT NULL,
      written_by INT DEFAULT NULL,
      status ENUM('empty', 'draft', 'submitted', 'confirming', 'confirmed', 'approved', 'rejected') NOT NULL DEFAULT 'empty',
      confirm_content JSON DEFAULT NULL COMMENT 'JSON: {title, subtitle, body, caption1, caption2} with confirm markup',
      confirm_round INT DEFAULT 0 COMMENT 'confirm round number',
      submitted_at TIMESTAMP NULL DEFAULT NULL,
      confirmed_at TIMESTAMP NULL DEFAULT NULL,
      approved_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES newspaper_sections(id) ON DELETE CASCADE,
      FOREIGN KEY (newspaper_id) REFERENCES newspapers(id) ON DELETE CASCADE,
      FOREIGN KEY (written_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ articles 테이블 생성/확인 완료');

  // ─── notifications (알림) 테이블 ───
  await connection.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL COMMENT 'confirm_done, approved, confirm_request',
      title VARCHAR(500) NOT NULL,
      message TEXT DEFAULT NULL,
      article_id INT DEFAULT NULL,
      section_id INT DEFAULT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ notifications 테이블 생성/확인 완료');

  // ─── articles 통계 컬럼 마이그레이션 (없으면 추가) ───
  try {
    await connection.query(`ALTER TABLE articles ADD COLUMN view_count INT NOT NULL DEFAULT 0`);
    console.log('✅ articles.view_count 컬럼 추가됨');
  } catch (e) { /* 이미 존재하면 무시 */ }

  try {
    await connection.query(`ALTER TABLE articles ADD COLUMN read_time_total BIGINT NOT NULL DEFAULT 0 COMMENT '총 체류시간(초)'`);
    console.log('✅ articles.read_time_total 컬럼 추가됨');
  } catch (e) { /* 이미 존재하면 무시 */ }

  try {
    await connection.query(`ALTER TABLE articles ADD COLUMN read_time_count INT NOT NULL DEFAULT 0 COMMENT '체류시간 제출 횟수'`);
    console.log('✅ articles.read_time_count 컬럼 추가됨');
  } catch (e) { /* 이미 존재하면 무시 */ }

  // ─── 기본 계정 생성 ───
  const hashedPassword = await bcrypt.hash('admin1234', 12);
  await connection.query(`
    INSERT IGNORE INTO users (email, password, name, nickname, role)
    VALUES ('admin@daejin.ac.kr', ?, '관리자', '편집장', 'admin')
  `, [hashedPassword]);

  const reporterPassword = await bcrypt.hash('reporter1234', 12);
  await connection.query(`
    INSERT IGNORE INTO users (email, password, name, nickname, role)
    VALUES ('reporter@daejin.ac.kr', ?, '김대진', '김대진 기자', 'reporter')
  `, [reporterPassword]);

  const reporter2Password = await bcrypt.hash('reporter1234', 12);
  await connection.query(`
    INSERT IGNORE INTO users (email, password, name, nickname, role)
    VALUES ('reporter2@daejin.ac.kr', ?, '이정보', '이정보 기자', 'reporter')
  `, [reporter2Password]);

  const readerPassword = await bcrypt.hash('reader1234', 12);
  await connection.query(`
    INSERT IGNORE INTO users (email, password, name, nickname, role)
    VALUES ('student@daejin.ac.kr', ?, '이학생', '대진이', 'reader')
  `, [readerPassword]);

  console.log('✅ 기본 계정 생성/확인 완료');

  await connection.end();
  console.log('\n🎉 데이터베이스 초기화 완료!');
  console.log('──────────────────────────────────');
  console.log('테스트 계정:');
  console.log('  관리자: admin@daejin.ac.kr / admin1234');
  console.log('  기자1: reporter@daejin.ac.kr / reporter1234');
  console.log('  기자2: reporter2@daejin.ac.kr / reporter1234');
  console.log('  독자:  student@daejin.ac.kr / reader1234');
  console.log('──────────────────────────────────');
}

initializeDatabase().catch((err) => {
  console.error('❌ 데이터베이스 초기화 실패:', err.message);
  process.exit(1);
});
