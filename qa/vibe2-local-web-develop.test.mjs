import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLocalDevelopmentPolicy,proposeBoundedReplacement,selectRelevantExcerpt,
  requiredReviewPass
} from '../tools/vibe2-local-web-develop.mjs';

const chat={sourceWriteAllowed:false,githubWriteAllowed:false,
  qaVerdictAllowed:false,centralPolicyOverrideAllowed:false};
const contract={
  version:1,enabled:true,platform:'WEB',model:'qwen2.5-coder:3b',
  entrypoint:'tools/vibe2-local-web-develop.mjs',
  sourceScope:'SELECTED_CATALOG_WEB_GAME_INDEX_HTML_ONLY',
  ownerApplyRequired:true,ownerPrPublishRequired:true,ownerMergeRequired:true,
  modelCommandExecutionForbidden:true,cleanWorkingTreeRequired:true,
  existingVibe2QaRequired:true,existingSecurityGateRequired:true,
  existingF0F9AndReleaseGatesUnchanged:true,releaseOnlyViaExistingMainPipeline:true,
  newPipelineCreated:false,advisoryChatContractUnchanged:true
};
const policy={localVibeWebChat:chat,localVibeWebDevelopment:contract};

test('separate local development policy needs owner authority and preserves advisory read-only scope',()=>{
  assert.equal(validateLocalDevelopmentPolicy(policy).platform,'WEB');
  assert.throws(()=>validateLocalDevelopmentPolicy({localVibeWebChat:chat}),
    /LOCAL_DEVELOP_POLICY_NOT_AUTHORIZED/);
  for(const key of ['sourceWriteAllowed','githubWriteAllowed','qaVerdictAllowed','centralPolicyOverrideAllowed']){
    assert.throws(()=>validateLocalDevelopmentPolicy({
      ...policy,localVibeWebChat:{...chat,[key]:true}
    }),/LOCAL_DEVELOP_POLICY_NOT_AUTHORIZED/);
  }
  for(const key of ['ownerApplyRequired','ownerPrPublishRequired','ownerMergeRequired',
    'existingVibe2QaRequired','existingSecurityGateRequired','existingF0F9AndReleaseGatesUnchanged']){
    assert.throws(()=>validateLocalDevelopmentPolicy({
      ...policy,localVibeWebDevelopment:{...contract,[key]:false}
    }),/LOCAL_DEVELOP_POLICY_NOT_AUTHORIZED/);
  }
});
test('Ollama model can propose one bounded exact HTML replacement but not commands',()=>{
  const source='<!DOCTYPE html>\n<html>\n<body><p>old marker content</p></body>\n</html>';
  const body=JSON.stringify({oldText:'<p>old marker content</p>',
    newText:'<p>new marker content</p>',reason:'updated text'});
  const p=proposeBoundedReplacement(source,body);
  assert.match(p.updated,/new marker content/);
  assert.doesNotMatch(p.updated,/old marker content/);
  assert.equal(p.reason,'updated text');
  assert.throws(()=>proposeBoundedReplacement(source,JSON.stringify({oldText:'not present',newText:'safe'})),
    /MODEL_PATCH_NOT_UNIQUE_OR_TOO_LARGE/);
  assert.throws(()=>proposeBoundedReplacement(source,JSON.stringify({oldText:'old marker content',newText:'eval(1)'})),
    /MODEL_PATCH_UNSAFE_CONTENT/);
  assert.throws(()=>proposeBoundedReplacement(source,JSON.stringify({oldText:'old marker content',newText:'x'.repeat(5000)})),
    /MODEL_PATCH_NOT_UNIQUE_OR_TOO_LARGE/);
});
test('ambiguous or HTML-breaking model patches fail closed',()=>{
  assert.throws(()=>proposeBoundedReplacement('<html>two markers two markers</html>',
    JSON.stringify({oldText:'two markers',newText:'new text'})),
    /MODEL_PATCH_NOT_UNIQUE_OR_TOO_LARGE/);
  assert.throws(()=>proposeBoundedReplacement('<html><body>hello world</body></html>',
    JSON.stringify({oldText:'<html><body>hello world</body></html>',newText:'oops'})),
    /MODEL_PATCH_STRUCTURE_OR_SIZE_INVALID/);
});
test('only bounded relevant source excerpts are offered to a small local model',()=>{
  const source='a'.repeat(24000)+'PLACE_HERE'+'b'.repeat(2000);
  const found=selectRelevantExcerpt(source,'PLACE_HERE');
  assert.equal(found.isPartial,true);
  assert.ok(found.text.length<=12000);
  assert.match(found.text,/PLACE_HERE/);
  assert.throws(()=>selectRelevantExcerpt(source,'UNKNOWN_NEEDLE'),/EXCERPT_MATCH_NOT_FOUND/);
});
test('manual merge requires current-head 12 QA workflows, security enforce, and no failed deploy',()=>{
  const sha='a'.repeat(40);
  const names=['Vibe2 Parallelism Contract QA','Company Evolution QA','Vibe3 Engine Contract',
    'Company Records Governance','Homepage Manager','All Games Development Sync',
    'Main Write Guard','Vibe2 Learning Pipeline Contract','Company Central Policy Contract QA',
    'Vibe2 Core QA','Vibe QA','Company Security Immune System'];
  const runs=names.map(name=>({name,head_sha:sha,event:'pull_request',status:'completed',conclusion:'success'}));
  const checks=[{name:'enforce',status:'completed',conclusion:'success'}];
  assert.deepEqual(requiredReviewPass(runs,checks,sha),{pass:true,blockers:[]});
  assert.equal(requiredReviewPass(runs,checks,'b'.repeat(40)).pass,false);
  assert.equal(requiredReviewPass(runs,[],sha).pass,false);
  assert.equal(requiredReviewPass(runs.slice(1),checks,sha).pass,false);
  assert.equal(requiredReviewPass(runs,checks.concat({name:'Cloudflare Pages',
    status:'completed',conclusion:'failure',app:{slug:'cloudflare-workers-and-pages'}}),sha).pass,false);
});
