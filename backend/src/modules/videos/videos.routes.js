const router = require("express").Router();
const auth = require("../../middleware/auth");
const db = require("../../config/database");
const {v4:uuidv4} = require("uuid");

router.get("/:id", async (req,res) => {
  try {
    const [rows] = await db.query("SELECT v.*,u.username,u.avatar FROM videos v JOIN users u ON v.creator_id=u.id WHERE v.id=?",[req.params.id]);
    if(!rows.length) return res.status(404).json({error:"Video not found"});
    await db.query("UPDATE videos SET views=views+1 WHERE id=?",[req.params.id]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
});

router.post("/:id/like", auth, async (req,res) => {
  try {
    await db.query("INSERT IGNORE INTO likes (id,user_id,video_id) VALUES (?,?,?)",[uuidv4(),req.user.id,req.params.id]);
    await db.query("UPDATE videos SET likes=likes+1 WHERE id=?",[req.params.id]);
    res.json({message:"Liked"});
  } catch(e){res.status(500).json({error:e.message});}
});

router.delete("/:id/like", auth, async (req,res) => {
  try {
    await db.query("DELETE FROM likes WHERE user_id=? AND video_id=?",[req.user.id,req.params.id]);
    await db.query("UPDATE videos SET likes=likes-1 WHERE id=?",[req.params.id]);
    res.json({message:"Unliked"});
  } catch(e){res.status(500).json({error:e.message});}
});

router.get("/:id/comments", async (req,res) => {
  try {
    const [rows] = await db.query("SELECT c.*,u.username,u.avatar FROM comments c JOIN users u ON c.user_id=u.id WHERE c.video_id=? ORDER BY c.created_at DESC LIMIT 50",[req.params.id]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

router.post("/:id/comments", auth, async (req,res) => {
  try {
    const {text} = req.body;
    const id = uuidv4();
    await db.query("INSERT INTO comments (id,user_id,video_id,text) VALUES (?,?,?,?)",[id,req.user.id,req.params.id,text]);
    res.status(201).json({id,message:"Comment posted"});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
