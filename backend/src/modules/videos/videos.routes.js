const router = require('express').Router();
const auth = require('../../middleware/auth');
const { uploadVideo, getVideo, likeVideo, addComment, recordView } = require('./videos.controller');

router.post('/', auth, uploadVideo);
router.get('/:id', getVideo);
router.post('/:id/like', auth, likeVideo);
router.post('/:id/comment', auth, addComment);
router.post('/:id/view', recordView);

module.exports = router;
