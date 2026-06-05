const db = require('../../config/db');

// Trending score formula:
// score = (views*1 + likes*3 + comments*2 + shares*4 + gifts*10) / (hoursAge + 2)^1.5
// Higher weight on gifts = real money interactions
// Decay factor ensures fresh content rises

const calculateTrendingScore = (video, hoursAge) => {
  const raw =
    (video.view_count || 0) * 1 +
    (video.like_count || 0) * 3 +
    (video.comment_count || 0) * 2 +
    (video.share_count || 0) * 4 +
    (video.gift_count || 0) * 10;
  return raw / Math.pow(hoursAge + 2, 1.5);
};

// GET /api/trending?limit=20&offset=0
const getTrending = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const [videos] = await db.query(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.video_url,
        v.thumbnail_url,
        v.view_count,
        v.like_count,
        v.comment_count,
        v.share_count,
        v.created_at,
        u.id AS user_id,
        u.username,
        u.avatar_url,
        COALESCE(g.gift_count, 0) AS gift_count,
        TIMESTAMPDIFF(HOUR, v.created_at, NOW()) AS hours_age
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN (
        SELECT video_id, COUNT(*) AS gift_count
        FROM gift_transactions
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY video_id
      ) g ON g.video_id = v.id
      WHERE v.status = 'active'
        AND v.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY v.created_at DESC
      LIMIT 200
    `);

    // Score and sort in JS for flexibility
    const scored = videos
      .map((v) => ({
        ...v,
        trending_score: calculateTrendingScore(v, v.hours_age),
      }))
      .sort((a, b) => b.trending_score - a.trending_score)
      .slice(offset, offset + limit);

    res.json({
      success: true,
      data: scored,
      total: scored.length,
    });
  } catch (err) {
    console.error('getTrending error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/trending/hashtags — top trending hashtags
const getTrendingHashtags = async (req, res) => {
  try {
    const [hashtags] = await db.query(`
      SELECT
        hashtag,
        COUNT(*) AS video_count,
        SUM(v.view_count) AS total_views
      FROM video_hashtags vh
      JOIN videos v ON v.id = vh.video_id
      WHERE vh.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND v.status = 'active'
      GROUP BY hashtag
      ORDER BY total_views DESC, video_count DESC
      LIMIT 20
    `);

    res.json({ success: true, data: hashtags });
  } catch (err) {
    console.error('getTrendingHashtags error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/trending/view — record a view (called from frontend on video play)
const recordView = async (req, res) => {
  try {
    const { video_id } = req.body;
    if (!video_id) return res.status(400).json({ success: false, message: 'video_id required' });

    await db.query(
      'UPDATE videos SET view_count = view_count + 1 WHERE id = ?',
      [video_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('recordView error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getTrending, getTrendingHashtags, recordView };
