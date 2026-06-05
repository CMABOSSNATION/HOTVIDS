const express = require('express');
const router = express.Router();
const { getTrendingHashtags, getVideosByHashtag, search } = require('./hashtag.controller');

// Search everything
router.get('/', search);

// Hashtags
router.get('/hashtags/trending', getTrendingHashtags);
router.get('/hashtags/:tag', getVideosByHashtag);

module.exports = router;
