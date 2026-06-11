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
    res.json({ success: true, data: rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// PUT /api/users/profile — update own profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, bio, avatar_url, socials, username } = req.body;

    // Build update query dynamically based on what was sent
    const updates = [];
    const values = [];

    if (display_name !== undefined) { updates.push("display_name = ?"); values.push(display_name); }
    if (bio !== undefined) { updates.push("bio = ?"); values.push(bio); }
    if (username !== undefined && username.trim()) {
      // Check username not taken
      const [existing] = await db.query(
        "SELECT id FROM users WHERE username = ? AND id != ?", [username, userId]
      );
      if (existing.length) return res.status(400).json({ error: "Username already taken" });
      updates.push("username = ?"); values.push(username.trim());
    }

    // ✅ Avatar — save base64 string directly to avatar_url column
    if (avatar_url !== undefined) {
      // Accept base64 data URLs or regular URLs
      if (avatar_url && (avatar_url.startsWith('data:image') || avatar_url.startsWith('http') || avatar_url.startsWith('/'))) {
        updates.push("avatar_url = ?");
        values.push(avatar_url);
      }
    }

    if (socials !== undefined) {
      updates.push("socials = ?");
      values.push(typeof socials === 'object' ? JSON.stringify(socials) : socials);
    }

    if (!updates.length) return res.status(400).json({ error: "No fields to update" });

    values.push(userId);
    await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

    // Return updated profile
    const [rows] = await db.query(
      "SELECT id, username, display_name, bio, avatar_url, socials, followers_count, following_count FROM users WHERE id = ?",
      [userId]
    );
    res.json({ success: true, data: rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/:id/videos
exports.getUserVideos = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT v.*, u.username, u.avatar_url FROM videos v
       JOIN users u ON u.id = v.creator_id
       WHERE v.creator_id = ? AND v.status = 'live'
       ORDER BY v.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/:id/liked-videos
exports.getLikedVideos = async (req, res) => {
  try {
    const userId = req.user?.id || req.params.id;
    const [rows] = await db.query(
      `SELECT v.*, u.username, u.avatar_url FROM likes l
       JOIN videos v ON v.id = l.video_id
       JOIN users u ON u.id = v.creator_id
       WHERE l.user_id = ? AND v.status = 'live'
       ORDER BY l.created_at DESC LIMIT 50`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/users/:id/follow
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
      // Unfollow
      await db.query("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [followerId, followingId]);
      await db.query("UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = ?", [followingId]);
      await db.query("UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?", [followerId]);
      return res.json({ success: true, following: false });
    }

    await db.query(
      "INSERT INTO follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, NOW())",
      [uuidv4(), followerId, followingId]
    );
    await db.query("UPDATE users SET followers_count = followers_count + 1 WHERE id = ?", [followingId]);
    await db.query("UPDATE users SET following_count = following_count + 1 WHERE id = ?", [followerId]);
    res.json({ success: true, following: true });
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
