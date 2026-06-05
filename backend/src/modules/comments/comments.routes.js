const express = require('express');
const router = express.Router();
const { getComments, postComment, deleteComment } = require('./comments.controller');
const auth = require('../../middleware/auth');

// Public - anyone can read comments
router.get('/:videoId', getComments);

// Auth required - must be logged in to post/delete
router.post('/:videoId', auth, postComment);
router.delete('/:commentId', auth, deleteComment);

module.exports = router;
