import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-internal-vibe-play.yml','utf8');
const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');

test('internal Vibe play is Studio-only and never automates published Roblox Player',()=>{
  assert.match(workflow,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(workflow,/--task RunScript/);
  assert.match(workflow,/--localPlaceFile/);
  assert.match(workflow,/StudioTestService:ExecutePlayModeAsync/);
  assert.match(workflow,/UserInputService:CreateVirtualInput\(\)/);
  assert.match(workflow,/ROBLOX_PUBLISHED_PLAYER_AUTOMATION=NO/);
  assert.doesNotMatch(workflow,/roblox:\/\/placeID=/);
  assert.doesNotMatch(workflow,/RobloxPlayerBeta/);
  assert.doesNotMatch(workflow,/keybd_event/);
});

test('Studio play binds the exact immutable Roblox artifact',()=>{
  assert.match(workflow,/development-roblox-package-\$env:GAME_ID/);
  assert.match(workflow,/ROBLOX_VIBE_PLAY_IMMUTABLE_ARTIFACT_MISMATCH/);
  assert.match(workflow,/ROBLOX_VIBE_PLAY_LOCAL_ARTIFACT_BIND=PASS/);
  assert.match(workflow,/robloxInternalReleaseReady -ne \$true/);
});

test('Studio official VirtualInput drives gameplay and requires visible screen changes',()=>{
  assert.match(workflow,/virtualInput:SendKey/);
  assert.match(workflow,/virtualInput:SendMouseButton/);
  assert.match(workflow,/JAEWOON_VIBE_VIRTUAL_INPUT_SEQUENCE_COMPLETE/);
  assert.match(workflow,/Capture-StudioWindow/);
  assert.match(workflow,/ROBLOX_VIBE_PLAY_SCREEN_CHANGE_INSUFFICIENT/);
  assert.match(workflow,/if \(\$distinct -lt 3\)/);
});

test('gameplay frames feed three thumbnails and one icon without shared placeholder',()=>{
  assert.match(workflow,/company-roblox-thumbnail-compose\.py/);
  assert.match(workflow,/homepageThumbnailCandidateCount/);
  assert.match(workflow,/ROBLOX_GAMEPLAY_THUMBNAIL_CANDIDATES=3/);
  assert.match(workflow,/ROBLOX_GAMEPLAY_ICON=PASS/);
  assert.match(workflow,/sharedPlaceholderUsed -ne \$false/);
});

test('shared internal Roblox target cannot be mutated with one games title or art',()=>{
  assert.match(workflow,/Determine whether Roblox store mutation is safe/);
  assert.match(workflow,/ROBLOX_STORE_MUTATION_SKIPPED=SHARED_INTERNAL_TARGET/);
  assert.match(workflow,/if: steps\.storetarget\.outputs\.dedicated == 'true'/);
});

test('runtime evidence records Studio-only play and refills existing Vibe loop',()=>{
  assert.match(workflow,/playSurface='ROBLOX_STUDIO_TEST_SERVICE'/);
  assert.match(workflow,/publishedPlayerAutomation=\$false/);
  assert.match(workflow,/studioTestServiceUsed=\$true/);
  assert.match(workflow,/virtualInputUsed=\$true/);
  assert.match(workflow,/scenarioCoveragePass=\$false/);
  assert.match(workflow,/gh workflow run vibe2-24h-runner\.yml/);
});

test('F9 automatically dispatches Studio Vibe play after internal release',()=>{
  assert.match(f9,/Dispatch actual Roblox internal Vibe play/);
  assert.match(f9,/company-development-roblox-internal-vibe-play\.yml/);
  assert.match(f9,/ROBLOX_F9_INTERNAL_VIBE_PLAY_DISPATCH_COUNT/);
});
