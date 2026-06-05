const db = require('../../config/db');
const webpush = require('web-push');

// Configure VAPID keys (generate once and put in .env)
webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL || 'admin@hotvid.ug'),
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// ─── PUSH SUBSCRIPTION ───────────────────────────────────────

// POST /api/notifications/subscribe — save push subscription
const subscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body;

    if (!subscription?.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription' });
    }

    const subStr = JSON.stringify(subscription);

    // Upsert subscription
    await db.query(`
      INSERT INTO push_subscriptions (user_id, subscription)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE subscription = VALUES(subscription), updated_at = NOW()
    `, [userId, subStr]);

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err) {
    console.error('subscribe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/notifications/subscribe — remove push subscription
const unsubscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('unsubscribe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── SEND PUSH HELPER ────────────────────────────────────────

const sendPushToUser = async (userId, payload) => {
  try {
    const [rows] = await db.query(
      'SELECT subscription FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    for (const row of rows) {
      try {
        const sub = JSON.parse(row.subscription);
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (pushErr) {
        // Subscription expired — remove it
        if (pushErr.statusCode === 410) {
          await db.query(
            'DELETE FROM push_subscriptions WHERE user_id = ?',
            [userId]
          );
        }
      }
    }
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
};

// ─── IN-APP NOTIFICATIONS ────────────────────────────────────

// GET /api/notifications — get my notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;

    const [notifications] = await db.query(`
      SELECT
        n.id, n.type, n.message, n.is_read,
        n.created_at, n.reference_id,
        u.username AS from_username,
        u.avatar_url AS from_avatar
      FROM notifications n
      LEFT JOIN users u ON u.id = n.from_user_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    // Count unread
    const [unread] = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      success: true,
      data: notifications,
      unread_count: unread[0].count
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/notifications/read-all — mark all as read
const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/notifications/read/:id — mark one as read
const markOneRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── NOTIFY HELPERS (called from other controllers) ──────────

// Notify when someone likes your video
const notifyLike = async (videoOwnerId, fromUserId, videoId, fromUsername) => {
  if (videoOwnerId === fromUserId) return;
  try {
    await db.query(
      `INSERT INTO notifications (user_id, from_user_id, type, message, reference_id)
       VALUES (?, ?, 'like', ?, ?)`,
      [videoOwnerId, fromUserId, `@${fromUsername} liked your video ❤️`, videoId]
    );
    await sendPushToUser(videoOwnerId, {
      title: 'New Like 🔥',
      body: `@${fromUsername} liked your video`,
      icon: '/icons/icon-192.png',
      url: `/feed.html?v=${videoId}`
    });
  } catch (err) {
    console.error('notifyLike error:', err);
  }
};

// Notify when someone comments on your video
const notifyComment = async (videoOwnerId, fromUserId, videoId, fromUsername, comment) => {
  if (videoOwnerId === fromUserId) return;
  try {
    await db.query(
      `INSERT INTO notifications (user_id, from_user_id, type, message, reference_id)
       VALUES (?, ?, 'comment', ?, ?)`,
      [videoOwnerId, fromUserId, `@${fromUsername} commented: "${comment.slice(0, 50)}"`, videoId]
    );
    await sendPushToUser(videoOwnerId, {
      title: 'New Comment 💬',
      body: `@${fromUsername}: ${comment.slice(0, 60)}`,
      icon: '/icons/icon-192.png',
      url: `/feed.html?v=${videoId}`
    });
  } catch (err) {
    console.error('notifyComment error:', err);
  }
};

// Notify when someone follows you
const notifyFollow = async (followedUserId, fromUserId, fromUsername) => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, from_user_id, type, message, reference_id)
       VALUES (?, ?, 'follow', ?, ?)`,
      [followedUserId, fromUserId, `@${fromUsername} started following you 🎉`, fromUserId]
    );
    await sendPushToUser(followedUserId, {
      title: 'New Follower 🎉',
      body: `@${fromUsername} is now following you`,
      icon: '/icons/icon-192.png',
      url: `/profile.html?id=${fromUserId}`
    });
  } catch (err) {
    console.error('notifyFollow error:', err);
  }
};

// Notify when someone sends a gift
const notifyGift = async (videoOwnerId, fromUserId, fromUsername, giftName, amountUGX) => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, from_user_id, type, message, reference_id)
       VALUES (?, ?, 'gift', ?, ?)`,
      [videoOwnerId, fromUserId, `@${fromUsername} sent you a ${giftName} worth UGX ${amountUGX?.toLocaleString()} 🎁`, fromUserId]
    );
    await sendPushToUser(videoOwnerId, {
      title: `Gift Received 🎁`,
      body: `@${fromUsername} sent you ${giftName} — UGX ${amountUGX?.toLocaleString()}`,
      icon: '/icons/icon-192.png',
      url: `/profile.html`
    });
  } catch (err) {
    console.error('notifyGift error:', err);
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  getNotifications,
  markAllRead,
  markOneRead,
  notifyLike,
  notifyComment,
  notifyFollow,
  notifyGift,
  sendPushToUser
};
