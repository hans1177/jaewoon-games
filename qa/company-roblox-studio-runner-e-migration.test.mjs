import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('tools/move-roblox-studio-runner-to-e.ps1','utf8');
const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');

test('Roblox Actions migration stores the existing registered runner and jobs on E without new credentials',()=>{
  assert.match(migration,/DestinationRoot = 'E:\\JaewoonRobloxStudioRunner'/);
  assert.match(migration,/\$source = Join-Path \$env:LOCALAPPDATA 'JaewoonRobloxStudioRunner'/);
  assert.match(migration,/gitHubUrl -ne 'https:\/\/github\.com\/hans1177\/jaewoon-games'/);
  assert.match(migration,/agentName -notlike 'roblox-studio-\*'/);
  assert.match(migration,/ROBLOX_RUNNER_MIGRATION_RUNNER_ACTIVE/);
  assert.match(migration,/\.credentials/);
  assert.match(migration,/Get-FileHash/);
  assert.match(migration,/robocopy\.exe/);
  assert.match(migration,/\/XD \(Join-Path \$source '_work'\) \(Join-Path \$source '_diag'\)/);
  assert.match(migration,/\$env:TEMP = \$runnerTemp/);
  assert.match(migration,/\$env:TMP = \$runnerTemp/);
  assert.match(migration,/JaewoonStudioAuto\.lnk/);
  assert.ok(migration.indexOf('ROBLOX_RUNNER_MIGRATION_FILE_HASH_MISMATCH') <
            migration.indexOf('Remove-Item -LiteralPath $source -Recurse -Force'));
  assert.doesNotMatch(migration,/config\.cmd|--token|Read-Host|Remove-Item.*jaewoon-games/);
  assert.match(workflow,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
});

test('Roblox E-drive migration refuses unrelated destinations and requires sufficient disk space',()=>{
  assert.match(migration,/ROBLOX_RUNNER_MIGRATION_DESTINATION_MUST_BE_E_DRIVE/);
  assert.match(migration,/ROBLOX_RUNNER_MIGRATION_E_DRIVE_NEEDS_AT_LEAST_8_GIB_FREE/);
  assert.match(migration,/ROBLOX_RUNNER_MIGRATION_NONEMPTY_UNRELATED_DESTINATION/);
  assert.match(migration,/ROBLOX_RUNNER_MIGRATION_DIFFERENT_RUNNER_ALREADY_ON_E/);
  assert.match(migration,/ROBLOX_RUNNER_MIGRATION_SOURCE_PATH_GUARD/);
});
