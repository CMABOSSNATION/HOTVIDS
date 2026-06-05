const db = require('../../config/db');

// ─── HASHTAG EXTRACTION HELPER ───────────────────────────────
const extractHashtags = (text) => {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map(h => h.slice(1).toLowerCase()))].slice(0, 10);
};

// Call this when a video is uploaded/created
const saveVideoHashtags = async (videoId, title, description) => {
  try {
    const tags = extractHashtags(`${title || ''} ${description || ''}`);
    if (!tags.length) return;
    const values = tags.map(tag => [videoId, tag]);
    await db.query(
      'INSERT IGNORE INTO video_hashtags (video_id, hashtag) VALUES ?',
      [values]
    );
  } catch (err) {
    console.error('saveVideoHashtags error:', err);
  }
};

// ─── GET TRENDING HASHTAGS ───────────────────────────────────
// GET /api/search/hashtags/trending
const getTrendingHashtags = async (req, res) => {
  try {
    const [hashtags] = await db.query(`
      SELECT
        vh.hashtag,
        COUNT(DISTINCT vh.video_id) AS video_count,
        COALESCE(SUM(v.view_count), 0) AS total_views,
        COALESCE(SUM(v.like_count), 0) AS total_likes
      FROM video_hashtags vh
      JOIN videos v ON v.id = vh.video_id
      WHERE v.status = 'active'
        AND vh.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY vh.hashtag
      ORDER BY total_views DESC, video_count DESC
      LIMIT 30
    `);
    res.json({ success: true, data: hashtags });
  } catch (err) {
    console.error('getTrendingHashtags error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET VIDEOS BY HASHTAG ───────────────────────────────────
// GET /api/search/hashtags/:tag
const getVideosByHashtag = async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase().replace(/^#/, '');
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const [videos] = await db.query(`
      SELECT
        v.id, v.title, v.description, v.video_url,
        v.thumbnail_url, v.view_count, v.like_count,
        v.comment_count, v.created_at,
        u.id AS user_id, u.username, u.avatar_url
      FROM video_hashtags vh
      JOIN videos v ON v.id = vh.video_id
      JOIN users u ON u.id = v.user_id
      WHERE vh.hashtag = ?
        AND v.status = 'active'
      ORDER BY v.view_count DESC, v.created_at DESC
      LIMIT ? OFFSET ?
    `, [tag, limit, offset]);

    // Get total count
    const [countRows] = await db.query(`
      SELECT COUNT(*) AS total
      FROM video_hashtags vh
      JOIN videos v ON v.id = vh.video_id
      WHERE vh.hashtag = ? AND v.status = 'active'
    `, [tag]);

    res.json({
      success: true,
      hashtag: tag,
      total: countRows[0].total,
      data: videos
    });
  } catch (err) {
    console.error('getVideosByHashtag error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── SEARCH VIDEOS + USERS + HASHTAGS ───────────────────────
// GET /api/search?q=kampala&type=all|videos|users|hashtags
const search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const type = req.query.type || 'all';
    const limit = parseInt(req.query.limit) || 20;

    if (!q) {
      return res.status(400).json({ success: false, message: 'Query required' });
    }

    const like = `%${q}%`;
    const tag = q.replace(/^#/, '').toLowerCase();
    const results = {};

    // Search videos
    if (type === 'all' || type === 'videos') {
      const [videos] = await db.query(`
        SELECT
          v.id, v.title, v.thumbnail_url, v.view_count,
          v.like_count, v.created_at,
          u.username, u.avatar_url
        FROM videos v
        JOIN users u ON u.id = v.user_id
        WHERE v.status = 'active'
          AND (v.title LIKE ? OR v.description LIKE ?)
        ORDER BY v.view_count DESC
        LIMIT ?
      `, [like, like, limit]);
      results.videos = videos;
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const [users] = await db.query(`
        SELECT id, username, avatar_url, followers_count, bio
        FROM users
        WHERE username LIKE ? OR bio LIKE ?
        ORDER BY followers_count DESC
        LIMIT ?
      `, [like, like, limit]);
      results.users = users;
    }

    // Search hashtags
    if (type === 'all' || type === 'hashtags') {
      const [hashtags] = await db.query(`
        SELECT
          hashtag,
          COUNT(DISTINCT video_id) AS video_count,
          SUM(v.view_count) AS total_views
        FROM video_hashtags vh
        JOIN videos v ON v.id = vh.video_id
        WHERE vh.hashtag LIKE ?
          AND v.status = 'active'
        GROUP BY hashtag
        ORDER BY total_views DESC
        LIMIT ?
      `, [`%${tag}%`, 10]);
      results.hashtags = hashtags;
    }

    res.json({ success: true, query: q, data: results });
  } catch (err) {
    console.error('search error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getTrendingHashtags,
  getVideosByHashtag,
  search,
  saveVideoHashtags,
  extractHashtags
};
