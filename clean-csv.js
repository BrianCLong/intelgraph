#!/usr/bin/env node
// Cleans a CSV file and streams the result to stdout (no dependencies).
const fs = require('fs');

function handleError(err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node clean-csv.js <path-to-csv>');
  process.exit(1);
}

function parseLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

let content;
try {
  content = fs.readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
} catch (err) {
  handleError(err);
}

if (content.length === 0) process.exit(0);

const headers = parseLine(content[0]);
const rows = [];
const nonEmptyColumns = new Set();

for (let i = 1; i < content.length; i++) {
  const line = content[i];
  if (line.trim() === '') continue;
  const cells = parseLine(line).map((c) => c.trim());
  let hasValue = false;
  const row = {};
  headers.forEach((h, idx) => {
    const value = cells[idx] || '';
    if (value !== '') {
      nonEmptyColumns.add(h);
      hasValue = true;
    }
    row[h] = value;
  });
  if (hasValue) rows.push(row);
}

const columns = headers.filter((h) => nonEmptyColumns.has(h));

function escapeValue(val) {
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

process.stdout.write(columns.join(',') + '\n');
for (const row of rows) {
  const line = columns.map((col) => escapeValue(row[col] || ''));
  process.stdout.write(line.join(',') + '\n');
}
