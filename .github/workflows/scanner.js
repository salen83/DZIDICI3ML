// .github/workflows/scanner.js
const fs = require('fs');
const path = require('path');

// Helper functions
const fileExists = (p) => fs.existsSync(p);
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const logWarning = (msg) => console.warn(`⚠️ Warning: ${msg}`);

// Scan project root
const projectRoot = path.resolve(__dirname, '../../');
const androidDir = path.join(projectRoot, 'android');
const webDirDefault = 'build';
let webDir = webDirDefault;

// Check package.json
let nodeVersion = '22';
let hasBuildScript = false;
const packageJsonPath = path.join(projectRoot, 'package.json');
if(fileExists(packageJsonPath)){
  const pkg = readJSON(packageJsonPath);
  if(pkg.engines && pkg.engines.node) nodeVersion = pkg.engines.node.replace(/[^\d.]/g,'');
  hasBuildScript = !!(pkg.scripts && (pkg.scripts.build || pkg.scripts['ionic:build']));
} else logWarning('package.json missing!');

// Check Capacitor config
const capacitorConfigPath = path.join(projectRoot, 'capacitor.config.json');
if(fileExists(capacitorConfigPath)){
  const cfg = readJSON(capacitorConfigPath);
  if(cfg.webDir) webDir = cfg.webDir;
  const webIndex = path.join(projectRoot, webDir, 'index.html');
  if(!fileExists(webIndex)) logWarning(`WebDir ${webDir} missing index.html`);
} else logWarning('capacitor.config.json missing!');

// Check Android folder
if(!fileExists(androidDir)) logWarning('Android folder missing!');

// Check Gradle files
let gradleWrapperVersion = '8.14.3';
const gradleWrapperPath = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
if(fileExists(gradleWrapperPath)){
  const content = fs.readFileSync(gradleWrapperPath,'utf8');
  const match = content.match(/gradle-(\d+\.\d+\.\d+)-all\.zip/);
  if(match) gradleWrapperVersion = match[1];
} else logWarning('gradle-wrapper.properties missing!');

// Scan screen JSON / JS files
const screenFiles = [];
function scanScreens(dir){
  if(!fs.existsSync(dir)) return;
  for(const f of fs.readdirSync(dir)){
    const full = path.join(dir,f);
    if(fs.statSync(full).isDirectory()) scanScreens(full);
    else if(/screen.*\.(js|json)$/i.test(f)) screenFiles.push(full);
  }
}
scanScreens(projectRoot);

// Check Android Kotlin/Java settings
let javaVersion = 17;
let kotlinVersion = '1.9.10';
const buildGradlePath = path.join(androidDir,'build.gradle');
if(fileExists(buildGradlePath)){
  const content = fs.readFileSync(buildGradlePath,'utf8');
  const match = content.match(/ext.kotlin_version\s*=\s*["']([\d.]+)["']/);
  if(match) kotlinVersion = match[1];
}

// Generate YAML
const yaml = `
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
          node-version: ${nodeVersion}

      - name: Install dependencies
        run: npm install

      ${hasBuildScript ? `- name: Build Web Assets
        run: npm run build
        working-directory: .
      ` : `# No build script detected, you may need to add one`}

      - name: Capacitor Sync
        run: npx cap sync android

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: temurin
          java-version: ${javaVersion}

      - name: Build Android APK
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk

# Screens detected:
# ${screenFiles.length > 0 ? screenFiles.join('\n# ') : 'None detected'}
# Gradle: ${gradleWrapperVersion}, Kotlin: ${kotlinVersion}, Java: ${javaVersion}, WebDir: ${webDir}
`;

// Output YAML to stdout
console.log('✅ Generated build-android.yml');
console.log(yaml);
