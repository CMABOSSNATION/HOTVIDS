const db = require('../../config/database');

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ videos: [], users: [] });
    const term = `%${q}%`;
    const [videos] = await db.execute(
      `SELECT v.*, u.username, u.avatar_url 
       FROM videos v JOIN users u ON v.creator_id = u.id 
       WHERE v.status = 'live' 
       AND (v.title LIKE ? OR v.description LIKE ? OR v.hashtags LIKE ?)
       LIMIT 20`,
      [term, term, term]
    );
    const [users] = await db.execute(
      `SELECT id, username, avatar_url, bio 
       FROM users WHERE username LIKE ? LIMIT 10`,
      [term]
    );
    res.json({ videos, users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTrending = async (req, res) => {
  try {
    const [hashtags] = await db.execute(
      `SELECT hashtags, COUNT(*) as count 
       FROM videos WHERE status = 'live'
       AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY hashtags ORDER BY count DESC LIMIT 10`
    );
    res.json({ hashtags });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
