const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

if (process.argv.length < 3) {
  console.error("Upotreba: node listFunctionsScreen1.js putanja/do/Screen1.js");
  process.exit(1);
}

const filePath = process.argv[2];

const code = fs.readFileSync(filePath, 'utf-8');

let ast;
try {
  ast = babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
  });
} catch (err) {
  console.error("Greška pri parsiranju fajla:", err.message);
  process.exit(1);
}

traverse(ast, {
  FunctionDeclaration(path) {
    console.log(`FunctionDeclaration: ${path.node.id.name} (linije ${path.node.loc.start.line}-${path.node.loc.end.line})`);
  },
  FunctionExpression(path) {
    const parent = path.parent;
    let name = "(anonimna)";
    if (parent.type === "VariableDeclarator" && parent.id.type === "Identifier") {
      name = parent.id.name;
    }
    console.log(`FunctionExpression: ${name} (linije ${path.node.loc.start.line}-${path.node.loc.end.line})`);
  },
  ArrowFunctionExpression(path) {
    const parent = path.parent;
    let name = "(anonimna)";
    if (parent.type === "VariableDeclarator" && parent.id.type === "Identifier") {
      name = parent.id.name;
    }
    console.log(`ArrowFunctionExpression: ${name} (linije ${path.node.loc.start.line}-${path.node.loc.end.line})`);
  }
});
