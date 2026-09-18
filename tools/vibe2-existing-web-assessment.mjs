// Existing Web source assessment for Vibe exploration.
// Read-only: compares approved design evidence with the current Web source and chooses a preservation strategy.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { deriveApprovedScopeInventory } from './company-approved-scope-contract.mjs';

const clean=value=>String(value??'').trim();
const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const STOP_WORDS=new Set(['game','player','system','mobile','web','core','loop','state','게임','플레이어','시스템','모바일','웹','핵심','루프','상태']);
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const sha=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
const tokens=value=>unique(clean(value).toLowerCase().match(/[a-z0-9가-힣]+/g)||[]).filter(token=>token.length>=3&&!STOP_WORDS.has(token)).slice(0,24);
const scripts=text=>[...String(text||'').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x=>x[1]).join('\n');

function evidenceScore(order={}){
  const rows=[...(order?.selectedTask?.evidence||[]),...(order?.evidence||[])].map(clean);
  for(const row of rows){const match=row.match(/^web-strict-score:(\d+(?:\.\d+)?)$/i);if(match)return Number(match[1]);}
  return null;
}
function latestApprovedDesign(cwd,gameId){
  const root=path.join(cwd,'design',clean(gameId));
  if(!clean(gameId)||!fs.existsSync(root))return{baseline:null,path:null,approved:false};
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort().reverse();
  let fallback=null;
  for(const date of dates){
    const revised=path.join(root,date,'design-revised.json');if(!fs.existsSync(revised))continue;
    const baseline=readJson(revised,null);if(!baseline)continue;
    fallback ||= {baseline,path:path.relative(cwd,revised).replaceAll('\\','/'),approved:false};
    const status=readJson(path.join(root,date,'cycle-status.json'),{}),gate=status?.baselineGate||{},strict=status?.strictDesignReview||{};
    const approved=gate.ready===true||/DESIGN_BASELINE_READY|DEVELOPMENT_BASELINE_READY/.test(clean(gate.state).toUpperCase())||(strict.verdict==='PASS'&&Number(strict.totalScore||0)>=80);
    if(approved)return{baseline,path:path.relative(cwd,revised).replaceAll('\\','/'),approved:true};
  }
  return fallback||{baseline:null,path:null,approved:false};
}
function gameplaySignals(html=''){
  const text=String(html),js=scripts(text);
  const checks={
    input:/(addEventListener\s*\(|onclick\s*=|pointerdown|pointerup|touchstart|touchend|keydown|keyup)/i.test(text),
    runtimeLoop:/(requestAnimationFrame|setInterval\s*\(|function\s+(?:update|tick|loop)\b|\bupdate\s*\()/i.test(js),
    mutableState:/(\b(?:hp|health|score|wave|level|xp|gold|coins|currency|inventory|enemy|player|progress)\b\s*[=:]|state\s*=)/i.test(js),
    gameplayOutcome:/(victory|defeat|gameover|gameOver|restart|retry|승리|패배|재시작|게임\s*오버)/i.test(text),
    progression:/(upgrade|level|wave|xp|reward|progress|inventory|craft|shop|성장|강화|보상|웨이브|상점|제작)/i.test(text),
    combat:/(attack|damage|enemy|projectile|cooldown|hitbox|combat|공격|데미지|적|투사체|전투)/i.test(text),
    spatial:/(canvas|getBoundingClientRect|offsetX|offsetY|clientX|clientY|collision|velocity|playerX|playerY|data-player-x|data-player-y|pathfinding|route)/i.test(text),
    persistence:/(localStorage|indexedDB|saveGame|saveData|세이브|저장)/i.test(text),
    mobile:/(touchstart|touchend|pointerdown|pointerup|viewport|virtual\s*(?:stick|joystick)|터치|조이스틱)/i.test(text),
    audio:/(AudioContext|webkitAudioContext|new\s+Audio\s*\()/i.test(text)
  };
  return{checks,count:Object.values(checks).filter(Boolean).length};
}
function scopeMetrics(html='',baseline={}){
  const derived=deriveApprovedScopeInventory(baseline||{});
  const inventory=derived.length===1&&clean(derived[0]?.path)==='coreGameplay'&&clean(derived[0]?.label)==='approved core gameplay loop'?[]:derived;
  if(!inventory.length)return{requiredCount:0,boundCount:0,semanticCount:0,coveragePct:100,scopeIds:[]};
  const lower=String(html).toLowerCase();let bound=0,semantic=0;
  for(const item of inventory){
    if(String(html).includes(`data-scope-id="${item.id}"`)||String(html).includes(`data-scope-id='${item.id}'`))bound++;
    const words=tokens(`${item.path} ${item.label}`);if(words.length&&words.some(word=>lower.includes(word)))semantic++;
  }
  return{requiredCount:inventory.length,boundCount:bound,semanticCount:semantic,coveragePct:clamp(Math.max(bound,semantic)/inventory.length*100),scopeIds:inventory.map(x=>x.id)};
}
export const EXISTING_WEB_STRATEGIES=Object.freeze(['KEEP_AND_CONTINUE','PARTIAL_REPAIR','MAJOR_REWORK','FULL_REBUILD']);

export function assessExistingWebSource({html='',baseline={},approvedDesign=false,validationScore=null,sourceExists=true}={}){
  const text=String(html||''),bytes=Buffer.byteLength(text,'utf8'),signals=gameplaySignals(text),scope=scopeMetrics(text,baseline);
  const prototypeMarkers=[/FULL APPROVED WEB COMPANION/i,/검증\s*(?:루프|패널|체크리스트)/i,/data-session-stage=/i,/STATUS:\s*준비/i,/승인\s*분량\s*전체\s*구현/i].filter(re=>re.test(text)).length;
  const score=Number.isFinite(Number(validationScore))?Number(validationScore):null;
  let strategy='MAJOR_REWORK',confidence='MEDIUM',reasons=[];
  const structurallyEmpty=bytes<120&&signals.count===0&&!/<(?:button|canvas|script|main|section)\b/i.test(text);
  if(!sourceExists||structurallyEmpty){strategy='FULL_REBUILD';confidence='HIGH';reasons.push('SOURCE_MISSING_OR_EMPTY');}
  else if(score!=null&&score>=80&&signals.count>=4&&(!scope.requiredCount||scope.coveragePct>=55)){strategy='KEEP_AND_CONTINUE';confidence='HIGH';reasons.push('CURRENT_WEB_VALIDATION_AT_LEAST_80','REAL_GAMEPLAY_SIGNALS_PRESENT','APPROVED_SCOPE_MOSTLY_REPRESENTED');}
  else if(score!=null&&score>=80&&signals.count>=4&&scope.requiredCount&&scope.coveragePct<55){strategy='PARTIAL_REPAIR';confidence='HIGH';reasons.push('CURRENT_WEB_VALIDATION_AT_LEAST_80','REAL_GAMEPLAY_SIGNALS_PRESENT','CURRENT_APPROVED_SCOPE_GAPS_REMAIN');}
  else if(signals.count>=7&&scope.coveragePct>=55&&prototypeMarkers===0){strategy='KEEP_AND_CONTINUE';confidence='HIGH';reasons.push('STRONG_EXISTING_GAMEPLAY','APPROVED_SCOPE_MOSTLY_REPRESENTED');}
  else if(signals.count>=5){strategy='PARTIAL_REPAIR';confidence='HIGH';reasons.push('WORKING_GAMEPLAY_REUSABLE');if(scope.coveragePct<35)reasons.push('APPROVED_SCOPE_GAPS_REMAIN');}
  else if(signals.count>=4||scope.coveragePct>=20){strategy='MAJOR_REWORK';confidence='MEDIUM';reasons.push('REUSABLE_SOURCE_EXISTS','SUBSTANTIAL_GAMEPLAY_OR_SCOPE_GAPS');}
  else if(prototypeMarkers>0&&signals.count<=2&&scope.coveragePct<20&&approvedDesign){strategy='FULL_REBUILD';confidence='HIGH';reasons.push('PROTOTYPE_DOMINANT','REAL_GAMEPLAY_SIGNAL_TOO_LOW','APPROVED_SCOPE_COVERAGE_TOO_LOW','APPROVED_DESIGN_BASELINE_CONFIRMED');}
  else{strategy='MAJOR_REWORK';confidence='LOW';reasons.push('INSUFFICIENT_EVIDENCE_FOR_SAFE_FULL_REBUILD');}
  if(strategy==='FULL_REBUILD'&&sourceExists&&!approvedDesign){strategy='MAJOR_REWORK';confidence='LOW';reasons.push('FULL_REBUILD_BLOCKED_WITHOUT_APPROVED_DESIGN');}
  if(prototypeMarkers>0&&strategy!=='FULL_REBUILD')reasons.push('PROTOTYPE_MARKER_PRESENT_BUT_NOT_DECISIVE');
  if(!approvedDesign)reasons.push('APPROVED_DESIGN_GATE_NOT_PROVEN_IN_LOCAL_SOURCE');
  return{version:1,strategy,confidence,reasons:unique(reasons),preserveExistingSource:strategy!=='FULL_REBUILD',fullRewriteAllowed:strategy==='FULL_REBUILD',evidence:{sourceBytes:bytes,sourceSha256:sha(text),validationScore:score,approvedDesign:Boolean(approvedDesign),gameplaySignalCount:signals.count,gameplaySignals:signals.checks,prototypeMarkerCount:prototypeMarkers,approvedScopeRequiredCount:scope.requiredCount,approvedScopeBoundCount:scope.boundCount,approvedScopeSemanticCount:scope.semanticCount,approvedScopeCoveragePct:scope.coveragePct}};
}
export function assessExistingWebRepository({cwd=process.cwd(),gameId='',sourceRoot='',order={}}={}){
  const root=path.resolve(cwd,sourceRoot),file=path.join(root,'index.html'),sourceExists=fs.existsSync(file)&&fs.statSync(file).isFile();
  const html=sourceExists?fs.readFileSync(file,'utf8'):'',design=latestApprovedDesign(cwd,gameId);
  const assessment=assessExistingWebSource({html,baseline:design.baseline||{},approvedDesign:design.approved,validationScore:evidenceScore(order),sourceExists});
  return{...assessment,gameId:clean(gameId)||null,sourceRoot:clean(sourceRoot)||null,sourcePath:sourceExists?path.relative(cwd,file).replaceAll('\\','/'):null,designBaselinePath:design.path};
}
