const router = require('express').Router();
const auth = require('../../middleware/auth');
const { getNextAd, recordImpression, createAd, getAdStats } = require('./ads.controller');

router.get('/next', getNextAd);
router.post('/impression', recordImpression);
router.post('/create', auth, createAd);
router.get('/stats', auth, getAdStats);

module.exports = router;
