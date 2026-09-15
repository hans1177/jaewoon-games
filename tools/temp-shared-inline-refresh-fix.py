from pathlib import Path
import re

bootstrap=Path('tools/company-development-web-bootstrap.mjs')
s=bootstrap.read_text()
pattern=r"function buildPreservedSharedGame\(\{gameId,gameName,sourcePath,inventory\}\)\{[\s\S]*?\n\}\nfunction buildPreservedStandaloneGame\(\{gameId,gameName,sourcePath,inventory\}\)\{[\s\S]*?\n\}"
m=re.search(pattern,s)
if not m: raise SystemExit('preserved shared/standalone block not found')
new=r'''function boundSharedEngine(inventory=[]){
  let engine=fs.readFileSync(SHARED_REAL_ENGINE,'utf8');
  const actionMarkup=sharedScopeButtons(inventory);
  engine=engine.replace(/<section class="actions">[\s\S]*?<\/section>/,`<section class="actions">${actionMarkup}</section>`);
  for(let i=0;i<5;i++)engine=engine.replaceAll(`__SCOPE_${i}__`,inventory[i]?.id||`unused-scope-${i+1}`);
  engine=bindInitialCycleContract(engine,inventory.length);
  if(!/data-web-artifact-type=["']REAL_PLAYABLE_GAME/i.test(engine))engine=engine.replace('<main ',`<main data-web-artifact-type="${REAL_ARTIFACT_TYPE}" data-approved-scope-count="${inventory.length}" data-gameplay-system-count="7" data-run-result="running" `);
  return engine;
}
function sharedValidationScript(inventory=[]){
  return `<script>window.GAME_CONFIG=window.GAME_CONFIG||{};window.GAME_CONFIG.validationScopes=${JSON.stringify(inventory.map((x,index)=>({id:x.id,path:x.path,label:x.label,actionIndex:sharedScopeActionIndex(x,index)})))};</script>`;
}
function inlinedSharedEngineScript(text){
  for(const match of scripts(text)){
    const body=String(match[2]||'');
    if(/const C=window\.GAME_CONFIG\|\|\{\};/.test(body)&&/const key='jg-final:'\+C\.id;/.test(body)&&/function renderStory\(\)/.test(body)&&/case'eldoria'/.test(body))return String(match[0]||'');
  }
  return '';
}
function refreshInlinedSharedEngine(original,inventory=[]){
  let out=String(original||'');
  const current=inlinedSharedEngineScript(out);
  if(!current)return out;
  const validation=sharedValidationScript(inventory);
  const existingValidation=/<script>window\.GAME_CONFIG=window\.GAME_CONFIG\|\|\{\};window\.GAME_CONFIG\.validationScopes=[\s\S]*?<\/script>/i;
  if(existingValidation.test(out))out=out.replace(existingValidation,validation);
  else out=out.replace(current,`${validation}${current}`);
  return out.replace(current,`<script>${boundSharedEngine(inventory)}</script>`);
}
function buildPreservedSharedGame({gameId,gameName,sourcePath,inventory}){
  const indexFile=path.join(sourcePath,'index.html');
  if(!fs.existsSync(indexFile)||!fs.existsSync(SHARED_REAL_ENGINE))return null;
  const original=fs.readFileSync(indexFile,'utf8'),sharedScript=/<script\b[^>]*src=["']\/web-games\/_shared\/vibe2-final\.js["'][^>]*><\/script\s*>/i;
  if(!sharedScript.test(original))return null;
  if(inventory.length<1)throw new Error(`SOURCE_PRESERVE_SCOPE_COUNT_UNSUPPORTED:${inventory.length}`);
  const html=original.replace(sharedScript,`${sharedValidationScript(inventory)}<script>${boundSharedEngine(inventory)}</script>`);
  return preservedResult({gameId,gameName,html,inventory,notes:['existing shared real game source preserved before Vibe2 regeneration','shared runtime inlined for immutable source binding','save key and gameplay state retained']});
}
function buildPreservedStandaloneGame({gameId,gameName,sourcePath,inventory}){
  const indexFile=path.join(sourcePath,'index.html');
  if(!fs.existsSync(indexFile))return null;
  const original=fs.readFileSync(indexFile,'utf8');
  if(/<script\b[^>]*src=["']\/web-games\/_shared\/vibe2-final\.js["']/i.test(original))return null;
  const refreshed=refreshInlinedSharedEngine(original,inventory);
  const html=preparePreservedStandaloneHtml(refreshed,inventory);
  const refreshedShared=refreshed!==original;
  return preservedResult({gameId,gameName,html,inventory,notes:[refreshedShared?'existing inlined shared runtime deterministically refreshed before validation':'existing standalone real game source preserved before Vibe2 regeneration','gameplay state machine, controls, win/fail rules and visual surface retained']});
}'''
s=s[:m.start()]+new+s[m.end():]
bootstrap.write_text(s)

test=Path('qa/company-development-web-runtime.test.mjs')
t=test.read_text()
anchor="test('shared preserved engine binds more than five approved scopes without model regeneration',async()=>{"
addition=r'''test('inlined shared-engine snapshots refresh to the current canonical engine without model regeneration',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-inline-refresh-'));
  const source=path.join(root,'source'),firstCandidate=path.join(root,'first'),frozenSource=path.join(root,'frozen'),refreshedCandidate=path.join(root,'refreshed');
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'index.html'),'<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>window.GAME_CONFIG={id:"inline-refresh-story",name:"Inline Refresh",mode:"eldoria",hp:100,desc:"story",story:"story"}</script><script src="/web-games/_shared/vibe2-final.js"></script></body></html>');
  const baseline={content:{coreFun:'Explore an area, meet characters, accept story quests, and discover information.',coreLoop:[
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location or major encounter.',
    'Progress through the complete story arc to a final boss and a real ending, with optional post-game or sequel hooks kept separate from the base conclusion.',
    'Explore an area, meet characters, accept or advance story quests, and discover information that moves the main narrative forward.',
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location or major encounter.',
    'Progress through the complete story arc to a final boss and a real ending, with optional post-game or sequel hooks kept separate from the base conclusion.',
    'Explore an area, meet characters, accept or advance story quests, and discover information that moves the main narrative forward.',
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location or major encounter.'
  ],mobileUx:'Story Driven'}};
  const first=await buildFirstPlayable({gameId:'inline-refresh-story',gameName:'Inline Refresh',baseline,sourcePath:source,candidatePath:firstCandidate,candidateId:'inline-refresh-first',sourceCommit:'test',model:'none'});
  assert.equal(first.generation.modelInvoked,false);
  let frozen=fs.readFileSync(path.join(firstCandidate,'index.html'),'utf8');
  frozen=frozen.replace('window.__GAME_REPLAY_SEED__=replaySeed;','');
  fs.mkdirSync(frozenSource,{recursive:true});
  fs.writeFileSync(path.join(frozenSource,'index.html'),frozen);
  const refreshed=await buildFirstPlayable({gameId:'inline-refresh-story',gameName:'Inline Refresh',baseline,sourcePath:frozenSource,candidatePath:refreshedCandidate,candidateId:'inline-refresh-second',sourceCommit:'test',model:'none'});
  assert.equal(refreshed.generation.modelInvoked,false);
  assert.equal(refreshed.review.pass,true);
  const html=fs.readFileSync(path.join(refreshedCandidate,'index.html'),'utf8');
  assert.match(html,/window\.__GAME_REPLAY_SEED__=replaySeed/);
  assert.equal((html.match(/data-scope-id=/g)||[]).length,9);
  assert.match(html,/existing inlined shared runtime deterministically refreshed before validation|data-replay-seed/);
});

'''+anchor
if t.count(anchor)!=1: raise SystemExit(f'test anchor count={t.count(anchor)}')
test.write_text(t.replace(anchor,addition))
