const express = require('express');
const controller = require('../controllers/clientController');
const { authenticate, authorize, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { clientSchema, clientUpdateSchema } = require('../validators/clientValidators');
const { paginationQuerySchema, idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeCapability('view_clients'), validate(paginationQuerySchema, 'query'), controller.list);
router.post('/', authorizeCapability('manage_clients'), validate(clientSchema), controller.create);
router.put('/:id', authorizeCapability('manage_clients'), validate(idParamSchema, 'params'), validate(clientUpdateSchema), controller.update);
router.delete('/:id', authorize('admin'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
