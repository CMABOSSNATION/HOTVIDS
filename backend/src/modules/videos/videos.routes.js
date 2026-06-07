const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {
  getVideo,
  likeVideo,
  addComment,
  getComments,
  recordView,
  recordShare,
  getLikeStatus,
} = require('./videos.controller');

// ── PUBLIC ────────────────────────────────────────────────────
router.get('/:id', getVideo);
router.get('/:id/comments', getComments);          // list comments (public)
router.post('/:id/view', recordView);              // view count (no auth needed)
router.post('/:id/share', recordShare);            // share count (no auth needed)

// ── AUTH REQUIRED ─────────────────────────────────────────────
router.post('/:id/like', auth, likeVideo);         // toggle like
router.get('/:id/like-status', auth, getLikeStatus);
router.post('/:id/comments', auth, addComment);    // post comment

module.exports = router;
