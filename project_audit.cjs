const fs = require("fs");
const path = require("path");

const ignore = ["node_modules", ".git", "build", "dist"];

const firestoreFiles = [];
const dbFiles = [];
const conflicts = [];

function scan(dir, result = []) {
  fs.readdirSync(dir).forEach(file => {
    if (ignore.includes(file)) return;

    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      scan(full, result);
    } else {
      result.push(full);
    }
  });

  return result;
}

function analyze(file) {
  const content = fs.readFileSync(file, "utf8");

  const uses = {
    getDocs: content.includes("getDocs"),
    setDoc: content.includes("setDoc"),
    writeBatch: content.includes("writeBatch"),
    useEffect: content.includes("useEffect"),
    usesSofaFirestore: content.includes("sofaFirestore"),
    usesDB: content.includes("db") || content.includes("firebase"),
  };

  // FIRESTORE FILE
  if (uses.getDocs || uses.setDoc || uses.writeBatch) {
    firestoreFiles.push(file);
  }

  // DB FILE
  if (file.includes("db") || file.includes("Firestore")) {
    dbFiles.push(file);
  }

  // ❌ CONFLICT 1: dva sistema
  if (
    (uses.getDocs || uses.setDoc) &&
    uses.usesSofaFirestore
  ) {
    conflicts.push({
      file,
      type: "DOUBLE_FIRESTORE_SYSTEM",
    });
  }

  // ❌ CONFLICT 2: loop rizik
  if (
    uses.useEffect &&
    (uses.setDoc || uses.writeBatch)
  ) {
    conflicts.push({
      file,
      type: "EFFECT_WRITE_LOOP",
    });
  }

  return { file, uses };
}

// RUN
const files = scan(".");
files.forEach(analyze);

// OUTPUT
console.log("\n🔥 FIRESTORE FILES:\n");
firestoreFiles.forEach(f => console.log(f));

console.log("\n🗄️ DB FILES:\n");
dbFiles.forEach(f => console.log(f));

console.log("\n❌ CONFLICTS DETECTED:\n");

if (!conflicts.length) {
  console.log("No direct conflicts found (but architecture may still be bad)");
} else {
  conflicts.forEach(c => {
    console.log(`\n❌ ${c.type}`);
    console.log(`   FILE: ${c.file}`);
  });
}

// GLOBAL WARNING
if (dbFiles.length > 2) {
  console.log("\n⚠️ GLOBAL WARNING:");
  console.log(`You have ${dbFiles.length} DB-related files → possible architecture conflict`);
}
