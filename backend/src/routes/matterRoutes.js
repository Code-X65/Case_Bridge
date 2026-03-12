const { Router } = require('express');
const matterController = require('../controllers/matterController');

const router = Router();

// GET /api/matters
router.get('/', matterController.getMatters);

// GET /api/matters/:id
router.get('/:id', matterController.getMatterById);

// GET /api/matters/:id/updates
router.get('/:id/updates', matterController.getMatterUpdates);

// GET /api/matters/:id/documents
router.get('/:id/documents', matterController.getMatterDocuments);

// GET /api/matters/:id/history
router.get('/:id/history', matterController.getMatterHistory);

// PATCH /api/matters/:id
router.patch('/:id', matterController.updateMatter);

module.exports = { matterRoutes: router };
