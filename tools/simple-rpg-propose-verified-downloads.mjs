#!/usr/bin/env node
// Keep the current CC0 download, verification, and 14-day artifact flows.
// Persist new verified originals on a candidate branch and request a reviewable
// GitHub PR; never push directly to the protected main branch.
// Token permissions may disable PR creation: in that case the branch and
// workflow artifact are retained, with a clear warning rather than fake success.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const choices = Object.freeze({
  external: 'assets/external/simple-rpg',
  wildlife: 'assets/external/simple-rpg/wildlife',
  icons: 'assets/external/simple-rpg/icons-vfx-npc',
  priority: 'assets/external/simple-rpg/priority-v1',
  music: 'assets/external/simple-rpg/music',
});
const kind = process.argv[2];
const sourceDir = choices[kind];
if (!sourceDir) throw new Error('UNKNOWN_SIMPLE_RPG_DOWNLOAD_CATEGORY');
const evidenceFile = path.join(sourceDir, 'manifest.json');
if (!fs.existsSync(evidenceFile)) throw new Error('DOWNLOADED_SOURCE_MANIFEST_MISSING');
const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
if (evidence.gameId !== 'simple-rpg' || evidence.license !== 'CC0-1.0') {
  throw new Error('DOWNLOADED_SOURCE_LICENSE_OR_GAME_MISMATCH');
}
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
