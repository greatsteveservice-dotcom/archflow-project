// Prebuild script: stamp SW_VERSION with build timestamp
const fs = require('fs');
const path = require('path');
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
const content = fs.readFileSync(swPath, 'utf-8');
const buildId = String(Date.now());
const stamped = content.replace(
  /const SW_VERSION = '[^']*'/,
  `const SW_VERSION = '${buildId}'`
);
fs.writeFileSync(swPath, stamped, 'utf-8');
console.log(`[stamp-sw] SW_VERSION = ${buildId}`);
