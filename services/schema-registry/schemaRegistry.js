const fs = require('fs');
const path = require('path');

class SchemaRegistry {
  constructor(storePath = path.join(__dirname, 'schema-store.json')) {
    this.storePath = storePath;
    if (fs.existsSync(storePath)) {
      this.data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    } else {
      this.data = { versions: [], current: null };
    }
  }

  propose(schema, constraints = []) {
    const version = this.data.versions.length + 1;
    const entry = { version, schema, constraints, status: 'proposed' };
    this.data.versions.push(entry);
    this._save();
    return entry;
    }

  approve(version) {
    const entry = this.data.versions.find(v => v.version === version);
    if (!entry) throw new Error('Version not found');
    entry.status = 'approved';
    this.data.current = version;
    this._save();
    return entry;
  }

  getCurrent() {
    if (this.data.current == null) return null;
    return this.data.versions.find(v => v.version === this.data.current) || null;
  }

  _save() {
    fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2));
  }
}

module.exports = { SchemaRegistry };
