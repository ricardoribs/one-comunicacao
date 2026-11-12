const express = require('express');
const controller = require('../controllers/costEntryController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { paginationQuerySchema } = require('../validators/commonValidators');
const { costEntrySchema } = require('../validators/costEntryValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('admin', 'comercial'), validate(paginationQuerySchema, 'query'), controller.list);
router.post('/', authorize('admin', 'comercial'), validate(costEntrySchema), controller.create);

module.exports = router;
