const express = require('express');
const controller = require('../controllers/dashboardController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { emptyQuerySchema } = require('../validators/commonValidators');

const router = express.Router();

router.get('/', authenticate, authorizeCapability('view_dashboard'), validate(emptyQuerySchema, 'query'), controller.getDashboard);

module.exports = router;
