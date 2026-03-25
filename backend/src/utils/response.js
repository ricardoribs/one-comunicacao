const { normalizePagination } = require('./pagination');

function sendPaginated(res, req, items) {
  const { limit, offset } = normalizePagination(req.query);
  res.setHeader('X-Pagination-Limit', String(limit));
  res.setHeader('X-Pagination-Offset', String(offset));
  return res.json(items);
}

module.exports = {
  sendPaginated,
};
