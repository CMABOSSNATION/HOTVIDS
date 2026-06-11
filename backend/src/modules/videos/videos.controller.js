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
    await db.query("UPDATE videos SET views = views + 1 WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/videos/:id/view
exports.recordView = async (req, res) => {
  try {
    await db.query("UPDATE videos SET views = views + 1 WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/videos/:id/like — toggle like
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const videoId = req.params.id;

    // Check if already liked
    const [existing] = await db.query(
      "SELECT id FROM likes WHERE user_id = ? AND video_id = ?",
      [userId, videoId]
    );

    let liked;
    if (existing.length) {
      // Unlike
      await db.query("DELETE FROM likes WHERE user_id = ? AND video_id = ?", [userId, videoId]);
      await db.query("UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?", [videoId]);
      liked = false;
    } else {
      // Like
      await db.query(
        "INSERT INTO likes (id, user_id, video_id, created_at) VALUES (?, ?, ?, NOW())",
        [uuidv4(), userId, videoId]
      );
      await db.query("UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?", [videoId]);
      liked = true;
    }

    const [rows] = await db.query("SELECT likes_count FROM videos WHERE id = ?", [videoId]);
    res.json({ success: true, liked, likes_count: rows[0]?.likes_count || 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/videos/:id/comments
exports.getComments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.username, u.avatar_url
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.video_id = ?
       ORDER BY c.created_at DESC LIMIT 100`,
      [req.params.id]
    );
    // Return content field (fall back to text if content is null)
    const comments = rows.map(c => ({
      ...c,
      content: c.content || c.text || '',
      text: c.text || c.content || ''
    }));
    res.json(comments);
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/videos/:id/comments — save comment
exports.postComment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const videoId = req.params.id;
    // Accept both 'content' and 'text' from frontend
    const commentText = req.body.content || req.body.text || '';
    if (!commentText.trim()) return res.status(400).json({ error: "Comment cannot be empty" });

    const id = uuidv4();
    // Save to both content and text columns for compatibility
    await db.query(
      `INSERT INTO comments (id, user_id, video_id, content, text, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, userId, videoId, commentText, commentText]
    );
    // Update comment count on video
    await db.query(
      "UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?",
      [videoId]
    );

    // Return the comment with user info
    const [rows] = await db.query(
      "SELECT c.*, u.username, u.avatar_url FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?",
      [id]
    );
    res.json({ success: true, data: rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/videos/:id/share
exports.recordShare = async (req, res) => {
  try {
    await db.query("UPDATE videos SET shares_count = shares_count + 1 WHERE id = ?", [req.params.id]);
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
