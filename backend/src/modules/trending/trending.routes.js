const express = require('express');
const router = express.Router();
const { getTrending, getTrendingHashtags, recordView } = require('./trending.controller');

// Public routes - no auth needed
router.get('/', getTrending);
router.get('/hashtags', getTrendingHashtags);
router.post('/view', recordView);

module.exports = router;
