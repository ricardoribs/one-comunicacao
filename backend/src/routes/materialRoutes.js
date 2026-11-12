const express = require('express');
const controller = require('../controllers/materialController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { materialSchema, materialUpdateSchema, materialStatusSchema } = require('../validators/materialValidators');
const { paginationQuerySchema, idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeCapability('view_materials'), validate(paginationQuerySchema, 'query'), controller.list);
router.post('/', authorizeCapability('manage_materials'), validate(materialSchema), controller.create);
router.patch('/:id/status', authorizeCapability('manage_materials'), validate(idParamSchema, 'params'), validate(materialStatusSchema), controller.update);
router.put('/:id', authorizeCapability('manage_materials'), validate(idParamSchema, 'params'), validate(materialUpdateSchema), controller.update);
router.delete('/:id', authorizeCapability('manage_materials'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
