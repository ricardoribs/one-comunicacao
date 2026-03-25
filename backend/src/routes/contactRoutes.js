const express = require('express');
const controller = require('../controllers/contactController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { contactSchema, contactUpdateSchema, contactConvertSchema } = require('../validators/contactValidators');
const { paginationQuerySchema, idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.post('/', validate(contactSchema), controller.create);

router.use(authenticate);
router.get('/', authorizeCapability('view_contacts'), validate(paginationQuerySchema, 'query'), controller.list);
router.put('/:id', authorizeCapability('manage_contacts'), validate(idParamSchema, 'params'), validate(contactUpdateSchema), controller.update);
router.patch('/:id', authorizeCapability('manage_contacts'), validate(idParamSchema, 'params'), validate(contactUpdateSchema), controller.update);
router.delete('/:id', authorizeCapability('manage_contacts'), validate(idParamSchema, 'params'), controller.remove);
router.post('/:id/convert', authorizeCapability('manage_contacts'), validate(idParamSchema, 'params'), validate(contactConvertSchema), controller.convert);

module.exports = router;
