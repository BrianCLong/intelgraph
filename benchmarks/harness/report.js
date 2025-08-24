const fs = require('fs');
const path = require('path');

const resultPath = path.join(__dirname, 'bench-result.json');
if (fs.existsSync(resultPath)) {
  const data = fs.readFileSync(resultPath, 'utf8');
  const md = `# Benchmark Report\n\n\`\`\`json\n${data}\n\`\`\`\n`;
  fs.writeFileSync(path.join(__dirname, 'report.md'), md);
  console.log('report.md written');
} else {
  console.error('No benchmark result found');
}
