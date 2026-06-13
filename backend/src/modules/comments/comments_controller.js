const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/comments/:videoId — load comments with replies and like counts
const getComments = async (req, res) => {
  try {
    const { videoId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Get top-level comments
    const [comments] = await db.query(`
      SELECT
        c.id, c.content, c.created_at, c.like_count,
        c.parent_id,
        u.id AS user_id, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = ? AND (c.parent_id IS NULL OR c.parent_id = '')
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [videoId, limit, offset]);

    // Get replies for these comments
    if (comments.length) {
      const ids = comments.map(c => c.id);
      const placeholders = ids.map(() => '?').join(',');
      const [replies] = await db.query(`
        SELECT
          c.id, c.content, c.created_at, c.like_count,
          c.parent_id,
          u.id AS user_id, u.username, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.parent_id IN (${placeholders})
        ORDER BY c.created_at ASC
      `, ids);

      // Attach replies to parent comments
      const replyMap = {};
      replies.forEach(r => {
        if (!replyMap[r.parent_id]) replyMap[r.parent_id] = [];
        replyMap[r.parent_id].push(r);
      });
      comments.forEach(c => { c.replies = replyMap[c.id] || []; });
    }

    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('getComments error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/comments/:videoId — post a comment or reply
const postComment = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content, parent_id } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    }
    if (content.length > 300) {
      return res.status(400).json({ success: false, message: 'Comment too long (max 300 chars)' });
    }

    const id = uuidv4();
    await db.query(
      'INSERT INTO comments (id, video_id, user_id, content, parent_id, like_count) VALUES (?, ?, ?, ?, ?, 0)',
      [id, videoId, userId, content.trim(), parent_id || null]
    );

    // Only increment comment count for top-level comments
    if (!parent_id) {
      await db.query(
        'UPDATE videos SET comment_count = COALESCE(comment_count,0) + 1 WHERE id = ?',
        [videoId]
      );
      // Also try comments_count column
      await db.query(
        'UPDATE videos SET comments_count = COALESCE(comments_count,0) + 1 WHERE id = ?',
        [videoId]
      ).catch(() => {});
    }

    const [rows] = await db.query(`
      SELECT c.id, c.content, c.created_at, c.like_count, c.parent_id,
             u.id AS user_id, u.username, u.avatar_url
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);

    const newComment = { ...rows[0], replies: [] };

    // Emit via Socket.io
    const io = req.app.get('io');
    if (io) io.to(`video:${videoId}`).emit('new_comment', newComment);

    res.json({ success: true, data: newComment });
  } catch (err) {
    console.error('postComment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/comments/:commentId
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

    const comment = rows[0];
    // Delete replies too
    await db.query('DELETE FROM comments WHERE parent_id = ?', [commentId]);
    await db.query('DELETE FROM comments WHERE id = ?', [commentId]);

    if (!comment.parent_id) {
      await db.query(
        'UPDATE videos SET comment_count = GREATEST(COALESCE(comment_count,0) - 1, 0) WHERE id = ?',
        [comment.video_id]
      );
      await db.query(
        'UPDATE videos SET comments_count = GREATEST(COALESCE(comments_count,0) - 1, 0) WHERE id = ?',
        [comment.video_id]
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error('deleteComment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/comments/:commentId/like — toggle like on a comment
const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const [existing] = await db.query(
      'SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?',
      [userId, commentId]
    );

    let liked;
    if (existing.length) {
      await db.query('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?', [userId, commentId]);
      await db.query('UPDATE comments SET like_count = GREATEST(COALESCE(like_count,0) - 1, 0) WHERE id = ?', [commentId]);
      liked = false;
    } else {
      await db.query(
        'INSERT INTO comment_likes (id, user_id, comment_id) VALUES (?, ?, ?)',
        [uuidv4(), userId, commentId]
      );
      await db.query('UPDATE comments SET like_count = COALESCE(like_count,0) + 1 WHERE id = ?', [commentId]);
      liked = true;
    }

    const [rows] = await db.query('SELECT like_count FROM comments WHERE id = ?', [commentId]);
    res.json({ success: true, liked, like_count: rows[0]?.like_count || 0 });
  } catch (err) {
    console.error('likeComment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getComments, postComment, deleteComment, likeComment };
