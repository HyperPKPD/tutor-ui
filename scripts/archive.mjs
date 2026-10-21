// Creates ../<folder>-v<version>.tar.gz (one level above this project) from the current sources.
// Usage: npm run archive
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(resolve(root, 'version.json'), 'utf8'));
const folder = basename(root);
const out = resolve(root, '..', `${folder}-v${version}.tar.gz`);

const r = spawnSync(
  'tar',
  ['-czf', out, '--exclude=node_modules', '--exclude=dist', '--exclude=*.tar.gz', '-C', resolve(root, '..'), folder],
  { stdio: 'inherit' }
);
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`Created ${out}`);
