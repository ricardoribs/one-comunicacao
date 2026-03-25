const express = require('express');
const controller = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { userSchema, userUpdateSchema } = require('../validators/userValidators');
const { paginationQuerySchema, idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate, authorize('admin'));
router.get('/', validate(paginationQuerySchema, 'query'), controller.list);
router.post('/', validate(userSchema), controller.create);
router.patch('/:id', validate(idParamSchema, 'params'), validate(userUpdateSchema), controller.update);
router.put('/:id', validate(idParamSchema, 'params'), validate(userUpdateSchema), controller.update);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
