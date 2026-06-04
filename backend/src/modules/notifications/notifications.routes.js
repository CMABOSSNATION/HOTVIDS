const router = require("express").Router();
const auth = require("../../middleware/auth");
const db = require("../../config/database");
router.get("/", auth, async (req,res) => {
  try {
    const [rows] = await db.query("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",[req.user.id]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});
router.put("/read", auth, async (req,res) => {
  try {
    await db.query("UPDATE notifications SET is_read=1 WHERE user_id=?",[req.user.id]);
    res.json({message:"Marked as read"});
  } catch(e){res.status(500).json({error:e.message});}
});
module.exports = router;
