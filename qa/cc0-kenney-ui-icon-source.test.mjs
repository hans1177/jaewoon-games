// Real acquired Kenney CC0 icon bytes must be SHA-256 identical to pinned origin.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
const names=["heart","coin","save","pause","check","cog","dpad","joystick"],sourceRevision='50794239cffd480791210d84c8f572d80c8dc2f8',licenseRevision='501df19e6bc94f66801b96660385f6a4820db5d0';
const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
test('CC0 UI originals are physically acquired, hash matched, and not runtime promoted',()=>{
 assert.match(fs.readFileSync('assets/shared/kenney-icon-font/LICENSE-CC0.txt','utf8'),/^CC0 1[.]0 Universal/);
 for(const name of names){
 const id='kenney-iconfont-'+name+'-cc0-v1',list=registry.assets.filter(a=>a.id===id);
 assert.equal(list.length,1,id);const a=list[0],path='assets/shared/kenney-icon-font/'+name+'.svg';
 const bytes=fs.readFileSync(path),actual=createHash('sha256').update(bytes).digest('hex');
 assert.equal(a.sourceHash,actual);assert.equal(a.sourceSha256,actual);
 assert.equal(a.path,'/'+path);assert.equal(a.sourceRevision,sourceRevision);
 assert.equal(a.license,'CC0-1.0');
 assert.equal(a.licenseEvidenceUrl,'https://github.com/nicodinh/kenney-icon-font/blob/'+licenseRevision+'/LICENSE.md');
 assert.equal(a.downloaded,true);assert.equal(a.originalSourceImmutable,true);
 assert.equal(a.productionVerified,false);assert.equal(a.verifiedCompanyReusable,false);
 assert.equal(a.nativeRuntimeVerified,false);assert.equal(a.gameplayAuthority,false);assert.equal(a.saveAuthority,false);
 assert.equal(a.runtimeVerificationState,'SOURCE_ACQUIRED_NATIVE_BINDING_PENDING');
 assert.deepEqual(a.platforms,[]);assert.deepEqual(a.targetPlatforms,[]);
 assert.ok(bytes.toString().includes('<svg'));assert.ok(!/<script|onload=|<foreignObject/i.test(bytes.toString()));
 }
});
test('active security and Unity/UEFN hold remain unchanged',()=>{
 const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
 assert.equal(policy.ownerCanonicalRules.rule5.enabled,true);
 assert.equal(policy.developmentAccess.UNITY,'OWNER_HOLD');
 assert.equal(policy.developmentAccess.FORTNITE_UEFN,'OWNER_HOLD');
});
