const express = require('express');
const controller = require('../controllers/adminUtilityController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { emptyBodySchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));
router.post('/showcase-ingest', validate(emptyBodySchema), asyncHandler(controller.ingestShowcase));

module.exports = router;
