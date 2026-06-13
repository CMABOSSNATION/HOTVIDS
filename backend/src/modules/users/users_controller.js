const db = require("../../config/database");
const { v4: uuidv4 } = require("uuid");

// GET /api/users/:id/profile
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.socials,
              u.followers_count, u.following_count, u.is_verified, u.created_at,
              COUNT(DISTINCT v.id) AS video_count,
              COALESCE(SUM(v.views), 0) AS total_views,
              COALESCE(SUM(v.likes_count), 0) AS total_likes
       FROM users u
       LEFT JOIN videos v ON v.creator_id = u.id AND v.status = 'live'
       WHERE u.id = ?
       GROUP BY u.id`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    const u = rows[0];
    try { u.socials = u.socials ? JSON.parse(u.socials) : {}; } catch(e) { u.socials = {}; }
    res.json({ success: true, data: u });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, bio, avatar_url, socials, username, phone } = req.body;
    const updates = [];
    const values = [];

    if (display_name !== undefined) { updates.push("display_name = ?"); values.push(display_name); }
    if (bio !== undefined) { updates.push("bio = ?"); values.push(bio); }
    if (phone !== undefined) { updates.push("phone = ?"); values.push(phone); }
    if (username !== undefined && username.trim()) {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE username = ? AND id != ?", [username, userId]
      );
      if (existing.length) return res.status(400).json({ error: "Username already taken" });
      updates.push("username = ?"); values.push(username.trim());
    }
    if (avatar_url !== undefined) {
      if (avatar_url && (avatar_url.startsWith('data:image') || avatar_url.startsWith('http') || avatar_url.startsWith('/'))) {
        updates.push("avatar_url = ?"); values.push(avatar_url);
      }
    }
    if (socials !== undefined) {
      updates.push("socials = ?");
      values.push(typeof socials === 'object' ? JSON.stringify(socials) : socials);
    }

    if (!updates.length) return res.status(400).json({ error: "No fields to update" });

    values.push(userId);
    await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

    const [rows] = await db.query(
      "SELECT id, username, display_name, bio, avatar_url, socials, followers_count, following_count FROM users WHERE id = ?",
      [userId]
    );
    const u = rows[0];
    try { u.socials = u.socials ? JSON.parse(u.socials) : {}; } catch(e) { u.socials = {}; }
    res.json({ success: true, data: u });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/:id/videos — user's uploaded videos
exports.getUserVideos = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await db.query(
      `SELECT v.id, v.title, v.thumbnail_url, v.video_url, v.cloudflare_video_id,
              v.views, v.likes_count, v.comments_count, v.created_at,
              u.username, u.avatar_url
       FROM videos v JOIN users u ON u.id = v.creator_id
       WHERE v.creator_id = ? AND v.status = 'live'
       ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
      [req.params.id, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/:id/liked-videos
exports.getLikedVideos = async (req, res) => {
  try {
    const userId = req.params.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await db.query(
      `SELECT v.id, v.title, v.thumbnail_url, v.video_url, v.cloudflare_video_id,
              v.views, v.likes_count, v.comments_count, v.created_at,
              u.username, u.avatar_url
       FROM likes l
       JOIN videos v ON v.id = l.video_id AND v.status = 'live'
       JOIN users u ON u.id = v.creator_id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/:id/saved-videos
exports.getSavedVideos = async (req, res) => {
  try {
    const userId = req.params.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await db.query(
      `SELECT v.id, v.title, v.thumbnail_url, v.video_url, v.cloudflare_video_id,
              v.views, v.likes_count, v.comments_count, v.created_at,
              u.username, u.avatar_url
       FROM saved_videos s
       JOIN videos v ON v.id = s.video_id AND v.status = 'live'
       JOIN users u ON u.id = v.creator_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/users/:id/follow (toggle)
exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.id;
    if (followerId === followingId) return res.status(400).json({ error: "Cannot follow yourself" });

    const [existing] = await db.query(
      "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
      [followerId, followingId]
    );

    if (existing.length) {
      await db.query("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [followerId, followingId]);
      await db.query("UPDATE users SET followers_count = GREATEST(COALESCE(followers_count,0) - 1, 0) WHERE id = ?", [followingId]);
      await db.query("UPDATE users SET following_count = GREATEST(COALESCE(following_count,0) - 1, 0) WHERE id = ?", [followerId]);
      return res.json({ success: true, following: false });
    }

    await db.query(
      "INSERT INTO follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, NOW())",
      [uuidv4(), followerId, followingId]
    );
    await db.query("UPDATE users SET followers_count = COALESCE(followers_count,0) + 1 WHERE id = ?", [followingId]);
    await db.query("UPDATE users SET following_count = COALESCE(following_count,0) + 1 WHERE id = ?", [followerId]);
    res.json({ success: true, following: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

exports.unfollowUser = async (req, res) => {
  try {
    await db.query("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [req.user.id, req.params.id]);
    res.json({ success: true, following: false });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/:id/follow-status
exports.getFollowStatus = async (req, res) => {
  try {
    if (!req.user?.id) return res.json({ following: false });
    const [rows] = await db.query(
      "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
      [req.user.id, req.params.id]
    );
    res.json({ following: rows.length > 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/search?q=
exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const [rows] = await db.query(
      "SELECT id, username, display_name, avatar_url, followers_count FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 20",
      ['%'+q+'%', '%'+q+'%']
    );
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
