/**
 * Codemod: cjs-to-esm
 *
 * Transforms CommonJS modules to ESM.
 * - `const X = require('x')` -> `import X from 'x'`.
 * - `const {a} = require('x')` -> `import {a} from 'x'`.
 * - `module.exports = ...` -> `export default ...`.
 * - Leaves dynamic require() untouched and adds TODO comment above.
 * Idempotent.
 */

module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let transformed = false;

  root.find(j.VariableDeclaration).forEach((path) => {
    const decl = path.value.declarations && path.value.declarations[0];
    if (!decl || !decl.init || decl.init.type !== 'CallExpression' || decl.init.callee.name !== 'require') {
      return;
    }
    const arg = decl.init.arguments[0];
    if (!arg) return;

    if (arg.type === 'Literal') {
      transformed = true;
      let specifiers = [];
      if (decl.id.type === 'Identifier') {
        specifiers = [j.importDefaultSpecifier(j.identifier(decl.id.name))];
      } else if (decl.id.type === 'ObjectPattern') {
        specifiers = decl.id.properties.map((p) =>
          j.importSpecifier(j.identifier(p.key.name), j.identifier(p.value ? p.value.name : p.key.name))
        );
      }
      const importDecl = j.importDeclaration(specifiers, j.literal(arg.value));
      j(path).replaceWith(importDecl);
    } else {
      const todo = j.commentLine('TODO: dynamic require() needs manual review');
      path.value.comments = path.value.comments || [];
      path.value.comments.unshift(todo);
    }
  });

  root.find(j.AssignmentExpression, {
    left: { object: { name: 'module' }, property: { name: 'exports' } },
  }).forEach((p) => {
    transformed = true;
    j(p.parent).replaceWith(j.exportDefaultDeclaration(p.value.right));
  });

  return transformed ? root.toSource({ quote: 'single' }) : null;
};
