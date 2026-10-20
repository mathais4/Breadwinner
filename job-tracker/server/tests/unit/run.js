// Cross-platform entry point: imports every *.test.js in this folder so `node tests/unit/run.js`
// works on any Node version and on Windows (no shell globbing, no runner-version differences).
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
for (const file of readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort()) {
  await import(pathToFileURL(path.join(dir, file)).href);
}
