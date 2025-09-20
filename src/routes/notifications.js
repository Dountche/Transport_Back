// routes/notifications.js
const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, clearAllNotifications, getUnreadCount } = require('../controllers/notifications');
const { authMiddleware } = require('../middlewares/auth');

router.get('/', authMiddleware, getNotifications);
router.post('/read', authMiddleware, markAsRead);
router.delete('/all', authMiddleware, clearAllNotifications);
router.get('/count', authMiddleware, getUnreadCount);

module.exports = router;