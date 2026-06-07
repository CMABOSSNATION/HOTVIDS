const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/users/:id/profile  (public — used by follow.controller.js getProfile)
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, username, display_name, email, phone, avatar_url, bio, role,
              followers_count, following_count, socials, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    // Parse socials JSON safely
    try { u.socials = u.socials ? JSON.parse(u.socials) : {}; } catch(e) { u.socials = {}; }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/users/profile  (auth required — own profile)
exports.updateProfile = async (req, res) => {
  try {
    const { bio, avatar_url, display_name, phone, socials, username } = req.body;
    const fields = [];
    const vals = [];

    if (bio !== undefined)          { fields.push('bio = ?');          vals.push(bio); }
    if (avatar_url !== undefined)   { fields.push('avatar_url = ?');   vals.push(avatar_url); }
    if (display_name !== undefined) { fields.push('display_name = ?'); vals.push(display_name); }
    if (phone !== undefined)        { fields.push('phone = ?');        vals.push(phone); }
    if (socials !== undefined)      { fields.push('socials = ?');      vals.push(JSON.stringify(socials)); }
    if (username !== undefined && username.length > 2) {
      // Check uniqueness
      const [exist] = await db.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, req.user.id]
      );
      if (exist.length) return res.status(409).json({ error: 'Username already taken' });
      fields.push('username = ?'); vals.push(username);
    }

    if (!fields.length) return res.json({ success: true, message: 'Nothing to update' });

    vals.push(req.user.id);
    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, vals);

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/users/:userId/liked-videos  (public or auth)
exports.getLikedVideos = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;

    const [rows] = await db.execute(
      `SELECT v.id, v.title, v.thumbnail_url, v.video_url, v.cloudflare_video_id,
              v.views, v.likes_count, v.comments_count, v.created_at,
              u.username, u.avatar_url
       FROM likes l
       JOIN videos v ON v.id = l.video_id AND v.status = 'live'
       JOIN users u ON u.id = v.creator_id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getLikedVideos error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/users/:userId/follow  (kept for backward compat — main logic in follow.controller.js)
exports.followUser = async (req, res) => {
  try {
    await db.execute(
      'INSERT IGNORE INTO follows (id, follower_id, following_id) VALUES (?,?,?)',
      [uuidv4(), req.user.id, req.params.userId]
    );
    res.json({ success: true, message: 'Following' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, req.params.userId]
    );
    res.json({ success: true, message: 'Unfollowed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
