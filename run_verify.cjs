const { execSync } = require('child_process');
try {
    execSync('node verify_headless.js', { stdio: 'inherit' });
} catch (e) {
    // Ignore error
}
