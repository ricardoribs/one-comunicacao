const asyncHandler = require('../utils/asyncHandler');
const cepLookupService = require('../services/cepLookupService');

exports.lookupCep = asyncHandler(async (req, res) => {
  const address = await cepLookupService.lookupCep(req.params.cep);
  res.json(address);
});
