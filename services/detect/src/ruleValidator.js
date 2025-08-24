const fs = require('fs');
const path = require('path');

function parseSimpleYAML(str) {
  const obj = {};
  for (const line of str.split('\n')) {
    if (!line.trim()) continue;
    const [key, value] = line.split(':').map((s) => s.trim());
    if (!key) continue;
    if (!value) {
      obj[key] = null;
    } else if (value === '{}' || value === '[]') {
      obj[key] = JSON.parse(value);
    } else if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      obj[key] = JSON.parse(value);
    } else if (value === 'true' || value === 'false') {
      obj[key] = value === 'true';
    } else if (!Number.isNaN(Number(value))) {
      obj[key] = Number(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

const schemaPath = path.join(__dirname, 'rule-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

function validateRuleData(data) {
  const errors = [];
  for (const field of schema.required || []) {
    if (data[field] === undefined) errors.push(`/${field} is required`);
  }
  if (typeof data.name !== 'string') errors.push('/name should be string');
  if (typeof data.when !== 'object' || data.when === null) errors.push('/when should be object');
  if (typeof data.then !== 'object' || data.then === null) errors.push('/then should be object');
  return { valid: errors.length === 0, errors };
}

function validateRuleFile(filePath) {
  try {
    const file = fs.readFileSync(filePath, 'utf8');
    const data = parseSimpleYAML(file);
    return validateRuleData(data);
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

module.exports = { validateRuleData, validateRuleFile };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node ruleValidator.js <rule-file.yml>');
    process.exit(1);
  }
  const result = validateRuleFile(file);
  if (result.valid) {
    console.log('Rule is valid');
  } else {
    console.error('Rule is invalid:\n' + result.errors.join('\n'));
    process.exit(1);
  }
}
