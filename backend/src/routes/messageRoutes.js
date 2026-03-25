const express = require('express');
const controller = require('../controllers/messageController');
const { authenticate } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { messageSchema, messageQuerySchema } = require('../validators/messageValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', validate(messageQuerySchema, 'query'), controller.list);
router.post('/', validate(messageSchema), controller.create);

module.exports = router;
