const db = require('../../config/database');

exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, email, phone, avatar_url, bio, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { bio, avatar_url } = req.body;
    await db.execute(
      'UPDATE users SET bio = ?, avatar_url = ? WHERE id = ?',
      [bio, avatar_url, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.followUser = async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    await db.execute(
      'INSERT IGNORE INTO follows (id, follower_id, following_id) VALUES (?,?,?)',
      [uuidv4(), req.user.id, req.params.id]
    );
    res.json({ message: 'Following' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Unfollowed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
