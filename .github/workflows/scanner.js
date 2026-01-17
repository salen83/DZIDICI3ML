const fs = require('fs');

const buildYml = `
name: Android CI Build

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 22

      - name: Install npm dependencies
        run: npm ci

      - name: Build web assets
        run: npm run build

      - name: Sync Capacitor Android
        run: npx cap sync android

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Build Android APK
        run: |
          cd android
          ./gradlew assembleDebug
`;

fs.writeFileSync('.github/workflows/build-android.yml', buildYml);
const fs = require('fs');
const path = require('path');

// Pretpostavimo da scanner.js generiše build content u promenljivoj `ymlContent`
const ymlContent = `
name: Android Build
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: 22
      - name: Install dependencies
        run: npm install
      - name: Build Android
        run: npx cap sync android && cd android && ./gradlew assembleDebug
`;

console.log('================ GENERATED build-android.yml ================');
console.log(ymlContent.trim());
console.log('=============================================================');
