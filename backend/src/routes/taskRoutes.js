const express = require('express');
const controller = require('../controllers/taskController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { taskSchema, taskUpdateSchema } = require('../validators/taskValidators');
const { paginationQuerySchema, idParamSchema } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);
router.get('/', authorizeCapability('view_tasks'), validate(paginationQuerySchema, 'query'), controller.list);
router.post('/', authorizeCapability('manage_tasks'), validate(taskSchema), controller.create);
router.put('/:id', authorizeCapability('manage_tasks'), validate(idParamSchema, 'params'), validate(taskUpdateSchema), controller.update);
router.delete('/:id', authorizeCapability('manage_tasks'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
