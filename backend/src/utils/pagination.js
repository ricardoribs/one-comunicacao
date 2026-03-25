function normalizePagination(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

function paginationClause(limit, offset, startIndex = 1) {
  return {
    clause: ` LIMIT $${startIndex} OFFSET $${startIndex + 1}`,
    values: [limit, offset],
  };
}

module.exports = {
  normalizePagination,
  paginationClause,
};
