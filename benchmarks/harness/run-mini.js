const fs = require('fs');
const path = require('path');
const { runBenchmark } = require('./index');

const result = runBenchmark(100);
const outPath = path.join(__dirname, 'bench-result.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
