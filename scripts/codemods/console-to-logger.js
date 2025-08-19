/**
 * Codemod: console-to-logger
 *
 * Replaces console.log/warn/error/debug with logger.info/warn/error/debug.
 * Skips files already importing logger.
 * Adds import { logger } from "@/utils/logger" when tsconfig path mapping for "@/*" exists,
 * otherwise uses relative import to src/utils/logger.
 * Idempotent.
 */

const fs = require('fs');
const path = require('path');

function getImportPath(filePath) {
  let dir = path.dirname(filePath);
  let rootDir = dir;
  while (dir && dir !== path.dirname(dir)) {
    const tsconfigPath = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      rootDir = dir;
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        const paths = tsconfig.compilerOptions && tsconfig.compilerOptions.paths;
        if (paths && paths['@/*']) {
          return '@/utils/logger';
        }
      } catch (e) {
        // ignore
      }
      break;
    }
    dir = path.dirname(dir);
  }
  const rel = path.relative(path.dirname(filePath), path.join(rootDir, 'src', 'utils', 'logger')).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : './' + rel;
}

module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;
  const filePath = fileInfo.path;

  if (/src\/utils\/logger\.(ts|js)$/.test(filePath)) {
    return fileInfo.source;
  }

  const root = j(fileInfo.source);
  const hasLoggerImport = root
    .find(j.ImportDeclaration, (node) => /utils\/logger$/.test(node.source.value))
    .size() > 0;

  let replaced = false;
  root
    .find(j.MemberExpression, { object: { name: 'console' } })
    .filter((p) => ['log', 'warn', 'error', 'debug'].includes(p.value.property.name))
    .forEach((p) => {
      replaced = true;
      const method = p.value.property.name;
      p.value.object.name = 'logger';
      p.value.property.name = method === 'log' ? 'info' : method;
    });

  if (replaced && !hasLoggerImport) {
    const importPath = getImportPath(filePath);
    const importDecl = j.importDeclaration(
      [j.importSpecifier(j.identifier('logger'))],
      j.literal(importPath)
    );
    root.get().node.program.body.unshift(importDecl);
  }

  return replaced ? root.toSource({ quote: 'single' }) : null;
};
