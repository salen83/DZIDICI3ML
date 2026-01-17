#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// =====================
// Helper functions
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function detectNodeVersion() {
  const pkg = readJSON('package.json');
  if (pkg?.engines?.node) return pkg.engines.node.replace('>=', '').trim();
  return '22'; // default Node 22
}

function detectCapacitorWebDir() {
  const config = readJSON('capacitor.config.json');
  if (config?.webDir) return config.webDir;
  return 'build'; // default
}

function detectGradleVersion() {
  const gradleProps = path.join('android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
  if (fs.existsSync(gradleProps)) {
    const content = fs.readFileSync(gradleProps, 'utf-8');
    const match = content.match(/distributionUrl=.*gradle-(.*)-all\.zip/);
    if (match) return match[1];
  }
  return '8.14.3';
}

function detectKotlinVersion() {
  const buildGradle = path.join('android', 'build.gradle');
  if (fs.existsSync(buildGradle)) {
    const content = fs.readFileSync(buildGradle, 'utf-8');
    const match = content.match(/ext.kotlin_version\s*=\s*["'](.+)["']/);
    if (match) return match[1];
  }
  return '1.9.0';
}

// =====================
// Detect project settings
const nodeVersion = detectNodeVersion();
const webDir = detectCapacitorWebDir();
const gradleVersion = detectGradleVersion();
const kotlinVersion = detectKotlinVersion();

// =====================
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

      - name: Build Web Assets
        run: npm run build
        working-directory: .

      - name: Capacitor Sync
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
`;

// =====================
// Print YAML to GitHub Actions log
console.log('================ GENERATED build-android.yml ================');
console.log(yaml.trim());
console.log('=============================================================');
