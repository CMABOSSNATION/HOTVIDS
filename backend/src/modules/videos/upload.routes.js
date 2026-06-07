const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {v4: uuidv4} = require("uuid");
const db = require("../../config/database");

// Ensure upload directory exists
const uploadDir = "/uploads/videos";
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {recursive: true});

// Multer config - local storage
const storage = multer.diskStorage({
  destination: function(req, file, cb){ cb(null, uploadDir); },
  filename: function(req, file, cb){
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: function(req, file, cb){
    if(file.mimetype.startsWith('video/')){ cb(null, true); }
    else { cb(new Error('Only video files allowed')); }
  }
});

// POST /api/upload/video — upload video file
router.post("/video", upload.single('video'), async (req, res) => {
  try {
    if(!req.file) return res.status(400).json({error: "No video file provided"});

    const {title, description, hashtags} = req.body;
    if(!title) return res.status(400).json({error: "Title is required"});

    const id = uuidv4();
    const videoUrl = "/uploads/videos/" + req.file.filename;

    // Get user id from token if available
    let creator_id = "anonymous";
    if(req.headers.authorization){
      try{
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          req.headers.authorization.split(" ")[1],
          process.env.JWT_SECRET || "hotvid_uganda_secret_2024"
        );
        creator_id = decoded.id;
      }catch(e){ /* anonymous upload */ }
    }

    await db.query(
      "INSERT INTO videos (id, creator_id, title, description, video_url, cloudflare_video_id, hashtags, status) VALUES (?,?,?,?,?,?,?,?)",
      [id, creator_id, title, description || "", videoUrl, req.file.filename, hashtags || "", "live"]
    );

    res.status(201).json({
      id,
      message: "Video uploaded successfully",
      video_url: videoUrl
    });
  } catch(e){
    res.status(500).json({error: e.message});
  }
});

// GET /api/upload/upload-url — Cloudflare Stream direct upload URL
router.get("/upload-url", async (req, res) => {
  try {
    const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;
    const CF_TOKEN = process.env.CF_API_TOKEN;
    if(!CF_ACCOUNT || !CF_TOKEN) return res.status(500).json({error: "Cloudflare not configured"});
    const axios = require("axios");
    const resp = await axios.post(
      "https://api.cloudflare.com/client/v4/accounts/" + CF_ACCOUNT + "/stream/direct_upload",
      {maxDurationSeconds: 300},
      {headers: {Authorization: "Bearer " + CF_TOKEN, "Content-Type": "application/json"}}
    );
    res.json({uploadURL: resp.data.result.uploadURL, uid: resp.data.result.uid});
  } catch(e){ res.status(500).json({error: e.message}); }
});

// POST /api/upload/save — save Cloudflare video ID
router.post("/save", async (req, res) => {
  try {
    const {title, description, cloudflare_video_id, hashtags} = req.body;
    if(!title) return res.status(400).json({error: "Title is required"});
    if(!cloudflare_video_id) return res.status(400).json({error: "Video ID required"});
    const id = uuidv4();
    let creator_id = "anonymous";
    if(req.headers.authorization){
      try{
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          req.headers.authorization.split(" ")[1],
          process.env.JWT_SECRET || "hotvid_uganda_secret_2024"
        );
        creator_id = decoded.id;
      }catch(e){}
    }
    await db.query(
      "INSERT INTO videos (id,creator_id,title,description,cloudflare_video_id,hashtags,status) VALUES (?,?,?,?,?,?,?)",
      [id, creator_id, title, description || "", cloudflare_video_id, hashtags || "", "live"]
    );
    res.status(201).json({id, message: "Video saved"});
  } catch(e){ res.status(500).json({error: e.message}); }
});

module.exports = router;
