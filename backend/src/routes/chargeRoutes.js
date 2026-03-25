const express = require('express');
const controller = require('../controllers/chargeController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { chargeSchema, chargeUpdateSchema } = require('../validators/chargeValidators');
const { paginationQuerySchema, idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeCapability('view_charges'), validate(paginationQuerySchema, 'query'), controller.list);
router.post('/', authorizeCapability('manage_charges'), validate(chargeSchema), controller.create);
router.patch('/:id', authorizeCapability('manage_charges'), validate(idParamSchema, 'params'), validate(chargeUpdateSchema), controller.update);

module.exports = router;
