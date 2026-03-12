const { Router } = require('express');
const reportController = require('../controllers/reportController');
const notificationController = require('../controllers/notificationController');
const signatureController = require('../controllers/signatureController');
const auditController = require('../controllers/auditController');
const meetingController = require('../controllers/meetingController');
const communicationController = require('../controllers/communicationController');
const deadlineController = require('../controllers/deadlineController');

const router = Router();

// GET /api/workspace/reports
router.get('/reports', reportController.getReports);

// GET /api/workspace/reports/documents
router.get('/reports/documents', reportController.getReportDocuments);

// GET /api/workspace/notifications
router.get('/notifications', notificationController.getNotifications);

// GET /api/workspace/poll
router.get('/poll', notificationController.pollNotifications);

// GET /api/workspace/signatures
router.get('/signatures', signatureController.getSignatureRequests);

// GET /api/workspace/audit-logs
router.get('/audit-logs', auditController.getAuditLogs);

// GET /api/workspace/meetings
router.get('/meetings', meetingController.getMeetings);

// GET /api/workspace/communications
router.get('/communications', communicationController.getCommunications);

// GET /api/workspace/deadlines
router.get('/deadlines', deadlineController.getDeadlines);

module.exports = { workspaceRoutes: router };
