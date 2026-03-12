const { Router } = require('express');
const messageController = require('../controllers/messageController');

const router = Router({ mergeParams: true });

// GET /api/matters/:matterId/messages
router.get('/', messageController.getMessages);

// POST /api/matters/:matterId/messages
router.post('/', messageController.sendMessage);

// PATCH /api/matters/:matterId/messages/read
router.patch('/read', messageController.markAsRead);

// GET /api/matters/:matterId/messages/unread-count
router.get('/unread-count', messageController.getUnreadCount);

module.exports = { messageRoutes: router };
