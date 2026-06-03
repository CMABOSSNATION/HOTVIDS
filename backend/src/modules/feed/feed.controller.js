const db = require('../../config/database');

exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const [videos] = await db.execute(
      `SELECT v.*, u.username, u.avatar_url 
       FROM videos v 
       JOIN users u ON v.creator_id = u.id 
       WHERE v.status = 'live' 
       ORDER BY v.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json({ videos, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTrending = async (req, res) => {
  try {
    const [videos] = await db.execute(
      `SELECT v.*, u.username, u.avatar_url 
       FROM videos v 
       JOIN users u ON v.creator_id = u.id 
       WHERE v.status = 'live' 
       AND v.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY v.views DESC, v.likes_count DESC 
       LIMIT 20`
    );
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
