import fs from 'node:fs';
import path from 'node:path';
import { buildCandidateExport, createCandidate, SAMPLE_EXTRACTION } from '../src/domain';

const root = process.cwd();
const scanRoots = ['src', 'server', 'public', 'tests', 'dist'];
const standaloneFiles = ['package.json', 'vite.config.ts', 'playwright.config.ts', '.env.example'];
const forbiddenNames = ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc'];
const forbiddenPatterns = [
  ['briefcase', '-onboarding-internal'].join(''),
  ['upper', 'cut'].join(''),
  ['workers', '.dev'].join(''),
  ['cloud', 'flare'].join(''),
  ['account', '_id'].join(''),
  ['zone', '_id'].join(''),
  ['candidate', '-devin'].join(''),
  ['San Antonio', ', TX'].join(''),
];
const googleKeyPattern = /AIza[0-9A-Za-z_-]{20,}/;

function filesUnder(target: string): string[] {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.git', 'artifacts'].includes(entry.name)) return [];
    return filesUnder(path.join(target, entry.name));
  });
}

const failures: string[] = [];
for (const forbidden of forbiddenNames) {
  if (fs.existsSync(path.join(root, forbidden))) failures.push(`Forbidden infrastructure file exists: ${forbidden}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
for (const dependency of Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })) {
  if (/cloudflare|wrangler/i.test(dependency)) failures.push(`Forbidden infrastructure dependency: ${dependency}`);
}

const files = [...scanRoots.flatMap((directory) => filesUnder(path.join(root, directory))), ...standaloneFiles.map((file) => path.join(root, file)).filter(fs.existsSync)];
for (const file of files) {
  if (!fs.statSync(file).isFile()) continue;
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');
  for (const forbidden of forbiddenPatterns) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) failures.push(`${path.relative(root, file)} contains forbidden public string: ${forbidden}`);
  }
  if (googleKeyPattern.test(text)) failures.push(`${path.relative(root, file)} contains a Google API-key-shaped value`);
}

const candidate = createCandidate();
candidate.identity = { ...SAMPLE_EXTRACTION.identity, name: SAMPLE_EXTRACTION.identity?.name || '', email: SAMPLE_EXTRACTION.identity?.email || '', phone: SAMPLE_EXTRACTION.identity?.phone || '' };
candidate.logistics.currentLocation = SAMPLE_EXTRACTION.currentLocation || '';
candidate.resume.parsed = SAMPLE_EXTRACTION.parsed;
candidate.resume.sourceText = 'raw source must not export';
candidate.resume.artifacts = [{ id: 'fictional-artifact', fileName: 'fictional-resume.pdf', mimeType: 'application/pdf', sizeBytes: 1234, addedAt: candidate.createdAt }];
const exported = JSON.stringify(buildCandidateExport(candidate));
for (const forbidden of ['sourceText', 'dataBase64', 'plainText', 'GEMINI_API_KEY', 'apiKey', 'credentials']) {
  if (exported.includes(forbidden)) failures.push(`Candidate export contains forbidden field: ${forbidden}`);
}

if (failures.length) {
  console.error(`Public release audit failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Public release audit passed across ${files.length} files.`);
