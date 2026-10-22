import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  validateLocalDevelopmentPolicy,proposeBoundedReplacement,selectRelevantExcerpt,
  requiredReviewPass,cleanMain
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
test('owner game ideas rank existing gameplay modules and preserve explicit exact match',()=>{
  const header='<html>'+('header context '.repeat(1700));
  const menu='function renderMenu(){ return "menu"; }';
  const mid='middle context '.repeat(1700);
  const enemies='function spawnMonster(){ return monsterSpawn + enemyHealth + bossDamage; }';
  const source=header+menu+mid+enemies+'</html>';
  const idea=selectRelevantExcerpt(source,'','몬스터와 보스 출현 아이디어');
  assert.equal(idea.strategy,'IDEA_MATCHED_EXISTING_MODULE');
  assert.ok(idea.signals.includes('monster'));
  assert.match(idea.text,/spawnMonster/);
  const manual=selectRelevantExcerpt(source,'renderMenu','몬스터와 보스 출현 아이디어');
  assert.equal(manual.strategy,'OWNER_EXACT_MATCH');
  assert.match(manual.text,/renderMenu/);
  const fallback=selectRelevantExcerpt(source,'','완전히 무관한 요청');
  assert.equal(fallback.strategy,'SOURCE_START');
  assert.equal(selectRelevantExcerpt(source,'','게임 아이디어 적용').strategy,'SOURCE_START');
});

test('only bounded relevant source excerpts are offered to a small local model',()=>{
  const source='a'.repeat(24000)+'PLACE_HERE'+'b'.repeat(2000);
  const found=selectRelevantExcerpt(source,'PLACE_HERE');
  assert.equal(found.isPartial,true);
  assert.ok(found.text.length<=12000);
  assert.match(found.text,/PLACE_HERE/);
  assert.throws(()=>selectRelevantExcerpt(source,'UNKNOWN_NEEDLE'),/EXCERPT_MATCH_NOT_FOUND/);
});
test('local Vibe automatically syncs clean main from authenticated GitHub, never repeats unchanged merges',()=>{
  const before='a'.repeat(40),after='b'.repeat(40);
  let head=before,merges=0;
  const gitCommand=args=>{
    const cmd=args.join(' ');
    if(cmd==='branch --show-current')return 'main';
    if(cmd==='status --porcelain')return '';
    if(cmd==='remote get-url origin')return 'git@github.com:hans1177/jaewoon-games.git';
    if(cmd==='fetch --quiet origin main')return '';
    if(cmd==='rev-parse HEAD')return head;
    if(cmd==='rev-parse refs/remotes/origin/main')return after;
    if(cmd==='merge-base HEAD refs/remotes/origin/main')return before;
    if(args[0]==='show'&&args[1]?.startsWith('refs/remotes/origin/main:'))
      return readFileSync(args[1].slice('refs/remotes/origin/main:'.length),'utf8');
    if(cmd==='merge --ff-only refs/remotes/origin/main'){merges++;head=after;return '';}
    throw Error('UNEXPECTED_GIT_COMMAND:'+cmd);
  };
  assert.deepEqual(cleanMain({gitCommand}),{synced:true,revision:after});
  assert.deepEqual(cleanMain({gitCommand}),{synced:false,revision:after});
  assert.equal(merges,1);
});
test('local Vibe blocks dirty, non-main, foreign remote, divergent and invalid revisions',()=>{
  const local='a'.repeat(40),remote='b'.repeat(40);
  const scenarios=[
    {branch:'feature',error:/LOCAL_DEV_MAIN_BRANCH_REQUIRED/},
    {dirty:' M game.html',error:/LOCAL_DEV_DIRTY_WORKTREE_STOP/},
    {origin:'https://github.com/unknown/repo.git',error:/LOCAL_DEV_WRONG_REPOSITORY/},
    {base:'c'.repeat(40),error:/LOCAL_DEV_DIVERGED_MAIN_STOP/},
    {head:'bad-sha',error:/LOCAL_DEV_SYNC_REVISION_INVALID/},
    {badPolicy:true,error:/LOCAL_DEV_REMOTE_CENTRAL_POLICY_NOT_VERIFIED/}
  ];
  for(const scenario of scenarios){
    const calls=[];
    const gitCommand=args=>{
      const cmd=args.join(' ');calls.push(cmd);
      if(cmd==='branch --show-current')return scenario.branch||'main';
      if(cmd==='status --porcelain')return scenario.dirty||'';
      if(cmd==='remote get-url origin')return scenario.origin||'https://github.com/hans1177/jaewoon-games';
      if(cmd==='fetch --quiet origin main')return '';
      if(cmd==='rev-parse HEAD')return scenario.head||local;
      if(cmd==='rev-parse refs/remotes/origin/main')return remote;
      if(cmd==='merge-base HEAD refs/remotes/origin/main')return scenario.base||local;
      if(args[0]==='show'&&args[1]?.startsWith('refs/remotes/origin/main:')){
        if(scenario.badPolicy&&args[1].endsWith('security-immune-system.json'))return '{}';
        return readFileSync(args[1].slice('refs/remotes/origin/main:'.length),'utf8');
      }
      throw Error('UNEXPECTED_MUTATION:'+cmd);
    };
    assert.throws(()=>cleanMain({gitCommand}),scenario.error);
    assert.ok(!calls.some(c=>/(?:merge --ff-only|rebase|reset|push|force)/.test(c)));
  }
});

test('manual merge requires head QA and security; Cloudflare is separately not a deploy PASS',()=>{
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
  assert.equal(requiredReviewPass(runs.filter(r=>r.name!=='Vibe2 Core QA'),checks,sha).pass,false);
  assert.equal(requiredReviewPass(runs,checks.concat({name:'Workers Builds: jaewoon-multiplayer',
    status:'completed',conclusion:'failure',app:{slug:'cloudflare-workers-and-pages'}}),sha).pass,true);
  assert.equal(requiredReviewPass(runs,checks.concat({name:'Cloudflare Pages',
    status:'completed',conclusion:'failure',app:{slug:'cloudflare-workers-and-pages'}}),sha).pass,true);
  assert.equal(requiredReviewPass(runs.map(r=>r.name==='Company Security Immune System'
    ?{...r,conclusion:'failure'}:r),checks,sha).pass,false);
});

test('existing periodic supervisor sync verifies all four policies and preserves diverged commits',()=>{
  const supervisor=readFileSync('tools/unity-mcp/run-company-supervisor.ps1','utf8');
  const sync=supervisor.split('function Sync-Repository {')[1]?.split('function Test-PublishPolicy {')[0];
  assert.ok(sync,'canonical supervisor sync function must exist');
  for(const name of ['platform-release-roadmap','company-log-map','company-architecture-map','security-immune-system'])
    assert.ok(sync.includes(name+'.json'),name);
  assert.ok(sync.includes("Invoke-Git @('merge','--ff-only','origin/main')"));
  assert.ok(sync.includes('Diverged local main: automatic rebase forbidden'));
  assert.ok(!sync.includes("Invoke-Git @('rebase'"));
  assert.ok(!sync.includes("Invoke-Git @('reset'"));
});
