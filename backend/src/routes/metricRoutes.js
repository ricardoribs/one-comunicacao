const express = require('express');
const controller = require('../controllers/metricController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { metricQuerySchema } = require('../validators/metricValidators');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeCapability('view_metrics'),
  validate(metricQuerySchema, 'query'),
  controller.list
);

module.exports = router;
