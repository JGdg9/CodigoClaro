'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { build } = require('esbuild');

const root = path.resolve(__dirname, '..');
const common = {
  bundle:true,
  minify:true,
  legalComments:'inline',
  platform:'browser',
  target:['chrome120'],
  define:{'process.env.NODE_ENV':'"production"'}
};

const LICENSES = [
  ['React 19.3.1 — MIT','node_modules/react/LICENSE'],
  ['React DOM 19.3.1 — MIT','node_modules/react-dom/LICENSE'],
  ['Scheduler — MIT','node_modules/scheduler/LICENSE'],
  ['Babel Standalone 7.29.11 — MIT','node_modules/@babel/standalone/LICENSE'],
  ['DOMPurify 3.4.17 — Apache-2.0','node_modules/dompurify/LICENSE'],
  ['DOMPurify 3.4.17 — MPL-2.0','node_modules/dompurify/LICENSE-MPL'],
  ['esbuild 0.28.2 — MIT','node_modules/esbuild/LICENSE.md']
];

async function main() {
  await Promise.all([
    build({
      ...common,
      entryPoints:[path.join(__dirname,'react-preview-worker-entry.js')],
      outfile:path.join(root,'public','react-preview-worker.js'),
      format:'iife'
    }),
    build({
      ...common,
      entryPoints:[path.join(__dirname,'react-preview-client-entry.js')],
      outfile:path.join(root,'public','react-preview-client.js'),
      format:'iife'
    })
  ]);
  const licenseDocument = ['# Avisos de licencias de terceros','',
    'Los siguientes textos corresponden a dependencias empaquetadas para la vista previa React local.',''
  ];
  for (const [title,relativePath] of LICENSES) {
    const licensePath = path.join(root,relativePath);
    if (!fs.existsSync(licensePath)) throw new Error('Falta el texto de licencia: ' + relativePath);
    licenseDocument.push('## ' + title,'','```text',fs.readFileSync(licensePath,'utf8').trim(),'```','');
  }
  fs.writeFileSync(path.join(root,'public','THIRD_PARTY_LICENSES.md'),licenseDocument.join('\n'),'utf8');
  process.stdout.write('Assets locales React generados en public/.\n');
}

main().catch(error => {
  process.stderr.write(String(error && error.stack || error) + '\n');
  process.exitCode = 1;
});
