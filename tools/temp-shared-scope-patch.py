from pathlib import Path

bootstrap=Path('tools/company-development-web-bootstrap.mjs')
s=bootstrap.read_text()
marker="function buildPreservedSharedGame({gameId,gameName,sourcePath,inventory}){"
helpers="""function sharedScopeActionIndex(item={},index=0){
  const text=`${clean(item?.path)} ${clean(item?.label)}`.toLowerCase();
  if(/mobileux|mobile|touch/.test(text))return 2;
  if(/fight|combat|attack|enemy|boss/.test(text))return index%2===0?3:1;
  if(/progress through|final boss|real ending|advance|next story|major encounter|complete story/.test(text))return 4;
  if(/explor|area|quest|discover|character|story/.test(text))return 0;
  if(/equip|skill|upgrade|growth|level/.test(text))return 3;
  return index%5;
}
function sharedScopeButtons(inventory=[]){
  const mechanicIds=['action-primary','action-secondary','action-tertiary','action-support','action-accelerated'];
  const count=Math.max(5,inventory.length);
  return Array.from({length:count},(_,index)=>{
    const item=inventory[index],actionIndex=item?sharedScopeActionIndex(item,index):index%5;
    const scope=item?` data-scope-id=\"${esc(item.id)}\"`:'';
    return `<button id=\"a${index}\" class=\"action\" data-gameplay-action=\"true\"${scope} data-mechanic-id=\"${mechanicIds[actionIndex]}\" data-action-index=\"${actionIndex}\"></button>`;
  }).join('');
}
"""+marker
if s.count(marker)!=1: raise SystemExit(f'bootstrap helper marker count={s.count(marker)}')
s=s.replace(marker,helpers)
old="""  let engine=fs.readFileSync(SHARED_REAL_ENGINE,'utf8').replaceAll('__SCOPE_COUNT__',String(inventory.length));
  for(let i=0;i<5;i++)engine=engine.replaceAll(`__SCOPE_${i}__`,inventory[i]?.id||`unused-scope-${i+1}`);
  engine=bindInitialCycleContract(engine,inventory.length);
  if(!/data-web-artifact-type=[\"']REAL_PLAYABLE_GAME/i.test(engine))engine=engine.replace('<main ',`<main data-web-artifact-type=\"${REAL_ARTIFACT_TYPE}\" data-approved-scope-count=\"${inventory.length}\" data-gameplay-system-count=\"7\" data-run-result=\"running\" `);
  const validation=`<script>window.GAME_CONFIG=window.GAME_CONFIG||{};window.GAME_CONFIG.validationScopes=${JSON.stringify(inventory.map(x=>({id:x.id,path:x.path,label:x.label})))};</script>`;
"""
new="""  let engine=fs.readFileSync(SHARED_REAL_ENGINE,'utf8').replaceAll('__SCOPE_COUNT__',String(inventory.length));
  const actionMarkup=sharedScopeButtons(inventory);
  engine=engine.replace(/<section class=\"actions\">[\\s\\S]*?<\\/section>/,`<section class=\"actions\">${actionMarkup}</section>`);
  for(let i=0;i<5;i++)engine=engine.replaceAll(`__SCOPE_${i}__`,inventory[i]?.id||`unused-scope-${i+1}`);
  engine=bindInitialCycleContract(engine,inventory.length);
  if(!/data-web-artifact-type=[\"']REAL_PLAYABLE_GAME/i.test(engine))engine=engine.replace('<main ',`<main data-web-artifact-type=\"${REAL_ARTIFACT_TYPE}\" data-approved-scope-count=\"${inventory.length}\" data-gameplay-system-count=\"7\" data-run-result=\"running\" `);
  const validation=`<script>window.GAME_CONFIG=window.GAME_CONFIG||{};window.GAME_CONFIG.validationScopes=${JSON.stringify(inventory.map((x,index)=>({id:x.id,path:x.path,label:x.label,actionIndex:sharedScopeActionIndex(x,index)})))};</script>`;
"""
if s.count(old)!=1: raise SystemExit(f'bootstrap shared block count={s.count(old)}')
bootstrap.write_text(s.replace(old,new))

engine=Path('web-games/_shared/vibe2-final.js')
e=engine.read_text()
repls=[
("const scopes=Array.isArray(C.validationScopes)?C.validationScopes.slice(0,5):[];","const scopes=Array.isArray(C.validationScopes)?C.validationScopes:[];"),
("function applyScopes(){document.body.dataset.approvedScopeCount=String(scopes.length);for(let i=0;i<5;i++){const b=$('#a'+i);if(scopes[i]?.id)b.dataset.scopeId=scopes[i].id;else b.removeAttribute('data-scope-id');}}","function applyScopes(){const controls=[...document.querySelectorAll('.actions .action')];document.body.dataset.approvedScopeCount=String(scopes.length);controls.forEach((b,i)=>{if(scopes[i]?.id)b.dataset.scopeId=scopes[i].id;else b.removeAttribute('data-scope-id');b.dataset.actionIndex=String(Number.isFinite(Number(scopes[i]?.actionIndex))?Number(scopes[i].actionIndex):i%5);});}"),
("function buttons(items){for(let i=0;i<5;i++){const b=$('#a'+i);b.textContent=items[i]||'행동';b.disabled=S.ended;}}","function buttons(items){document.querySelectorAll('.actions .action').forEach((b,i)=>{const actionIndex=Number(b.dataset.actionIndex||i%5);b.textContent=items[actionIndex]||items[i%Math.max(1,items.length)]||'행동';b.disabled=S.ended;});}"),
("const b=$('.board');b.innerHTML=`<div style=\"padding:25px 12px;text-align:center\"><div style=\"font-size:54px\">${['🌲','🏰','💎','👑','🐉'][Math.min(4,S.chapter-1)]}</div><h2>${names[Math.min(4,S.chapter-1)]}</h2><p style=\"color:#bcd0df;line-height:1.6\">${C.story||'엘도리아를 되찾기 위한 여정이 계속된다.'}</p></div>`;","const b=$('.board');b.dataset.area=`chapter-${Math.min(5,S.chapter)}-route-${S.progress||0}`;b.innerHTML=`<div style=\"padding:25px 12px;text-align:center\"><div style=\"font-size:54px\">${['🌲','🏰','💎','👑','🐉'][Math.min(4,S.chapter-1)]}</div><h2>${names[Math.min(4,S.chapter-1)]}</h2><p style=\"color:#bcd0df;line-height:1.6\">${C.story||'엘도리아를 되찾기 위한 여정이 계속된다.'}</p></div>`;"),
("if(i===0){S.gold+=4+S.chapter;S.score+=5;log('지역을 탐색해 단서를 찾았다.');}","if(i===0){S.progress=(S.progress+1)%4;S.gold+=4+S.chapter;S.score+=5;log('지역을 탐색해 단서를 찾았다.');}"),
("for(let i=0;i<5;i++)$('#a'+i).onclick=()=>act(i);","document.querySelectorAll('.actions .action').forEach((b,i)=>{b.onclick=()=>act(Number(b.dataset.actionIndex||i%5));});")
]
for old,new in repls:
    if e.count(old)!=1: raise SystemExit(f'engine target count={e.count(old)} for {old[:60]}')
    e=e.replace(old,new)
engine.write_text(e)

test=Path('qa/company-development-web-runtime.test.mjs')
t=test.read_text()
anchor="test('approved scope inventory captures core gameplay',()=>{"
addition="""test('shared preserved engine binds more than five approved scopes without model regeneration',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-shared-scopes-'));
  const source=path.join(root,'source'),candidate=path.join(root,'candidate');
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'index.html'),'<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>window.GAME_CONFIG={id:"shared-story-test",name:"Shared Story",mode:"eldoria",hp:100,desc:"story",story:"story"}</script><script src="/web-games/_shared/vibe2-final.js"></script></body></html>');
  const baseline={content:{coreFun:'Explore an area, meet characters, accept story quests, and discover information.',coreLoop:[
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location.',
    'Progress through the complete story arc to a final boss and a real ending.',
    'Explore an area, meet characters, accept or advance story quests, and discover information.',
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location.',
    'Progress through the complete story arc to a final boss and a real ending.',
    'Explore an area, meet characters, accept or advance story quests, and discover information.',
    'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location.'
  ],mobileUx:'touch-first story controls'}};
  const output=await buildFirstPlayable({gameId:'shared-story-test',gameName:'Shared Story',baseline,sourcePath:source,candidatePath:candidate,candidateId:'shared-story-test',sourceCommit:'test',model:'none'});
  assert.equal(output.generation.modelInvoked,false);
  assert.equal(output.review.pass,true);
  assert.equal(output.approvedScopeInventory.length,9);
  const html=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
  assert.equal((html.match(/data-scope-id=/g)||[]).length,9);
  assert.match(html,/data-area=/);
  assert.doesNotMatch(html,/validationScopes\)\?C\.validationScopes\.slice\(0,5\)/);
});

"""+anchor
if t.count(anchor)!=1: raise SystemExit(f'test anchor count={t.count(anchor)}')
test.write_text(t.replace(anchor,addition))
