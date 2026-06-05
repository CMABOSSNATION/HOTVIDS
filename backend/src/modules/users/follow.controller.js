const db = require('../../config/db');

// POST /api/users/:userId/follow — follow or unfollow (toggle)
const toggleFollow = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    if (followerId === followingId) {
      return res.status(400).json({ success: false, message: "You can't follow yourself" });
    }

    // Check if already following
    const [existing] = await db.query(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    if (existing.length > 0) {
      // Unfollow
      await db.query(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [followerId, followingId]
      );
      await db.query(
        'UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = ?',
        [followingId]
      );
      await db.query(
        'UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?',
        [followerId]
      );
      return res.json({ success: true, following: false, message: 'Unfollowed' });
    } else {
      // Follow
      await db.query(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [followerId, followingId]
      );
      await db.query(
        'UPDATE users SET followers_count = followers_count + 1 WHERE id = ?',
        [followingId]
      );
      await db.query(
        'UPDATE users SET following_count = following_count + 1 WHERE id = ?',
        [followerId]
      );

      // Notify the followed user via Socket.io
      const io = req.app.get('io');
      if (io) {
        const [follower] = await db.query(
          'SELECT username, avatar_url FROM users WHERE id = ?',
          [followerId]
        );
        io.to(`user:${followingId}`).emit('new_follower', {
          follower_id: followerId,
          username: follower[0]?.username,
          avatar_url: follower[0]?.avatar_url,
        });
      }

      return res.json({ success: true, following: true, message: 'Following' });
    }
  } catch (err) {
    console.error('toggleFollow error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:userId/followers — list followers
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;

    const [followers] = await db.query(`
      SELECT
        u.id, u.username, u.avatar_url, u.followers_count,
        f.created_at AS followed_at
      FROM follows f
      JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    res.json({ success: true, data: followers });
  } catch (err) {
    console.error('getFollowers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:userId/following — list who user follows
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;

    const [following] = await db.query(`
      SELECT
        u.id, u.username, u.avatar_url, u.followers_count,
        f.created_at AS followed_at
      FROM follows f
      JOIN users u ON u.id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    res.json({ success: true, data: following });
  } catch (err) {
    console.error('getFollowing error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:userId/follow-status — check if current user follows this user
const getFollowStatus = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    const [rows] = await db.query(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    res.json({ success: true, following: rows.length > 0 });
  } catch (err) {
    console.error('getFollowStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:userId/profile — public profile with stats
const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(`
      SELECT
        u.id, u.username, u.avatar_url, u.bio,
        u.followers_count, u.following_count,
        COUNT(v.id) AS video_count,
        COALESCE(SUM(v.view_count), 0) AS total_views,
        COALESCE(SUM(v.like_count), 0) AS total_likes
      FROM users u
      LEFT JOIN videos v ON v.user_id = u.id AND v.status = 'active'
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { toggleFollow, getFollowers, getFollowing, getFollowStatus, getProfile };
