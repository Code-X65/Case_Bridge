const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Existing polling/fetching
router.get('/', notificationController.getNotifications);
router.get('/poll', notificationController.pollNotifications);

// New Preference Management
router.get('/preferences', notificationController.getPreferences);
router.patch('/preferences', notificationController.updatePreferences);

// New Send/Test
router.post('/send', notificationController.sendNotification);
router.post('/test', notificationController.sendTestNotification);

module.exports = router;
