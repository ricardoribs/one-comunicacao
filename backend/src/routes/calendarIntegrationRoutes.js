const express = require('express');
const controller = require('../controllers/calendarIntegrationController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');

const router = express.Router();

// OAuth flow - usa token via query param e state do Google (redirect do browser não envia headers)
router.get('/google/auth', controller.initiateAuth);
router.get('/google/callback', controller.handleCallback);

// Endpoints protegidos
router.use(authenticate);
router.use(authorizeCapability('manage_calendar_events'));

router.get('/status', controller.getStatus);
router.post('/sync', controller.syncFromGoogle);
router.post('/toggle-sync', controller.toggleSync);
router.post('/refresh-token', controller.refreshToken);
router.delete('/disconnect', controller.disconnect);

module.exports = router;
