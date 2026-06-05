const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {
  subscribe,
  unsubscribe,
  getNotifications,
  markAllRead,
  markOneRead
} = require('./notifications.controller');

// All routes require auth
router.get('/', auth, getNotifications);
router.post('/subscribe', auth, subscribe);
router.delete('/subscribe', auth, unsubscribe);
router.post('/read-all', auth, markAllRead);
router.post('/read/:id', auth, markOneRead);

module.exports = router;
