import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveRobloxBilingualTitle,resolveRobloxStoreCreativeSpec} from '../tools/company-roblox-store-presentation.mjs';

test('Roblox title keeps English primary and Korean secondary',()=>{
  const r=resolveRobloxBilingualTitle({launch:{
    robloxTitleEnglish:'Cozy Island',
    robloxTitleKorean:'포근섬'
  }});
  assert.equal(r.displayName,'Cozy Island | 포근섬');
  assert.equal(r.verifiedBilingual,true);
});

test('missing either title language fails closed',()=>{
  assert.throws(()=>resolveRobloxBilingualTitle({launch:{robloxTitleKorean:'포근섬'}}),/ENGLISH_MISSING/);
  assert.throws(()=>resolveRobloxBilingualTitle({launch:{robloxTitleEnglish:'Cozy Island'}}),/KOREAN_MISSING/);
});

test('creative spec is gameplay-first and forbids shared placeholders',()=>{
  const r=resolveRobloxStoreCreativeSpec({
    gameId:'g',
    launch:{robloxTitleEnglish:'Game',robloxTitleKorean:'게임',artDirection:'STYLIZED'},
    marketing:{creative:{thumbnailDirection:'Show the core battle.'}}
  });
  assert.equal(r.composition.actualGameplayRequired,true);
  assert.equal(r.composition.sharedGenericBackgroundForbidden,true);
  assert.equal(r.composition.misleadingAddedGameplayForbidden,true);
  assert.equal(r.outputs.homepageThumbnail.width,1920);
  assert.equal(r.outputs.homepageThumbnail.height,1080);
  assert.equal(r.outputs.icon.width,512);
});

test('thumbnail compositor requires three distinct gameplay frames and emits 3 candidates',()=>{
  const src=fs.readFileSync('tools/company-roblox-thumbnail-compose.py','utf8');
  assert.match(src,/select_frames\(frames,3\)/);
  assert.match(src,/INSUFFICIENT_DISTINCT_GAMEPLAY_FRAMES/);
  assert.match(src,/"homepageThumbnailCandidateCount":len\(thumbnails\)/);
  assert.match(src,/"actualGameplayFrameSource":True/);
  assert.match(src,/"sharedPlaceholderUsed":False/);
  assert.match(src,/\(1920,1080\)/);
  assert.match(src,/\(512,512\)/);
});

test('missing explicit English title falls back to gameId English slug',()=>{
  const r=resolveRobloxBilingualTitle({
    gameId:'bug-defense',
    launch:{gameName:'곤충 디펜스'}
  });
  assert.equal(r.displayName,'Bug Defense | 곤충 디펜스');
  assert.equal(r.verifiedBilingual,true);
});

test('long marketing tags are removed before failing the Roblox title length contract',()=>{
  const r=resolveRobloxBilingualTitle({
    gameId:'cozy-island',
    launch:{
      robloxTitleEnglish:'[ISLAND CONQUEST] Cozy Island: Build a Tiny Kingdom',
      robloxTitleKorean:'[섬 정복] 포근섬: 작은 왕국 키우기',
      gameTitleEn:'Cozy Island: Build a Tiny Kingdom',
      gameTitleKo:'포근섬: 작은 왕국 키우기'
    }
  });
  assert.match(r.displayName,/^Cozy Island \| 포근섬$/);
  assert.ok(Array.from(r.displayName).length<=50);
});
