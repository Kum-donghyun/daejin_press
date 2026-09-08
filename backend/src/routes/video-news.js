const express = require('express');
const pool    = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// YouTube URL → 영상 ID 추출
function extractYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ── 공개: 영상 뉴스 목록 ────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, youtube_url, upload_date, created_at, updated_at
       FROM video_news ORDER BY updated_at DESC, upload_date DESC`
    );
    res.json({ videos: rows.map(v => ({
      ...v,
      video_id:  extractYoutubeId(v.youtube_url),
      thumbnail: extractYoutubeId(v.youtube_url)
        ? `https://img.youtube.com/vi/${extractYoutubeId(v.youtube_url)}/hqdefault.jpg`
        : null,
    }))});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 관리자: 전체 목록 ────────────────────────────────────────
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM video_news ORDER BY updated_at DESC, upload_date DESC`
    );
    res.json({ videos: rows.map(v => ({
      ...v,
      video_id:  extractYoutubeId(v.youtube_url),
      thumbnail: extractYoutubeId(v.youtube_url)
        ? `https://img.youtube.com/vi/${extractYoutubeId(v.youtube_url)}/hqdefault.jpg`
        : null,
    }))});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 관리자: 영상 추가 ────────────────────────────────────────
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { youtube_url, title, upload_date } = req.body;
    if (!youtube_url?.trim()) return res.status(400).json({ message: 'YouTube URL을 입력해주세요.' });
    if (!title?.trim())       return res.status(400).json({ message: '제목을 입력해주세요.' });
    if (!upload_date)         return res.status(400).json({ message: '업로드 일자를 입력해주세요.' });
    if (!extractYoutubeId(youtube_url)) return res.status(400).json({ message: '올바른 YouTube URL이 아닙니다.' });

    const [result] = await pool.query(
      `INSERT INTO video_news (youtube_url, title, upload_date) VALUES (?, ?, ?)`,
      [youtube_url.trim(), title.trim(), upload_date]
    );
    const [[video]] = await pool.query(`SELECT * FROM video_news WHERE id=?`, [result.insertId]);
    res.status(201).json({ video: {
      ...video,
      video_id:  extractYoutubeId(video.youtube_url),
      thumbnail: `https://img.youtube.com/vi/${extractYoutubeId(video.youtube_url)}/hqdefault.jpg`,
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 관리자: 영상 수정 ────────────────────────────────────────
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { youtube_url, title, upload_date } = req.body;
    const [[video]] = await pool.query(`SELECT * FROM video_news WHERE id=?`, [req.params.id]);
    if (!video) return res.status(404).json({ message: '영상을 찾을 수 없습니다.' });
    if (!extractYoutubeId(youtube_url || video.youtube_url))
      return res.status(400).json({ message: '올바른 YouTube URL이 아닙니다.' });

    await pool.query(
      `UPDATE video_news SET youtube_url=?, title=?, upload_date=?, updated_at=NOW() WHERE id=?`,
      [youtube_url?.trim()||video.youtube_url, title?.trim()||video.title,
       upload_date||video.upload_date, req.params.id]
    );
    const [[updated]] = await pool.query(`SELECT * FROM video_news WHERE id=?`, [req.params.id]);
    res.json({ video: {
      ...updated,
      video_id:  extractYoutubeId(updated.youtube_url),
      thumbnail: `https://img.youtube.com/vi/${extractYoutubeId(updated.youtube_url)}/hqdefault.jpg`,
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

// ── 관리자: 영상 삭제 ────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [[video]] = await pool.query(`SELECT id FROM video_news WHERE id=?`, [req.params.id]);
    if (!video) return res.status(404).json({ message: '영상을 찾을 수 없습니다.' });
    await pool.query(`DELETE FROM video_news WHERE id=?`, [req.params.id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
