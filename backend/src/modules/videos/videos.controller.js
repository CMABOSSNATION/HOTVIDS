const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

exports.getVideo = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT v.*, u.username, u.avatar_url, u.display_name
       FROM videos v
       JOIN users u ON v.creator_id = u.id
       WHERE v.id = ? AND v.status = 'live'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/videos/:id/like  — toggles like, returns { liked: true/false, likes_count }
exports.likeVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;

    // Check if already liked
    const [existing] = await db.execute(
      'SELECT id FROM likes WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );

    if (existing.length > 0) {
      // Unlike
      await db.execute('DELETE FROM likes WHERE user_id = ? AND video_id = ?', [userId, videoId]);
      await db.execute(
        'UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?',
        [videoId]
      );
      const [[v]] = await db.execute('SELECT likes_count FROM videos WHERE id = ?', [videoId]);
      return res.json({ success: true, liked: false, likes_count: v?.likes_count || 0 });
    } else {
      // Like
      await db.execute(
        'INSERT INTO likes (id, user_id, video_id) VALUES (?,?,?)',
        [uuidv4(), userId, videoId]
      );
      await db.execute(
        'UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?',
        [videoId]
      );
      const [[v]] = await db.execute('SELECT likes_count FROM videos WHERE id = ?', [videoId]);
      return res.json({ success: true, liked: true, likes_count: v?.likes_count || 0 });
    }
  } catch (err) {
    console.error('likeVideo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/videos/:id/comments — add comment
exports.addComment = async (req, res) => {
  try {
    const { content, text } = req.body;
    const body = content || text;
    if (!body) return res.status(400).json({ error: 'Comment text required' });
    const id = uuidv4();
    await db.execute(
      'INSERT INTO comments (id, user_id, video_id, content) VALUES (?,?,?,?)',
      [id, req.user.id, req.params.id, body]
    );
    await db.execute(
      'UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?',
      [req.params.id]
    );
    // Fetch the new comment with user info
    const [[comment]] = await db.execute(
      `SELECT c.id, c.content, c.created_at, u.username, u.avatar_url, u.id as user_id
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [id]
    );
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/videos/:id/comments
exports.getComments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await db.execute(
      `SELECT c.id, c.content, c.created_at, c.likes_count,
              u.id as user_id, u.username, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.video_id = ? AND c.parent_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.params.id, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/videos/:id/view
exports.recordView = async (req, res) => {
  try {
    await db.execute(
      'UPDATE videos SET views = views + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/videos/:id/share
exports.recordShare = async (req, res) => {
  try {
    await db.execute(
      'UPDATE videos SET shares_count = shares_count + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/videos/:id/like-status  (check if current user liked this)
exports.getLikeStatus = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id FROM likes WHERE user_id = ? AND video_id = ?',
      [req.user.id, req.params.id]
    );
    res.json({ success: true, liked: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
