// Documentation displays the exact source files included in the app's typecheck.
import { readFileSync, writeFileSync } from 'node:fs';
const base = new URL('../src/examples/', import.meta.url);
const samples = ['arc.ts', 'Checkout.tsx', 'send.ts'].map(filename => ({
  key: filename, label: filename, filename,
  language: filename.endsWith('tsx') ? 'tsx' : 'ts',
  code: readFileSync(new URL(filename, base), 'utf8'),
}));
writeFileSync(new URL('samples.ts', base), '// Generated from typechecked examples; run scripts/sync-examples.mjs.\nimport type { CodeSample } from \"@kakushi/ui\";\nexport default ' + JSON.stringify(samples, null, 2) + ' satisfies CodeSample[];\n');
