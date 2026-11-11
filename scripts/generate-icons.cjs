const fs = require('fs');
const path = require('path');

const b64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buf = Buffer.from(b64, 'base64');
const iconsDir = path.resolve('icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
});

console.log('Icons written successfully.');
