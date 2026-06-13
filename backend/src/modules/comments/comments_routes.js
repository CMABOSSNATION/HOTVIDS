const express = require('express');
const router = express.Router();
const { getComments, postComment, deleteComment, likeComment } = require('./comments.controller');
const auth = require('../../middleware/auth');

// Public - anyone can read comments
router.get('/:videoId', getComments);

// Auth required
router.post('/:videoId', auth, postComment);
router.delete('/:commentId', auth, deleteComment);
router.post('/:commentId/like', auth, likeComment);

module.exports = router;
