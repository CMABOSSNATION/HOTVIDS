const router = require('express').Router();
const { getFeed, getTrending } = require('./feed.controller');

router.get('/', getFeed);
router.get('/trending', getTrending);

module.exports = router;
