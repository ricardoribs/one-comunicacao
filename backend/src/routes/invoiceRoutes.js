const express = require('express');
const controller = require('../controllers/invoiceController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { invoiceSchema, invoiceUpdateSchema, invoiceStatusSchema } = require('../validators/invoiceValidators');
const { paginationQuerySchema, idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeCapability('view_invoices'), validate(paginationQuerySchema, 'query'), controller.list);
router.post('/', authorizeCapability('manage_invoices'), validate(invoiceSchema), controller.create);
router.patch('/:id/status', authorizeCapability('manage_invoices'), validate(idParamSchema, 'params'), validate(invoiceStatusSchema), controller.update);
router.put('/:id', authorizeCapability('manage_invoices'), validate(idParamSchema, 'params'), validate(invoiceUpdateSchema), controller.update);

module.exports = router;
