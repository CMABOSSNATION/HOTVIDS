const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

exports.getNotifications = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
