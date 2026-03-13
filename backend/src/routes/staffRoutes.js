const { Router } = require('express');
const staffController = require('../controllers/staffController');

const router = Router();

// POST /api/staff/invite
router.post('/invite', staffController.inviteStaff);

// GET /api/staff
router.get('/', staffController.getStaffList);

// GET /api/staff/invitations
router.get('/invitations', staffController.getInvitationList);

// POST /api/staff/invitations/:id/renew
router.post('/invitations/:id/renew', staffController.renewInviteLink);

// PATCH /api/staff/:id/role
router.patch('/:id/role', staffController.updateStaffRole);

// PATCH /api/staff/:id/status
router.patch('/:id/status', staffController.toggleStaffStatus);

// GET /api/staff/:id/status
router.get('/:id/status', staffController.getStaffStatus);

// DELETE /api/staff/:id
router.delete('/:id', staffController.deleteStaff);

module.exports = { staffRoutes: router };
