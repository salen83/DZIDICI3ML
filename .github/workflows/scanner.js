const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// Rekurzivni scan svih fajlova u direktorijumu
function scanAll(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(scanAll(fullPath));
        } else {
            results.push(path.relative('.', fullPath));
        }
    });
    return results;
}

// Skeniraj ceo repo
const allFiles = scanAll('.');
const screens = allFiles.filter(f => f.startsWith('src/screens/'));
const hasWebDir = fs.existsSync(path.join('build', 'index.html'));
const packageJson = fs.existsSync('package.json') ? JSON.parse(fs.readFileSync('package.json', 'utf8')) : {};
const nodeVersion = packageJson?.engines?.node || '22';
const javaVersion = 17;
const kotlinVersion = '1.9.10';
const gradleVersion = '8.14.3';

// Generiši YAML workflow
const buildYml = {
    name: 'Android Build',
    on: {
        push: { branches: ['main'] },
        workflow_dispatch: {}
    },
    jobs: {
        build: {
            'runs-on': 'ubuntu-latest',
            steps: [
                { name: 'Checkout repository', uses: 'actions/checkout@v3' },
                { name: 'Setup Node.js', uses: 'actions/setup-node@v3', with: { 'node-version': nodeVersion } },
                { name: 'Install dependencies', run: 'npm install' },
                hasWebDir ? { name: 'Build Web Assets', run: 'npm run build', working-directory: '.' } : { name: 'Web Assets missing', run: 'echo "⚠️ build/index.html missing"' },
                { name: 'Capacitor Sync', run: 'npx cap sync android' },
                { name: 'Setup Java', uses: 'actions/setup-java@v3', with: { distribution: 'temurin', 'java-version': javaVersion } },
                { name: 'Build Android APK', working-directory: 'android', run: './gradlew assembleDebug' },
                { name: 'Upload APK', uses: 'actions/upload-artifact@v4', with: { name: 'app-debug-apk', path: 'android/app/build/outputs/apk/debug/app-debug.apk' } },
                { name: 'All Screens Detected', run: `echo "${screens.join('\n')}"` },
                { name: 'All Files Detected', run: `echo "${allFiles.join('\n')}"` },
                { name: 'Build Info', run: `echo "Gradle: ${gradleVersion}, Kotlin: ${kotlinVersion}, Java: ${javaVersion}, WebDir: build"` }
            ]
        }
    }
};

// Ispiši ceo build YAML
console.log(yaml.stringify(buildYml));
