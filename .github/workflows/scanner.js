// .github/workflows/scanner.js
const fs = require('fs');
const path = require('path');

// CONFIG
const nodeVersion = '22';
const javaVersion = '17';
const kotlinVersion = '1.9.10';
const gradleVersion = '8.14.3';
const webDir = 'build';
const outputYml = 'tmp-build-android.yml';

// Funkcija koja rekurzivno skuplja sve fajlove u direktorijumu
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(function(file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

// Detekcija Screens
function getScreenFiles(allFiles) {
    return allFiles.filter(f => f.toLowerCase().includes('screen') && f.endsWith('.js'));
}

// Provera webDir
const hasWebDir = fs.existsSync(path.join('.', webDir, 'index.html'));

// Uzimanje svih fajlova u repo
const allFiles = getAllFiles('.');

// Screens fajlovi
const screens = getScreenFiles(allFiles);

// Generisanje YAML sadržaja
const yamlContent = `
name: Android Build
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
          'node-version': ${nodeVersion}
      - name: Install dependencies
        run: npm install
      - ${hasWebDir 
          ? "{ name: 'Build Web Assets', run: 'npm run build', 'working-directory': '.' }" 
          : "{ name: 'Web Assets missing', run: 'echo \"⚠️ build/index.html missing\"\" }"}
      - name: Capacitor Sync
        run: npx cap sync android
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: temurin
          'java-version': ${javaVersion}
      - name: Build Android APK
        'working-directory': android
        run: ./gradlew assembleDebug
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
      - name: All Screens Detected
        run: |
          echo "Screens found:"
          ${screens.map(f => `echo "${f}"`).join('\n          ')}
      - name: All Files Detected
        run: |
          echo "Total files scanned: ${allFiles.length}"
      - name: Build Info
        run: echo "Gradle: ${gradleVersion}, Kotlin: ${kotlinVersion}, Java: ${javaVersion}, WebDir: ${webDir}"
`;

// Ispis u konzolu
console.log('================ GENERATED build-android.yml ================');
console.log(yamlContent);
console.log('=============================================================');

// Opcionalno: možeš i sačuvati fajl
// fs.writeFileSync(outputYml, yamlContent, 'utf8');
