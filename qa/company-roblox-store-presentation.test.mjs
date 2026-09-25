import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveRobloxBilingualTitle,resolveRobloxStoreCreativeSpec} from '../tools/company-roblox-store-presentation.mjs';

test('Roblox title is English plus Korean and never Korean-only',()=>{
  const r=resolveRobloxBilingualTitle({launch:{
    robloxTitleEnglish:'[ISLAND CONQUEST] Cozy Island',
    robloxTitleKorean:'[섬 정복] 포근섬'
  }});
  assert.equal(r.displayName,'[ISLAND CONQUEST] Cozy Island | [섬 정복] 포근섬');
  assert.equal(r.verifiedBilingual,true);
});

test('missing either language fails closed',()=>{
  assert.throws(()=>resolveRobloxBilingualTitle({launch:{robloxTitleKorean:'포근섬'}}),/ENGLISH_MISSING/);
  assert.throws(()=>resolveRobloxBilingualTitle({launch:{robloxTitleEnglish:'Cozy Island'}}),/KOREAN_MISSING/);
});

test('creative spec requires actual gameplay and forbids shared generic placeholders',()=>{
  const r=resolveRobloxStoreCreativeSpec({
    gameId:'g',
    launch:{robloxTitleEnglish:'Game',robloxTitleKorean:'게임',artDirection:'STYLIZED'},
    marketing:{creative:{thumbnailDirection:'Show the core battle.',screenshotShotList:['battle','progression']}}
  });
  assert.equal(r.composition.actualGameplayRequired,true);
  assert.equal(r.composition.sharedGenericBackgroundForbidden,true);
  assert.equal(r.composition.misleadingAddedGameplayForbidden,true);
  assert.equal(r.outputs.homepageThumbnail.width,1920);
  assert.equal(r.outputs.homepageThumbnail.height,1080);
  assert.equal(r.outputs.icon.width,512);
  assert.equal(r.outputs.icon.height,512);
});

test('thumbnail compositor produces 16:9 thumbnail and square icon from gameplay frames only',()=>{
  const src=fs.readFileSync('tools/company-roblox-thumbnail-compose.py','utf8');
  assert.match(src,/NO_VALID_GAMEPLAY_FRAMES/);
  assert.match(src,/ImageOps\.fit\(im\.convert\("RGB"\),\(1920,1080\)/);
  assert.match(src,/ImageOps\.fit\(im\.convert\("RGB"\),\(512,512\)/);
  assert.match(src,/"actualGameplayFrameSource":True/);
  assert.match(src,/"sharedPlaceholderUsed":False/);
  assert.match(src,/"misleadingSyntheticGameplayAdded":False/);
});
