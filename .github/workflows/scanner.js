const fs = require('fs');
const path = require('path');

// Funkcija za rekurzivno listanje fajlova
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Glavni folder repozitorija
const repoRoot = process.cwd();
const allFiles = walkDir(repoRoot);

// Da li postoji webDir build
const hasWebDir = fs.existsSync(path.join(repoRoot, 'build', 'index.html'));

// Filtriraj screen fajlove (svi .js fajlovi u src/screens)
const screenFiles = allFiles.filter(f => f.includes('src/screens') && f.endsWith('.js'));

// Broj fajlova u repozitoriju
const totalFiles = allFiles.length;

// Kreiranje YAML fajla
let yaml = `name: Android Build
on:
  push:
    branches:
      - main
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 22
      - name: Install dependencies
        run: npm install
`;

if (hasWebDir) {
  yaml += `      - name: Build Web Assets
        run: npm run build
        working-directory: .
`;
} else {
  yaml += `      - name: Web Assets missing
        run: echo "⚠️ build/index.html missing"
`;
}

yaml += `      - name: Capacitor Sync
        run: npx cap sync android
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: temurin
          java-version: 17
      - name: Build Android APK
        working-directory: android
        run: ./gradlew assembleDebug
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
      - name: All Screens Detected
        run: |
          echo "Screens found:"
`;

screenFiles.forEach(f => {
  yaml += `          echo "${f.replace(repoRoot+'/', '')}"\n`;
});

yaml += `      - name: All Files Detected
        run: |
          echo "Total files scanned: ${totalFiles}"
      - name: Build Info
        run: echo "Gradle: 8.14.3, Kotlin: 1.9.10, Java: 17, WebDir: build"
`;

console.log(yaml);
