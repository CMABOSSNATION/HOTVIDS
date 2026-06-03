const router = require('express').Router();
const { register, login, refresh } = require('./auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

module.exports = router;
