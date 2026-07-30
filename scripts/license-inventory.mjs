import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lockPath = path.join(root, 'package-lock.json');
if (!fs.existsSync(lockPath)) throw new Error('package-lock.json is required before generating the license inventory.');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const direct = new Set([...Object.keys(packageJson.dependencies || {}), ...Object.keys(packageJson.devDependencies || {})]);
const rows = [];

for (const [packagePath, metadata] of Object.entries(lock.packages || {})) {
  if (!packagePath.startsWith('node_modules/')) continue;
  const manifestPath = path.join(root, packagePath, 'package.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const name = manifest.name || packagePath.replace(/^.*node_modules\//, '');
  rows.push({
    name,
    version: manifest.version || metadata.version || 'unknown',
    license: manifest.license || metadata.license || 'UNKNOWN',
    direct: direct.has(name),
    repository: typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url || '',
  });
}

const unique = [...new Map(rows.map((row) => [`${row.name}@${row.version}`, row])).values()]
  .sort((a, b) => Number(b.direct) - Number(a.direct) || a.name.localeCompare(b.name));
const unknown = unique.filter((row) => row.license === 'UNKNOWN');
const outputDirectory = path.join(root, 'artifacts', 'release');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'dependency-licenses.json'), JSON.stringify({ generatedAt: new Date().toISOString(), packages: unique }, null, 2));
fs.writeFileSync(path.join(outputDirectory, 'dependency-licenses.md'), [
  '# Dependency license inventory',
  '',
  `Generated from the committed npm lockfile. Packages: ${unique.length}. Unknown licenses: ${unknown.length}.`,
  '',
  '| Package | Version | Scope | License |',
  '| --- | --- | --- | --- |',
  ...unique.map((row) => `| ${row.name.replaceAll('|', '\\|')} | ${row.version} | ${row.direct ? 'direct' : 'transitive'} | ${String(row.license).replaceAll('|', '\\|')} |`),
  '',
].join('\n'));

if (unknown.length) {
  console.error(`Unknown dependency licenses: ${unknown.map((row) => `${row.name}@${row.version}`).join(', ')}`);
  process.exit(1);
}
console.log(`Wrote license inventory for ${unique.length} packages.`);
