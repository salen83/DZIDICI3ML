const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SRC_DIR = path.join(__dirname, 'src');

function scanFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (e) {
    console.warn(`⚠️ Greška parsiranja ${filePath}:`, e.message);
    return null;
  }

  const imports = [];
  const contextsUsed = [];
  const functions = [];
  const componentsUsed = [];

  traverse(ast, {
    ImportDeclaration({ node }) {
      imports.push(node.source.value);
    },
    CallExpression({ node }) {
      if(node.callee.name && node.callee.name.startsWith('use')) {
        contextsUsed.push(node.callee.name);
      }
    },
    FunctionDeclaration({ node }) {
      if(node.id) functions.push(node.id.name);
    },
    VariableDeclaration({ node }) {
      node.declarations.forEach(decl => {
        if(decl.init && (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression')) {
          if(decl.id && decl.id.name) functions.push(decl.id.name);
        }
      });
    },
    JSXElement({ node }) {
      if(node.openingElement && node.openingElement.name) {
        let name = node.openingElement.name.name || '';
        if(name) componentsUsed.push(name);
      }
    }
  });

  return {
    imports,
    contextsUsed: [...new Set(contextsUsed)],
    functions: [...new Set(functions)],
    componentsUsed: [...new Set(componentsUsed)]
  };
}

function scanDir(dir) {
  const result = {};
  const files = fs.readdirSync(dir);
  for(const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if(stat.isDirectory()) {
      Object.assign(result, scanDir(fullPath));
    } else if(file.endsWith('.js') || file.endsWith('.jsx')) {
      const data = scanFile(fullPath);
      if(data) result[fullPath.replace(__dirname + '/', '')] = data;
    }
  }
  return result;
}

// --- Scan src folder ---
const report = scanDir(SRC_DIR);

// --- Ispis u log ---
console.log("=== KOMPLETAN IZVEŠTAJ APLIKACIJE ===");
console.log(JSON.stringify(report, null, 2));
