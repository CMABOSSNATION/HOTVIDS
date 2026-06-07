const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getProfile: getProfileFollow
} = require('./follow.controller');
const {
  updateProfile,
  getLikedVideos,
  followUser,
  unfollowUser
} = require('./users.controller');

// ── PUBLIC ROUTES ────────────────────────────────────────────
router.get('/:userId/profile', getProfileFollow);      // full profile with stats
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);
router.get('/:userId/liked-videos', getLikedVideos);   // liked videos grid

// ── AUTH REQUIRED ────────────────────────────────────────────
router.put('/profile', auth, updateProfile);            // edit own profile
router.post('/:userId/follow', auth, toggleFollow);     // follow/unfollow toggle
router.get('/:userId/follow-status', auth, getFollowStatus);

module.exports = router;
