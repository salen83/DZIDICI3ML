const fs = require("fs");
const path = require("path");

const SRC = "./src";
const OUT = "./deps.dot";

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      walk(full, files);
    } else if (f.endsWith(".js") || f.endsWith(".jsx")) {
      files.push(full);
    }
  }
  return files;
}

function extractImports(file) {
  const content = fs.readFileSync(file, "utf8");
  const imports = [];

  const lines = content.split("\n");
  for (const line of lines) {
    const m = line.match(/import .* from ['"](.*)['"]/);
    if (m) imports.push(m[1]);
  }

  return imports;
}

const files = walk(SRC);

let dot = `digraph deps {\n  rankdir=LR;\n  node [shape=box, style=rounded];\n`;

for (const file of files) {
  const rel = file.replace("./", "");
  const imports = extractImports(file);

  for (const imp of imports) {
    // samo lokalni importi
    if (imp.startsWith(".")) {
      const target = path.normalize(path.join(path.dirname(rel), imp)) + ".js";
      dot += `  "${rel}" -> "${target}";\n`;
    }
  }
}

dot += "}\n";

fs.writeFileSync(OUT, dot);
console.log("✅ deps.dot generisan");
