import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';

test('owner portal publication records the real version while withholding unverified runtime and Studio claims',()=>{
 const workflow=fs.readFileSync('.github/workflows/owner-daechung-rpg-direct-publish.yml','utf8');
 assert.match(workflow,/permissions:\s+contents: write/);
 assert.match(workflow,/ref: \$\{\{ github\.sha \}\}/);
 assert.match(workflow,/DAECHUNG_OWNER_PUBLISH_PASS=YES/);
 assert.match(workflow,/DAECHUNG_OWNER_PUBLISH_UNTRUSTED_TARGET_OR_ARTIFACT/);
 assert.match(workflow,/source!==process\.env\.GITHUB_SHA/);
 assert.match(workflow,/item\.robloxBuildSourceRevision===source/);
 assert.match(workflow,/item\.robloxBuildArtifactIdentity===artifact/);
 assert.match(workflow,/f0\.sourceRevision===source&&f0\.artifactIdentity===artifact/);
 assert.match(workflow,/item\.robloxDedicatedExperiencePublished=exact/);
 assert.match(workflow,/state:newState,stage:exact\?null:'EXACT_ARTIFACT_BINDING'/);
 assert.match(workflow,/git fetch --no-tags --depth=1 origin/);
 assert.doesNotMatch(workflow,/group: company-runtime-writer/);
 assert.doesNotMatch(workflow,/item\.robloxRuntimePassed=true/);
 assert.doesNotMatch(workflow,/item\.robloxStudioRuntimeSession=.*PASS/);
});
