const router = require("express").Router();
const db = require("../../config/database");
router.get("/", async (req,res) => {
  try {
    const q = req.query.q||"";
    const [videos] = await db.query("SELECT v.*,u.username FROM videos v JOIN users u ON v.creator_id=u.id WHERE v.title LIKE ? OR v.hashtags LIKE ? LIMIT 20",["%"+q+"%","%"+q+"%"]);
    const [users] = await db.query("SELECT id,username,avatar FROM users WHERE username LIKE ? LIMIT 10",["%"+q+"%"]);
    res.json({videos,users});
  } catch(e){res.status(500).json({error:e.message});}
});
module.exports = router;
