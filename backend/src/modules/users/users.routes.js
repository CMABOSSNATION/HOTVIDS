const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getProfile
} = require('./follow.controller');

// Public
router.get('/:userId/profile', getProfile);
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);

// Auth required
router.post('/:userId/follow', auth, toggleFollow);
router.get('/:userId/follow-status', auth, getFollowStatus);

module.exports = router;
