const { Router } = require('express');
const { 
    getFirmCalendar, 
    getStaffCalendar, 
    createEvent, 
    updateEvent, 
    deleteEvent, 
    checkConflicts,
    getExternalEvents,
    pushEventToExternal,
    getSyncStatus
} = require('../controllers/calendarController');
const {
    initiateGoogleOAuth,
    handleGoogleCallback,
    initiateMicrosoftOAuth,
    handleMicrosoftCallback,
    disconnectCalendar,
    getCalendarConnections,
    updateSyncSettings,
    triggerSync,
    connectCalendar
} = require('../controllers/calendarOAuthController');

const router = Router();

// ====================
// Existing Calendar Routes
// ====================

// Get firm-wide calendar events
router.get('/firm', getFirmCalendar);

// Get staff member's calendar
router.get('/staff', getStaffCalendar);

// Create a new calendar event
router.post('/events', createEvent);

// Update a calendar event
router.patch('/events/:id', updateEvent);

// Delete a calendar event
router.delete('/events/:id', deleteEvent);

// Check for scheduling conflicts
router.post('/check-conflicts', checkConflicts);

// ====================
// OAuth Calendar Routes
// ====================

// Google OAuth
router.get('/oauth/google', initiateGoogleOAuth);
router.get('/oauth/google/callback', handleGoogleCallback);

// Microsoft/Outlook OAuth
router.get('/oauth/microsoft', initiateMicrosoftOAuth);
router.get('/oauth/outlook', initiateMicrosoftOAuth); // Alias
router.get('/oauth/microsoft/callback', handleMicrosoftCallback);
router.get('/oauth/outlook/callback', handleMicrosoftCallback); // Alias

// Calendar connection management
router.post('/connect', connectCalendar);
router.post('/disconnect', disconnectCalendar);
router.get('/connections/:user_id', getCalendarConnections);
router.patch('/settings/:connection_id', updateSyncSettings);

// ====================
// Sync Routes
// ====================

// Trigger manual sync
router.post('/sync', triggerSync);

// Get sync status
router.get('/sync/status', getSyncStatus);

// ====================
// External Calendar Events
// ====================

// Fetch external calendar events
router.get('/events/external', getExternalEvents);

// Push event to external calendar
router.post('/events/push', pushEventToExternal);

module.exports = { calendarRoutes: router };
