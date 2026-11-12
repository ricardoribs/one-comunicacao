const express = require('express');
const controller = require('../controllers/integrationController');
const { authenticate, authorize, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { integrationQuerySchema, integrationSchema, integrationUpdateSchema } = require('../validators/integrationValidators');
const { idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeCapability('view_metrics'), validate(integrationQuerySchema, 'query'), controller.list);
router.post('/', authorize('admin', 'gestor'), validate(integrationSchema), controller.create);
router.put('/:id', authorize('admin', 'gestor'), validate(idParamSchema, 'params'), validate(integrationUpdateSchema), controller.update);
router.delete('/:id', authorize('admin', 'gestor'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
