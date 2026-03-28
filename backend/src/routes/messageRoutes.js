const express = require('express');
const controller = require('../controllers/messageController');
const { authenticate } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { messageSchema, messageQuerySchema, messageReadSchema } = require('../validators/messageValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', validate(messageQuerySchema, 'query'), controller.list);
router.patch('/read', validate(messageReadSchema), controller.markRead);
router.post('/', validate(messageSchema), controller.create);

module.exports = router;
