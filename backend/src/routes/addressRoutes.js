const express = require('express');
const controller = require('../controllers/addressController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { cepParamSchema } = require('../validators/addressValidators');

const router = express.Router();

router.use(authenticate);
router.get('/cep/:cep', authorizeCapability('view_clients'), validate(cepParamSchema, 'params'), controller.lookupCep);

module.exports = router;
