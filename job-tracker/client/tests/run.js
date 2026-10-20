// Cross-platform runner: imports every *.test.js here (see server/tests/unit/run.js).
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
for (const file of readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort()) {
  await import(pathToFileURL(path.join(dir, file)).href);
}
