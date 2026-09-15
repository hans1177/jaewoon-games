from pathlib import Path
import re

bootstrap=Path('tools/company-development-web-bootstrap.mjs')
s=bootstrap.read_text()
start=s.index('export async function buildFirstPlayable(')
end=s.index("\n  if(!review?.pass)throw new Error(`REAL_PLAYABLE_WEB_GAME_BUILD_FAILED:", start)
head=s[:start]
tail=s[end:]
replacement=r'''export async function buildFirstPlayable({gameId,gameName,baseline,sourcePath,candidatePath,candidateId,sourceCommit,model,forceRepair=false,repairReason=''}){
  void candidateId;void sourceCommit;
  const inventory=deriveApprovedScopeInventory(baseline);
  const preserved=buildPreservedSharedGame({gameId,gameName,sourcePath,inventory})||buildPreservedStandaloneGame({gameId,gameName,sourcePath,inventory});
  const preservationBlockers=[...(preserved?.review?.blockers||[])];
  if(forceRepair)preservationBlockers.push(`RUNTIME_REWORK_REQUIRED:${clean(repairReason)||'CANONICAL_DEVELOPMENT_REWORK'}`);
  const developmentContext=buildVibeDevelopmentContext({gameId,genre:inferDevelopmentGenre({gameId,baseline}),baseline,inventory,existingHtml:preserved?.html||'',blockers:preservationBlockers});
  let result,review,generation,deterministicFailure='';
  if(preserved?.preservationEligible&&!forceRepair){
    result=preserved;
    review=preserved.review;
    generation={mode:preserved.generationMode,modelAttempts:0,modelContractFailures:[],modelUsed:false,modelInvoked:false,sourcePreserved:true,forcedRepair:false,model:null,developmentContext,deterministicFirst:true};
  }else{
    if(!preserved&&!forceRepair){
      try{
        const fallback=buildContractSafePlayable({gameId,gameName,baseline});
        result=fallback;
        review=fallback.review||validateBootstrapHtml(fallback.html,{scopeInventory:fallback.approvedScopeInventory});
        generation={mode:'DETERMINISTIC_GENRE_IMPLEMENTATION',fallbackMode:fallback.generationMode,modelAttempts:0,modelContractFailures:[],modelUsed:false,modelInvoked:false,sourcePreserved:false,forcedRepair:false,model:null,developmentContext,deterministicFirst:true};
      }catch(error){
        deterministicFailure=String(error?.message||error).replace(/\s+/g,' ').slice(0,1800);
      }
    }
    if(!result){
      await ensureLocalVibeRuntime(model);
      const vibe=await buildVibePlayable({gameId,gameName,baseline,inventory,model,existingHtml:preserved?.html||'',preservationBlockers,developmentContext});
      ({result,review,generation}=vibe);
      generation={...generation,forcedRepair:Boolean(forceRepair),deterministicFirst:true,deterministicFailure:deterministicFailure||null};
      if(!result){
        if(preserved)throw new Error(`VIBE2_PRESERVED_SOURCE_REPAIR_FAILED:${(generation.modelContractFailures||[]).join(' || ')||'no-valid-model-candidate'}`);
        const modelFailure=(generation.modelContractFailures||[]).join(' || ');
        throw new Error(`VIBE2_PRIMARY_IMPLEMENTATION_FAILED:${modelFailure||'no-valid-model-candidate'};DETERMINISTIC_FIRST_FAILED:${deterministicFailure||'not-applicable'}`);
      }
    }
  }'''
bootstrap.write_text(head+replacement+tail)

s=bootstrap.read_text()
needle="  console.log('VIBE2_PRIMARY_DEVELOPER=YES');\n"
if needle not in s:
    raise SystemExit('bootstrap log marker missing')
s=s.replace(needle,"  console.log('DETERMINISTIC_FIRST=YES');\n  console.log('AI_OPTIONAL=YES');\n  console.log('DETERMINISTIC_BUILD_USED='+(generation.modelInvoked?'NO':'YES'));\n  console.log('VIBE2_PRIMARY_DEVELOPER='+(generation.modelInvoked?'YES':'NO'));\n",1)
bootstrap.write_text(s)

workflow=Path('.github/workflows/company-development-confirmed-runtime.yml')
w=workflow.read_text()
block="""
      - name: Prepare local Vibe2 model for development cycles
        if: matrix.runtimeStage == 'initial-cycle' && matrix.existingWebValidated != true
        uses: ./.github/actions/prepare-ollama
        with:
          model: qwen3:1.7b
          pull-model: 'true'
"""
if block not in w:
    raise SystemExit('prepare-ollama workflow block missing')
lazy="""
      - name: Confirm lazy optional AI runtime policy
        if: matrix.runtimeStage == 'initial-cycle' && matrix.existingWebValidated != true
        run: |
          grep -q "DETERMINISTIC_FIRST=YES" tools/company-development-web-bootstrap.mjs
          grep -q "AI_OPTIONAL=YES" tools/company-development-web-bootstrap.mjs
          echo 'WEB_AI_MODE=LAZY_OPTIONAL'
          echo 'WEB_MODEL_PREP=DEFERRED_UNTIL_REQUIRED'
"""
workflow.write_text(w.replace(block,lazy,1))

speed=Path('qa/company-speed-sequence-workflow.test.mjs')
q=speed.read_text()
pattern=r"test\('Web runtime pins source revision and prepares local Vibe only for development cycles',[\s\S]*?\n\}\);"
repl="""test('Web runtime pins source revision and defers local AI setup until deterministic paths are exhausted',()=>{
  const exactRefs=router.match(/ref:\\s*\\$\\{\\{\\s*github\\.sha\\s*\\}\\}/g)||[];
  assert.ok(exactRefs.length>=4,`expected exact revision checkouts, got ${exactRefs.length}`);
  assert.doesNotMatch(router,/Prepare local Vibe2 model for development cycles/);
  assert.doesNotMatch(router,/uses:\\s*\\.\\/\\.github\\/actions\\/prepare-ollama[\\s\\S]{0,180}model: qwen3:1\\.7b/);
  assert.match(router,/Confirm lazy optional AI runtime policy/);
  assert.match(router,/WEB_AI_MODE=LAZY_OPTIONAL/);
  assert.match(router,/WEB_MODEL_PREP=DEFERRED_UNTIL_REQUIRED/);
  assert.match(router,/--force-repair=true/,'a returned final-depth failure must force a real preserved-source repair');
  assert.match(router,/RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION/);
});"""
q2,n=re.subn(pattern,repl,q,count=1)
if n!=1:
    raise SystemExit('speed workflow test block replacement failed')
speed.write_text(q2)

runtime=Path('qa/company-development-web-runtime.test.mjs')
q=runtime.read_text()
pattern=r"test\('canonical Web bootstrap keeps Vibe2 as primary developer and supports preserved-source content rework',[\s\S]*?\n\}\);"
repl="""test('canonical Web bootstrap is deterministic-first and invokes Vibe2 only after deterministic paths fail',()=>{
  const source=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');
  assert.match(source,/DETERMINISTIC_GENRE_IMPLEMENTATION/);
  assert.match(source,/VIBE2_PRIMARY_MODEL_IMPLEMENTATION/);
  assert.match(source,/VIBE2_PRESERVED_SOURCE_REPAIR/);
  assert.match(source,/DETERMINISTIC_FIRST=YES/);
  assert.match(source,/AI_OPTIONAL=YES/);
  const start=source.indexOf('export async function buildFirstPlayable');
  const deterministic=source.indexOf('const fallback=buildContractSafePlayable({gameId,gameName,baseline});',start);
  const model=source.indexOf('await ensureLocalVibeRuntime(model);',start);
  assert.ok(deterministic>start&&model>deterministic,'deterministic compiler must run before local model setup');
  assert.match(source,/await buildVibePlayable\\(/);
  assert.match(source,/VIBE_DEVELOPMENT_CONTEXT/);
  assert.match(source,/repairReason/);
  assert.match(source,/FINAL_CONTENT_DEPTH_REWORK_REQUIRED|반복 행동\\/재시작 시간/);
  assert.match(source,/SOURCE_REPAIRED=/);
  assert.match(source,/GENRE_REAL_IMPLEMENTATION_NOT_READY/);
});"""
q2,n=re.subn(pattern,repl,q,count=1)
if n!=1:
    raise SystemExit('web runtime canonical test block replacement failed')
marker="test('legacy frozen implementation context requires an exact canonical game and seed binding'"
if marker not in q2:
    raise SystemExit('legacy marker missing')
newtest="""test('deterministic supported greenfield game does not require a local model',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'deterministic-greenfield-'));
  const source=path.join(root,'source'),candidate=path.join(root,'candidate');
  fs.mkdirSync(source,{recursive:true});
  const baseline={gameSeedId:'SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-001',content:{identity:'Pocket Foundry',coreFun:'collect resources and upgrade production',coreLoop:['collect ore into production','smelt ore into bars','sell bars for credits'],mobileUx:'touch controls'}};
  try{
    const output=await buildFirstPlayable({gameId:'seed-roblox-simulator-tycoon-i-adopt-me',gameName:'Pocket Foundry',baseline,sourcePath:source,candidatePath:candidate,candidateId:'deterministic-test',sourceCommit:'test',model:'none'});
    assert.equal(output.generation.modelInvoked,false);
    assert.equal(output.generation.mode,'DETERMINISTIC_GENRE_IMPLEMENTATION');
    assert.equal(output.review.pass,true);
    assert.equal(fs.existsSync(path.join(candidate,'index.html')),true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

"""
q2=q2.replace(marker,newtest+marker,1)
runtime.write_text(q2)
