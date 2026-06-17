const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {
  getVideo,
  toggleLike,
  postComment,
  getComments,
  recordView,
  recordShare,
  getLikeStatus,
} = require('./videos.controller');

router.get('/:id', getVideo);
router.get('/:id/comments', getComments);
router.post('/:id/view', recordView);
router.post('/:id/share', recordShare);

router.post('/:id/like', auth, toggleLike);
router.get('/:id/like-status', auth, getLikeStatus);
router.post('/:id/comments', auth, postComment);

module.exports = router;
