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
  getSavedVideos,
  getUserVideos,
  followUser,
  unfollowUser,
  searchUsers,
} = require('./users.controller');

// PUBLIC
router.get('/search', searchUsers);
router.get('/:userId/profile', getProfileFollow);
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);
router.get('/:userId/liked-videos', getLikedVideos);
router.get('/:userId/saved-videos', getSavedVideos);
router.get('/:userId/videos', getUserVideos);

// AUTH REQUIRED
router.put('/profile', auth, updateProfile);
router.post('/:userId/follow', auth, toggleFollow);
router.get('/:userId/follow-status', auth, getFollowStatus);

module.exports = router;
