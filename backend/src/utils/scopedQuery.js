function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function createScopedQuery(user) {
  return {
    user,
    build(config = {}, options = {}) {
      const prefix = options.prefix || 'WHERE';
      const startIndex = options.startIndex || 1;

      if (!user || user.role === 'admin') {
        return {
          clause: '',
          values: [],
          nextIndex: startIndex,
        };
      }

      const tenantValue = user.role === 'client' ? user.client_id : user.id;
      const fragments = toArray(user.role === 'client' ? config.client : config.internal).filter(Boolean);

      if (!fragments.length || tenantValue == null) {
        return {
          clause: ` ${prefix} 1 = 0`,
          values: [],
          nextIndex: startIndex,
        };
      }

      const placeholder = `$${startIndex}`;
      const scopedFragments = fragments.map((fragment) => `(${fragment.replaceAll('$TENANT', placeholder)})`);

      return {
        clause: ` ${prefix} ${scopedFragments.join(' OR ')}`,
        values: [tenantValue],
        nextIndex: startIndex + 1,
      };
    },
  };
}

module.exports = createScopedQuery;
