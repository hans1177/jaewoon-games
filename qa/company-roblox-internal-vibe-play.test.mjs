import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-internal-vibe-play.yml','utf8');
const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');

test('internal Vibe play uses the authenticated Windows Roblox Player runner',()=>{
  assert.match(workflow,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(workflow,/ROBLOX_VIBE_PLAY_REQUIRES_INTERNAL_RELEASE/);
  assert.match(workflow,/currentStep -ne 'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'/);
  assert.match(workflow,/roblox:\/\/placeID=\$env:PLACE_ID/);
  assert.match(workflow,/Get-Process -Name RobloxPlayerBeta,RobloxPlayer/);
  assert.match(workflow,/keybd_event/);
  assert.match(workflow,/ROBLOX_VIBE_PLAY_ACTUAL_INPUT=PASS/);
});

test('internal Vibe play captures only the Roblox window and requires visible state change',()=>{
  assert.match(workflow,/GetWindowRect/);
  assert.match(workflow,/Capture-RobloxWindow/);
  assert.doesNotMatch(workflow,/PrimaryScreen\.Bounds[\s\S]*CopyFromScreen/);
  assert.match(workflow,/ROBLOX_VIBE_PLAY_SCREEN_CHANGE_INSUFFICIENT/);
  assert.match(workflow,/if \(\$distinct -lt 3\)/);
});

test('actual gameplay frames feed three thumbnails and one icon',()=>{
  assert.match(workflow,/company-roblox-thumbnail-compose\.py/);
  assert.match(workflow,/homepageThumbnailCandidateCount/);
  assert.match(workflow,/ROBLOX_GAMEPLAY_THUMBNAIL_CANDIDATES=3/);
  assert.match(workflow,/ROBLOX_GAMEPLAY_ICON=PASS/);
  assert.match(workflow,/sharedPlaceholderUsed -ne \$false/);
});

test('runtime evidence is exact-candidate bound and refills existing Vibe repair loop',()=>{
  assert.match(workflow,/ROBLOX_VIBE_PLAY_SOURCE_CHANGED_BEFORE_PERSIST/);
  assert.match(workflow,/ROBLOX_VIBE_PLAY_VERSION_CHANGED_BEFORE_PERSIST/);
  assert.match(workflow,/robloxInternalVibePlayEvidence/);
  assert.match(workflow,/robloxStorePresentationEvidence/);
  assert.match(workflow,/scenarioCoveragePass=\$false/);
  assert.match(workflow,/gh workflow run vibe2-24h-runner\.yml/);
});

test('F9 automatically dispatches the actual play executor after internal release',()=>{
  assert.match(f9,/Dispatch actual Roblox internal Vibe play/);
  assert.match(f9,/company-development-roblox-internal-vibe-play\.yml/);
  assert.match(f9,/ROBLOX_F9_INTERNAL_VIBE_PLAY_DISPATCH_COUNT/);
});
