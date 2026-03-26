const express = require('express');
const controller = require('../controllers/addressController');
const { authenticate, authorizeCapability } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/cep/:cep', authorizeCapability('view_clients'), controller.lookupCep);

module.exports = router;
