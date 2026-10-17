#!/usr/bin/env node
// 파일명: tools/simple-rpg-propose-verified-downloads.mjs
// Keep the current CC0 download, verification, and 14-day artifact flows.
// Persist new verified originals on a candidate branch and request a reviewable
// GitHub PR; never push directly to the protected main branch.
// Token permissions may disable PR creation: in that case the branch and
// workflow artifact are retained, with a clear warning rather than fake success.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const choices = Object.freeze({
  external: 'assets/external/simple-rpg',
  wildlife: 'assets/external/simple-rpg/wildlife',
  icons: 'assets/external/simple-rpg/icons-vfx-npc',
  priority: 'assets/external/simple-rpg/priority-v1',
});
const kind = process.argv[2];
const sourceDir = choices[kind];
if (!sourceDir) throw new Error('UNKNOWN_SIMPLE_RPG_DOWNLOAD_CATEGORY');
const evidenceFile = path.join(sourceDir, 'manifest.json');
if (!fs.existsSync(evidenceFile)) throw new Error('DOWNLOADED_SOURCE_MANIFEST_MISSING');
const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
if (evidence.gameId !== 'simple-rpg' || evidence.sourceOnly !== true
    || evidence.gameApplied === true || evidence.robloxImported === true) {
  throw new Error('DOWNLOADED_SOURCE_LICENSE_OR_GAME_MISMATCH');
}
// [외부 원본 검증] 카테고리별 기존 manifest는 상위 license 또는
// packs[].licenseDeclared/license를 사용한다. 실제 원본 바이트까지 검증한 뒤 보관한다.
if (!Array.isArray(evidence.packs) || evidence.packs.length === 0) {
  throw new Error('DOWNLOADED_SOURCE_PACKS_MISSING');
}
const acceptedLicenses = new Set(['CC0', 'CC0-1.0']);
const checkedNames = new Set();
for (const row of evidence.packs) {
  const name = row.file || row.filename;
  if (typeof name !== 'string' || !name || name === '.' || name === '..'
      || path.basename(name) !== name || name.includes('\\')) {
    throw new Error('DOWNLOADED_SOURCE_UNSAFE_FILE_NAME');
  }
  if (checkedNames.has(name)) throw new Error('DOWNLOADED_SOURCE_DUPLICATE_FILE:' + name);
  checkedNames.add(name);
  const license = row.licenseDeclared || row.license || evidence.license;
  if (!acceptedLicenses.has(license)) throw new Error('DOWNLOADED_SOURCE_UNVERIFIED_LICENSE:' + name);
  const source = row.originalUrl || row.sourceUrl || row.sourcePage;
  const licensePage = row.licenseSourceUrl || row.licenseEvidence || row.sourcePage
    || (String(row.sourceUrl || '').includes('/content/') ? row.sourceUrl : '');
  const validHttps = value => {
    try { const uri = new URL(value); return uri.protocol === 'https:' && uri.hostname === 'opengameart.org'; }
    catch { return false; }
  };
  if (!validHttps(source) || !validHttps(licensePage)) {
    throw new Error('DOWNLOADED_SOURCE_PROVENANCE_MISSING:' + name);
  }
  const expectedSha256 = String(row.sha256 || '').toLowerCase();
  const expectedBytes = Number(row.bytes ?? row.archiveBytes);
  if (!/^[a-f0-9]{64}$/.test(expectedSha256) || !Number.isSafeInteger(expectedBytes)
      || expectedBytes <= 512 || expectedBytes > 500_000_000) {
    throw new Error('DOWNLOADED_SOURCE_INVALID_DIGEST_OR_SIZE:' + name);
  }
  const original = path.join(sourceDir, name);
  if (!fs.existsSync(original) || !fs.statSync(original).isFile()) {
    throw new Error('DOWNLOADED_SOURCE_ORIGINAL_MISSING:' + name);
  }
  if (fs.statSync(original).size !== expectedBytes
      || createHash('sha256').update(fs.readFileSync(original)).digest('hex') !== expectedSha256) {
    throw new Error('DOWNLOADED_SOURCE_BINARY_MISMATCH:' + name);
  }
}
console.log('SIMPLE_RPG_DOWNLOAD_VALIDATED_ORIGINALS=' + checkedNames.size);
const execute = (command, args, options={}) => execFileSync(command, args, {
  encoding:'utf8', stdio:['ignore', 'pipe', 'pipe'], ...options
}).trim();

execute('git',['add','-A','--',sourceDir]);
const staged = execute('git',['diff','--cached','--name-only','--',sourceDir])
  .split('\n').filter(Boolean);
if (!staged.length) {
  console.log('SIMPLE_RPG_DOWNLOAD_EXISTING_SOURCE_ALREADY_ARCHIVED=YES');
  process.exit(0);
}
if (staged.some(file=>!file.startsWith(sourceDir+'/'))) {
  throw new Error('SOURCE_ARCHIVE_UNEXPECTED_STAGE_SCOPE');
}
for (const file of staged) {
  const ext = path.extname(file).toLowerCase();
  if (!['.zip','.7z','.blend','.glb','.gltf','.obj','.fbx','.png','.json',
        '.txt','.md','.tar','.gz','.wav','.ogg'].includes(ext))
    throw new Error('SOURCE_ARCHIVE_UNEXPECTED_FILE_TYPE:'+file);
}
const run = String(process.env.GITHUB_RUN_ID || '');
const attempt = String(process.env.GITHUB_RUN_ATTEMPT || '1');
if (!/^[0-9]{5,}$/.test(run) || !/^[1-9][0-9]*$/.test(attempt)) {
  throw new Error('SOURCE_ARCHIVE_CANDIDATE_RUN_ID_INVALID');
}
const candidate = 'assets/simple-rpg-' + kind + '-' + run + '-' + attempt;
execute('git',['config','user.name','github-actions[bot]']);
execute('git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
execute('git',['checkout','-b',candidate]);
execute('git',['commit','-m','assets(simple-rpg): retain verified CC0 ' + kind + ' source archives']);
const revision = execute('git',['rev-parse','HEAD']);
execute('git',['push','--set-upstream','origin',candidate]);
console.log('SIMPLE_RPG_DOWNLOAD_ARCHIVED_BRANCH=' + candidate);
console.log('SIMPLE_RPG_DOWNLOAD_ARCHIVED_COMMIT=' + revision);
console.log('SIMPLE_RPG_DOWNLOAD_ARCHIVE_FILES=' + staged.length);
const title = 'assets(simple-rpg): review verified CC0 ' + kind + ' originals';
const body = [
  'Downloaded CC0 source originals (not game-applied assets), verified by the existing',
  'simple-rpg source validation workflow. No direct main writes.',
  '',
  '- Kind: ' + kind,
  '- Original folder: ' + sourceDir,
  '- Manifest: ' + evidenceFile,
  '- Files changed: ' + staged.length,
  '- Workflow run: ' + run,
  '',
  'Merge after reviewing source metadata, size and license evidence.',
  'This PR does NOT assert Roblox model import, license re-audit, or runtime verification.',
].join('\n');
try {
  const url = execute('gh',['pr','create','--base','main','--head',candidate,
    '--title',title,'--body',body]);
  console.log('SIMPLE_RPG_DOWNLOAD_ARCHIVE_PR=' + url);
} catch(error) {
  const stderr = String(error?.stderr || error?.message || '').slice(0,350);
  console.warn('SIMPLE_RPG_DOWNLOAD_ARCHIVE_PR_BLOCKED=' + stderr);
  console.warn('SIMPLE_RPG_DOWNLOAD_ARCHIVE_BRANCH_AVAILABLE=' + candidate);
  console.warn('SIMPLE_RPG_DOWNLOAD_ORIGINALS_ALREADY_SAVED_AS_ACTION_ARTIFACT=YES');
}
