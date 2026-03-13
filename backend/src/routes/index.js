const { Router } = require('express');
const { messageRoutes } = require('./messageRoutes');
const { matterRoutes } = require('./matterRoutes');
const { workspaceRoutes } = require('./workspaceRoutes');
const { calendarRoutes } = require('./calendarRoutes');
const { staffRoutes } = require('./staffRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Staff routes
router.use('/staff', staffRoutes);

// Message routes
router.use('/matters/:matterId/messages', messageRoutes);

// Matter routes
router.use('/matters', matterRoutes);

// Workspace routes
router.use('/workspace', workspaceRoutes);

// Calendar routes
router.use('/calendar', calendarRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

module.exports = { router };
