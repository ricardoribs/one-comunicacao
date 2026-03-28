const express = require('express');
const controller = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { idParamSchema } = require('../validators/commonValidators');
const { notificationQuerySchema } = require('../validators/notificationValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', validate(notificationQuerySchema, 'query'), controller.list);
router.get('/unread-count', controller.countUnread);
router.patch('/read-all', controller.markAllAsRead);
router.patch('/:id/read', validate(idParamSchema, 'params'), controller.markAsRead);

module.exports = router;
