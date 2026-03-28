const express = require('express');
const controller = require('../controllers/userController');
const { authenticate, authorize, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { userSchema, userUpdateSchema } = require('../validators/userValidators');
const { paginationQuerySchema, idParamSchema, emptyQuerySchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/team', authorizeCapability('view_dashboard_team'), validate(emptyQuerySchema, 'query'), controller.listInternalTeam);
router.get(
  '/assignable',
  authorizeCapability('view_internal_directory'),
  validate(emptyQuerySchema, 'query'),
  controller.listAssignableInternal
);
router.use(authorize('admin'));
router.get('/access-overview', validate(paginationQuerySchema, 'query'), controller.listAccessOverview);
router.get('/', validate(paginationQuerySchema, 'query'), controller.list);
router.get('/:id/security', validate(idParamSchema, 'params'), controller.getSecurityInfo);
router.post('/', validate(userSchema), controller.create);
router.patch('/:id', validate(idParamSchema, 'params'), validate(userUpdateSchema), controller.update);
router.put('/:id', validate(idParamSchema, 'params'), validate(userUpdateSchema), controller.update);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
