const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

exports.startLive = async (req, res) => {
  try {
    const { title, description } = req.body;
    const stream_key = uuidv4().replace(/-/g, '');
    const stream_url = `rtmp://178.105.190.123/live/${stream_key}`;
    const id = uuidv4();
    await db.execute(
      `INSERT INTO live_streams 
       (id, creator_id, title, description, stream_key, stream_url, status) 
       VALUES (?,?,?,?,?,?,?)`,
      [id, req.user.id, title, description, stream_key, stream_url, 'live']
    );
    res.json({
      id,
      stream_key,
      stream_url,
      playback_url: `http://178.105.190.123/live/${stream_key}/index.m3u8`,
      message: 'Stream started'
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.stopLive = async (req, res) => {
  try {
    await db.execute(
      'UPDATE live_streams SET status = ? WHERE id = ? AND creator_id = ?',
      ['ended', req.params.id, req.user.id]
    );
    res.json({ message: 'Stream ended' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getLiveStreams = async (req, res) => {
  try {
    const [streams] = await db.execute(
      `SELECT l.*, u.username, u.avatar_url 
       FROM live_streams l 
       JOIN users u ON l.creator_id = u.id 
       WHERE l.status = 'live' 
       ORDER BY l.viewers DESC`
    );
    res.json({ streams });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getLiveStream = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT l.*, u.username, u.avatar_url 
       FROM live_streams l 
       JOIN users u ON l.creator_id = u.id 
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Stream not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateViewers = async (req, res) => {
  try {
    const { action } = req.body;
    const col = action === 'join' ? 'viewers + 1' : 'viewers - 1';
    await db.execute(
      `UPDATE live_streams SET viewers = ${col} WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
