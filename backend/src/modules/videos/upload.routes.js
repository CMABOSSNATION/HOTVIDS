const router = require("express").Router();
const auth = require("../../middleware/auth");
const { getUploadUrl, saveVideo, localUpload } = require("./upload.controller");
router.get("/upload-url", auth, getUploadUrl);
router.post("/local", auth, localUpload);
router.post("/save", auth, saveVideo);
module.exports = router;
