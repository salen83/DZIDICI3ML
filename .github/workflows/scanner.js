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
console.log('✅ Generated build-android.yml');
