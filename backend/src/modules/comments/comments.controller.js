const db = require('../../config/database');

// GET /api/comments/:videoId — load existing comments
const getComments = async (req, res) => {
  try {
    const { videoId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const [comments] = await db.query(`
      SELECT
        c.id,
        c.content,
        c.created_at,
        c.like_count,
        u.id AS user_id,
        u.username,
        u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [videoId, limit, offset]);

    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('getComments error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/comments/:videoId — post a comment (auth required)
const postComment = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    }

    if (content.length > 300) {
      return res.status(400).json({ success: false, message: 'Comment too long (max 300 chars)' });
    }

    const [result] = await db.query(
      'INSERT INTO comments (video_id, user_id, content) VALUES (?, ?, ?)',
      [videoId, userId, content.trim()]
    );

    // Update comment count on video
    await db.query(
      'UPDATE videos SET comment_count = comment_count + 1 WHERE id = ?',
      [videoId]
    );

    // Get the new comment with user info to broadcast
    const [rows] = await db.query(`
      SELECT
        c.id, c.content, c.created_at, c.like_count,
        u.id AS user_id, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);

    const newComment = rows[0];

    // Emit via Socket.io to all watching this video
    const io = req.app.get('io');
    if (io) {
      io.to(`video:${videoId}`).emit('new_comment', newComment);
    }

    res.json({ success: true, data: newComment });
  } catch (err) {
    console.error('postComment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/comments/:commentId — delete own comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const [rows] = await db.query(
      'SELECT * FROM comments WHERE id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (!rows.length) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
    await db.query(
      'UPDATE videos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
      [rows[0].video_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('deleteComment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getComments, postComment, deleteComment };
