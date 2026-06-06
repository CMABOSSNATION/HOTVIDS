const db = require("../../config/database");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

// ── Multer (local fallback) ──────────────────────────────────────────────────
let multer;
try { multer = require("multer"); } catch(e) { multer = null; }

const UPLOAD_DIR = path.join(__dirname, "../../../../../uploads/videos");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getLocalStorage() {
  if (!multer) throw new Error("multer not installed");
  ensureUploadDir();
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const uid = uuidv4();
      const ext = path.extname(file.originalname) || ".mp4";
      cb(null, uid + ext);
    }
  });
}

function useCloudflare() {
  const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;
  const CF_TOKEN = process.env.CF_API_TOKEN;
  return !!(CF_ACCOUNT && CF_TOKEN && CF_ACCOUNT.trim() && CF_TOKEN.trim());
}

// ── Route: GET /api/upload/upload-url ────────────────────────────────────────
exports.getUploadUrl = async (req, res) => {
  try {
    if (useCloudflare()) {
      // Cloudflare Stream direct upload
      const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;
      const CF_TOKEN = process.env.CF_API_TOKEN;
      const resp = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/direct_upload`,
        { maxDurationSeconds: 300 },
        { headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" } }
      );
      return res.json({
        mode: "cloudflare",
        uploadURL: resp.data.result.uploadURL,
        uid: resp.data.result.uid
      });
    } else {
      // Local upload mode — tell frontend to POST the file directly
      return res.json({
        mode: "local",
        uploadURL: "/api/upload/local",
        uid: null
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Route: POST /api/upload/local (multipart, local fallback) ─────────────────
exports.localUpload = (req, res) => {
  if (!multer) return res.status(500).json({ error: "multer not installed on server" });
  ensureUploadDir();
  const storage = getLocalStorage();
  const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }).single("file");
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file received" });
    const uid = path.basename(req.file.filename, path.extname(req.file.filename));
    res.json({ uid, filename: req.file.filename });
  });
};

// ── Route: POST /api/upload/save ─────────────────────────────────────────────
exports.saveVideo = async (req, res) => {
  try {
    const { title, description, cloudflare_video_id, hashtags, mode } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    if (!cloudflare_video_id) return res.status(400).json({ error: "Video ID is required" });
    const id = uuidv4();
    // status: "live" for cloudflare (processed by CF), "local" for disk uploads
    const status = (mode === "local") ? "local" : "live";
    await db.query(
      "INSERT INTO videos (id,creator_id,title,description,cloudflare_video_id,hashtags,status) VALUES (?,?,?,?,?,?,?)",
      [id, req.user.id, title, description || "", cloudflare_video_id, hashtags || "", status]
    );
    res.status(201).json({ id, message: "Video saved successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
