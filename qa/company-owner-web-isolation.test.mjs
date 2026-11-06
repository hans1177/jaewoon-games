import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('a WEB game main push cannot mutate or dispatch Roblox/Unity development',()=>{
  const y=fs.readFileSync('.github/workflows/company-owner-web-edit-propagation.yml','utf8');
  assert.match(y,/paths:\s*\n\s*- 'web-games\/\*\*'/);
  assert.match(y,/contents: read/);
  assert.match(y,/WEB_EDIT_ROBLOX_DISPATCH=DENIED/);
  assert.match(y,/WEB_EDIT_UNITY_DISPATCH=DENIED/);
  assert.match(y,/WEB_CHANGED_CONTENT_SHA256_BEGIN/);
  assert.match(y,/sha256sum -- "\$file"/);
  assert.match(y,/GITHUB_STEP_SUMMARY/);
  for(const forbidden of [
    'actions: write','contents: write','gh workflow run','company-development-unity-runtime.yml',
    'company-development-roblox-runtime.yml','git push origin','development-queue.json',
    'COMPANY_RUNTIME_BRANCH: company-runtime','vibe2-continuous-core.yml'
  ])assert.equal(y.includes(forbidden),false,forbidden+' must not be present in WEB native-isolation audit');
});
