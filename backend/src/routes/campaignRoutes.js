const express = require('express');
const controller = require('../controllers/campaignController');
const { authenticate, authorize, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { campaignSchema, campaignUpdateSchema } = require('../validators/campaignValidators');
const { paginationQuerySchema, idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeCapability('view_campaigns'), validate(paginationQuerySchema, 'query'), controller.list);
router.post('/', authorize('admin', 'gestor', 'comercial'), validate(campaignSchema), controller.create);
router.put('/:id', authorize('admin', 'gestor', 'comercial'), validate(idParamSchema, 'params'), validate(campaignUpdateSchema), controller.update);
router.delete('/:id', authorize('admin'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
