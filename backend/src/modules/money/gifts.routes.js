const router = require('express').Router();
const auth = require('../../middleware/auth');
const { getGifts, sendGift, getWallet } = require('./gifts.controller');

router.get('/', getGifts);
router.post('/send', auth, sendGift);
router.get('/wallet', auth, getWallet);

module.exports = router;
