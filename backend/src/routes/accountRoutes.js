const express = require('express');
const controller = require('../controllers/accountController');
const { authenticate } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { emptyBodySchema, emptyQuerySchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/export', validate(emptyQuerySchema, 'query'), controller.exportData);
router.delete('/', validate(emptyBodySchema), controller.deleteAccount);

module.exports = router;
