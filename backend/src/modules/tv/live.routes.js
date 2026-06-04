const router = require("express").Router();

// Live streaming routes - coming soon
router.get("/streams", (req,res) => {
  res.json({streams:[], message:"Live streaming coming soon"});
});

module.exports = router;
