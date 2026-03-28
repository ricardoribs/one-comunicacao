const express = require('express');
const controller = require('../controllers/checklistController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { emptyQuerySchema } = require('../validators/commonValidators');
const { dailyChecklistUpdateSchema } = require('../validators/checklistValidators');

const router = express.Router();

router.use(authenticate);
router.get('/daily', authorizeCapability('view_tasks'), validate(emptyQuerySchema, 'query'), controller.getDailyChecklist);
router.put('/daily', authorizeCapability('manage_tasks'), validate(dailyChecklistUpdateSchema), controller.updateDailyChecklist);

module.exports = router;
