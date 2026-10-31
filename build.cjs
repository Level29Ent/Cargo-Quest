const fs = require('node:fs');
const esbuild = require('esbuild');
fs.mkdirSync('public', { recursive: true });
for (const file of ['index.html', 'head.png']) fs.copyFileSync(file, 'public/' + file);
fs.cpSync('vo', 'public/vo', { recursive: true });
esbuild.buildSync({ entryPoints: ['renderer3d.js'], bundle: true, minify: true, outfile: 'public/renderer3d.js', target: ['safari16', 'chrome110'], legalComments: 'eof' });
