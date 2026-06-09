const router = require("express").Router();
const db = require("../../config/database");
const auth = require("../../middleware/auth");
const { v4: uuidv4 } = require("uuid");

// POST /api/live/start — start a live stream
router.post("/start", auth, async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });
    const id = uuidv4();
    const streamKey = "hvlive_" + uuidv4().replace(/-/g, "").substr(0, 16);
    const rtmpUrl = `rtmp://${process.env.BASE_URL?.replace(/https?:\/\//, "") || "178.105.190.123"}/live`;
    await db.query(
      "INSERT INTO live_streams (id, creator_id, title, category, stream_key, rtmp_url, status, started_at) VALUES (?,?,?,?,?,?,?,NOW())",
      [id, req.user.id, title, category || "entertainment", streamKey, rtmpUrl, "live"]
    );
    res.json({ success: true, id, stream_key: streamKey, rtmp_url: rtmpUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/live/:id/end — end a live stream
router.post("/:id/end", auth, async (req, res) => {
  try {
    await db.query(
      "UPDATE live_streams SET status='ended', ended_at=NOW() WHERE id=? AND creator_id=?",
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/live/streams — list active live streams
router.get("/streams", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, u.username, u.avatar_url 
       FROM live_streams l 
       JOIN users u ON u.id = l.creator_id 
       WHERE l.status = 'live' 
       ORDER BY l.viewers DESC LIMIT 20`
    );
    res.json({ success: true, streams: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/live/:id — get single stream
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT l.*, u.username, u.avatar_url FROM live_streams l JOIN users u ON u.id = l.creator_id WHERE l.id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Stream not found" });
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/live/:id/viewer — increment viewer count
router.post("/:id/viewer", async (req, res) => {
  try {
    await db.query(
      "UPDATE live_streams SET viewers = viewers + 1 WHERE id = ? AND status = 'live'",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
