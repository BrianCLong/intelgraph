function diffSchemas(oldSchema = {}, newSchema = {}, path = '') {
  const diffs = [];
  const keys = new Set([...Object.keys(oldSchema), ...Object.keys(newSchema)]);
  for (const key of keys) {
    const newPath = path ? `${path}.${key}` : key;
    if (!(key in oldSchema)) {
      diffs.push({ type: 'add', path: newPath, value: newSchema[key] });
    } else if (!(key in newSchema)) {
      diffs.push({ type: 'remove', path: newPath });
    } else if (
      typeof oldSchema[key] === 'object' &&
      oldSchema[key] !== null &&
      typeof newSchema[key] === 'object' &&
      newSchema[key] !== null
    ) {
      diffs.push(...diffSchemas(oldSchema[key], newSchema[key], newPath));
    } else if (oldSchema[key] !== newSchema[key]) {
      diffs.push({
        type: 'change',
        path: newPath,
        from: oldSchema[key],
        to: newSchema[key]
      });
    }
  }
  return diffs;
}

function planMigration(oldSchema, newSchema) {
  const diff = diffSchemas(oldSchema, newSchema);
  return diff.map(d => ({
    action: d.type,
    target: d.path,
    risk: d.type === 'remove' ? 'high' : 'low'
  }));
}

module.exports = { diffSchemas, planMigration };
