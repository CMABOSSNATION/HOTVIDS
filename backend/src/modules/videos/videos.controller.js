const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, video_url, thumbnail_url, cloudflare_video_id, duration, hashtags } = req.body;
    const id = uuidv4();
    await db.execute(
      'INSERT INTO videos (id, creator_id, title, description, video_url, thumbnail_url, cloudflare_video_id, duration, hashtags) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, req.user.id, title, description, video_url, thumbnail_url, cloudflare_video_id, duration, hashtags]
    );
    res.status(201).json({ id, message: 'Video uploaded' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getVideo = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT v.*, u.username, u.avatar_url 
       FROM videos v 
       JOIN users u ON v.creator_id = u.id 
       WHERE v.id = ? AND v.status = 'live'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Video not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.likeVideo = async (req, res) => {
  try {
    await db.execute(
      'INSERT IGNORE INTO likes (id, user_id, video_id) VALUES (?,?,?)',
      [uuidv4(), req.user.id, req.params.id]
    );
    await db.execute(
      'UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Liked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const id = uuidv4();
    await db.execute(
      'INSERT INTO comments (id, user_id, video_id, content) VALUES (?,?,?,?)',
      [id, req.user.id, req.params.id, content]
    );
    await db.execute(
      'UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?',
      [req.params.id]
    );
    res.status(201).json({ id, message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.recordView = async (req, res) => {
  try {
    await db.execute(
      'UPDATE videos SET views = views + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'View recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
