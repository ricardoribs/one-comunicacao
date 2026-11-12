const express = require('express');
const controller = require('../controllers/calendarIntegrationController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public provider callback. Access is authorized by the one-time OAuth state.
router.get('/google/callback', controller.handleCallback);

router.use(authenticate);
router.use(authorizeCapability('manage_calendar_events'));

router.post('/google/auth', controller.initiateAuth);
router.get('/status', controller.getStatus);
router.post('/sync', controller.syncFromGoogle);
router.post('/toggle-sync', controller.toggleSync);
router.post('/refresh-token', controller.refreshToken);
router.delete('/disconnect', controller.disconnect);

module.exports = router;
