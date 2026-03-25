const express = require('express');
const controller = require('../controllers/reportController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { paginationQuerySchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeCapability('view_reports'), validate(paginationQuerySchema, 'query'), controller.list);

module.exports = router;
