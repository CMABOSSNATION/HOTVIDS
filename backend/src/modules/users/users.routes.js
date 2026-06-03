const router = require('express').Router();
const auth = require('../../middleware/auth');
const { getProfile, updateProfile, followUser, unfollowUser } = require('./users.controller');

router.get('/:id', getProfile);
router.put('/profile', auth, updateProfile);
router.post('/:id/follow', auth, followUser);
router.delete('/:id/follow', auth, unfollowUser);

module.exports = router;
