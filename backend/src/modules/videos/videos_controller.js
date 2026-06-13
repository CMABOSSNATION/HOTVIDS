const db = require("../../config/database");
const { v4: uuidv4 } = require("uuid");

// GET /api/videos/:id
exports.getVideo = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT v.*, u.username, u.avatar_url, u.display_name
       FROM videos v JOIN users u ON u.id = v.creator_id
       WHERE v.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Video not found" });
    res.json({ success: true, data: rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/videos/:id/view
exports.recordView = async (req, res) => {
  try {
    await db.query("UPDATE videos SET views = COALESCE(views,0) + 1 WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/videos/:id/like — toggle like (renamed export to match route)
exports.likeVideo = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const videoId = req.params.id;

    const [existing] = await db.query(
      "SELECT id FROM likes WHERE user_id = ? AND video_id = ?",
      [userId, videoId]
    );

    let liked;
    if (existing.length) {
      await db.query("DELETE FROM likes WHERE user_id = ? AND video_id = ?", [userId, videoId]);
      await db.query("UPDATE videos SET likes_count = GREATEST(COALESCE(likes_count,0) - 1, 0) WHERE id = ?", [videoId]);
      liked = false;
    } else {
      await db.query(
        "INSERT INTO likes (id, user_id, video_id, created_at) VALUES (?, ?, ?, NOW())",
        [uuidv4(), userId, videoId]
      );
      await db.query("UPDATE videos SET likes_count = COALESCE(likes_count,0) + 1 WHERE id = ?", [videoId]);
      liked = true;
    }

    const [rows] = await db.query("SELECT likes_count FROM videos WHERE id = ?", [videoId]);
    res.json({ success: true, liked, likes_count: rows[0]?.likes_count || 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
exports.toggleLike = exports.likeVideo; // alias

// GET /api/videos/:id/comments
exports.getComments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.username, u.avatar_url
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.video_id = ? AND (c.parent_id IS NULL OR c.parent_id = '')
       ORDER BY c.created_at DESC LIMIT 100`,
      [req.params.id]
    );
    const comments = rows.map(c => ({
      ...c,
      content: c.content || c.text || '',
      text: c.text || c.content || '',
      replies: []
    }));

    // Fetch replies
    if (comments.length) {
      const ids = comments.map(c => c.id);
      const ph = ids.map(() => '?').join(',');
      const [replies] = await db.query(
        `SELECT c.*, u.username, u.avatar_url FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.parent_id IN (${ph}) ORDER BY c.created_at ASC`,
        ids
      );
      const rmap = {};
      replies.forEach(r => {
        if (!rmap[r.parent_id]) rmap[r.parent_id] = [];
        rmap[r.parent_id].push({ ...r, content: r.content || r.text || '' });
      });
      comments.forEach(c => { c.replies = rmap[c.id] || []; });
    }

    res.json(comments);
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/videos/:id/comments
exports.addComment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const videoId = req.params.id;
    const commentText = req.body.content || req.body.text || '';
    const parent_id = req.body.parent_id || null;
    if (!commentText.trim()) return res.status(400).json({ error: "Comment cannot be empty" });

    const id = uuidv4();
    await db.query(
      `INSERT INTO comments (id, user_id, video_id, content, text, parent_id, like_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [id, userId, videoId, commentText, commentText, parent_id]
    );

    if (!parent_id) {
      await db.query("UPDATE videos SET comments_count = COALESCE(comments_count,0) + 1 WHERE id = ?", [videoId]);
      await db.query("UPDATE videos SET comment_count = COALESCE(comment_count,0) + 1 WHERE id = ?", [videoId]).catch(()=>{});
    }

    const [rows] = await db.query(
      "SELECT c.*, u.username, u.avatar_url FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?",
      [id]
    );
    const newComment = { ...rows[0], replies: [] };
    res.json({ success: true, data: newComment });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
exports.postComment = exports.addComment; // alias

// POST /api/videos/:id/share
exports.recordShare = async (req, res) => {
  try {
    await db.query("UPDATE videos SET shares_count = COALESCE(shares_count,0) + 1 WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/videos/:id/like-status
exports.getLikeStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ liked: false });
    const [rows] = await db.query(
      "SELECT id FROM likes WHERE user_id = ? AND video_id = ?",
      [userId, req.params.id]
    );
    res.json({ liked: rows.length > 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/videos/:id/save — save/bookmark a video
exports.saveVideo = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const videoId = req.params.id;

    const [existing] = await db.query(
      "SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?",
      [userId, videoId]
    );

    let saved;
    if (existing.length) {
      await db.query("DELETE FROM saved_videos WHERE user_id = ? AND video_id = ?", [userId, videoId]);
      saved = false;
    } else {
      await db.query(
        "INSERT INTO saved_videos (id, user_id, video_id, created_at) VALUES (?, ?, ?, NOW())",
        [uuidv4(), userId, videoId]
      );
      saved = true;
    }
    res.json({ success: true, saved });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/videos/:id/save-status
exports.getSaveStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ saved: false });
    const [rows] = await db.query(
      "SELECT id FROM saved_videos WHERE user_id = ? AND video_id = ?",
      [userId, req.params.id]
    );
    res.json({ saved: rows.length > 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/videos/:id
exports.deleteVideo = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT creator_id FROM videos WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Video not found" });
    if (rows[0].creator_id !== req.user.id) return res.status(403).json({ error: "Not your video" });
    await db.query("DELETE FROM videos WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
