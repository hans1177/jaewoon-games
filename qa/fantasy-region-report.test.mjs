import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

test('fantasy-survival region report: every eco camp has all required fields', {skip:!fs.existsSync('/tmp/luau_bin/luau')&&!process.env.LUAU_BIN_DIR}, () => {
  const run=spawnSync('node',['tools/fantasy-region-report.mjs','--check'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stdout+run.stderr);
});
