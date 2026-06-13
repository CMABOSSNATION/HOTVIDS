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
  saveVideo,
  getSaveStatus,
  deleteVideo,
} = require('./videos.controller');

// PUBLIC
router.get('/:id', getVideo);
router.get('/:id/comments', getComments);
router.post('/:id/view', recordView);
router.post('/:id/share', recordShare);

// AUTH REQUIRED
router.post('/:id/like', auth, likeVideo);
router.get('/:id/like-status', auth, getLikeStatus);
router.post('/:id/comments', auth, addComment);
router.post('/:id/save', auth, saveVideo);
router.get('/:id/save-status', auth, getSaveStatus);
router.delete('/:id', auth, deleteVideo);

module.exports = router;
