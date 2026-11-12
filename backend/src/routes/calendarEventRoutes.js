const express = require('express');
const controller = require('../controllers/calendarEventController');
const validate = require('../middlewares/validateMiddleware');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const { idParamSchema } = require('../validators/commonValidators');
const {
  calendarEventQuerySchema,
  calendarEventSchema,
  calendarEventUpdateSchema,
} = require('../validators/calendarEventValidators');

const router = express.Router();

router.use(authenticate);

router.get('/', authorizeCapability('view_calendar_events'), validate(calendarEventQuerySchema, 'query'), controller.list);
router.get('/:id', authorizeCapability('view_calendar_events'), validate(idParamSchema, 'params'), controller.getById);
router.post('/', authorizeCapability('manage_calendar_events'), validate(calendarEventSchema), controller.create);
router.put(
  '/:id',
  authorizeCapability('manage_calendar_events'),
  validate(idParamSchema, 'params'),
  validate(calendarEventUpdateSchema),
  controller.update
);
router.delete('/:id', authorizeCapability('manage_calendar_events'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
