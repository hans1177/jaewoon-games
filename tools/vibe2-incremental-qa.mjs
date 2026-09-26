// 파일명: tools/vibe2-incremental-qa.mjs
// 역할: 후보 변경 파일만 먼저 빠르게 검증하고 content hash 기반 PASS 결과를 재사용한다.
// 원칙: impact-first 검사는 full regression을 대체하지 않는다. fan-in/승격 전 기존 전체 QA는 그대로 유지한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { analyzeExistingGameSource } from './company-vibe2-gameplay-intelligence.mjs';
import { buildResponsibilityGraph, summarizeResponsibilityArchitecture, compareResponsibilityArchitecture } from './company-vibe2-expert-development.mjs';
import { diagnoseGame } from './autonomous-diagnostics.mjs';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\','/').replace(/^\.\//,'');
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function readJson(file, fallback = {}) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8'); }
function list(value) { return clean(value).split(',').map(posix).filter(Boolean); }
function sha256(parts) { const h=crypto.createHash('sha256'); for(const part of parts)h.update(part); return h.digest('hex'); }
function assertInside(root, file) {
  const resolved = path.resolve(root, file);
  const base = path.resolve(root) + path.sep;
  if (!(resolved + path.sep).startsWith(base) && resolved !== path.resolve(root)) throw new Error(`QA path escaped root: ${file}`);
  return resolved;
}
function manifestData(manifest=''){return manifest?readJson(manifest,{}):{};}
function resolveManifestRelative(root,data={},relative=''){
  const rel=posix(relative);
  if(!rel)return'';
  const direct=assertInside(root,rel);
  if(fs.existsSync(direct))return rel;
  const sourceRoot=posix(data.sourceRoot);
  if(sourceRoot){
    const scoped=posix(path.posix.join(sourceRoot,rel));
    const file=assertInside(root,scoped);
    if(fs.existsSync(file))return scoped;
  }
  return rel;
}
function collectFiles({root, files, manifest}) {
  if (files.length) return files;
  if (manifest) {
    const data = manifestData(manifest);
    if (Array.isArray(data.changedFiles)) return data.changedFiles.map(relative=>resolveManifestRelative(root,data,relative)).filter(Boolean);
  }
  throw new Error('incremental QA changed files required');
}
function causalReplayPlan(data={}){
  const plan=data?.exploration?.editContract?.causalReplay;
  return plan&&typeof plan==='object'?plan:null;
}
function gameRepairContract(data={}){
  const contract=data?.exploration?.editContract?.gameRepair;
  return contract&&typeof contract==='object'?contract:null;
}
function runRepairNodeTargets({root,data={},targets=[],category='CHECK'}={}){
  const resolved=resolveReplayTargets(root,data,{nodeTestTargets:targets});
  const results=[];
  for(const target of resolved){
    try{
      execFileSync(process.execPath,['--test',target.absolute],{cwd:root,stdio:'pipe',encoding:'utf8'});
      results.push({target:target.relative,outcome:'PASS'});
    }catch(error){
      const wrapped=new Error(`GAME_REPAIR_${category}_FAILED:${target.relative}`);
      wrapped.cause=error;
      throw wrapped;
    }
  }
  return results;
}
function runGameRepairQa({root,data={},causalReplay={}}={}){
  const contract=gameRepairContract(data);
  if(!contract||contract.required!==true)return{
    status:'NOT_REQUIRED',required:false,originalScenarioReplay:'NOT_APPLICABLE',
    invariants:'NOT_APPLICABLE',saveMigration:'NOT_APPLICABLE',multiplayerLifecycle:'NOT_APPLICABLE',
    revisionComparison:'NOT_APPLICABLE',readyForFanIn:true,fullRegressionStillRequired:true
  };
  const scenarioRequired=contract?.originalScenarioReplay?.required!==false;
  const originalScenarioReplay=!scenarioRequired?'NOT_APPLICABLE'
    :causalReplay?.status==='EXECUTED_PASS'&&causalReplay?.executed===true?'PASS':'PENDING_RUNTIME_EVIDENCE';
  const invariantTargets=contract?.invariants?.testTargets||[];
  const invariantResults=invariantTargets.length?runRepairNodeTargets({root,data,targets:invariantTargets,category:'INVARIANT'}):[];
  const invariants=contract?.invariants?.required===false?'NOT_APPLICABLE':invariantResults.length?'PASS':'PENDING_RUNTIME_EVIDENCE';
  const saveRequired=contract?.saveMigration?.required===true;
  const saveResults=saveRequired&&Array.isArray(contract?.saveMigration?.testTargets)&&contract.saveMigration.testTargets.length
    ?runRepairNodeTargets({root,data,targets:contract.saveMigration.testTargets,category:'SAVE_MIGRATION'}):[];
  const saveMigration=saveRequired?(saveResults.length?'PASS':'PENDING_RUNTIME_EVIDENCE'):'NOT_APPLICABLE';
  const multiplayerRequired=contract?.multiplayerLifecycle?.required===true;
  const multiplayerAutomation=contract?.multiplayerLifecycle?.automation&&typeof contract.multiplayerLifecycle.automation==='object'
    ?contract.multiplayerLifecycle.automation:{};
  const multiplayerTargets=Array.isArray(contract?.multiplayerLifecycle?.testTargets)?contract.multiplayerLifecycle.testTargets:[];
  const multiplayerResults=multiplayerRequired&&multiplayerTargets.length
    ?runRepairNodeTargets({root,data,targets:multiplayerTargets,category:'MULTIPLAYER_LIFECYCLE'}):[];
  const autonomousMultiplayerContractValid=!multiplayerRequired||(
    contract?.multiplayerLifecycle?.userAssistanceRequired===false
    &&Number(contract?.multiplayerLifecycle?.minimumPlayers||0)>=2
    &&multiplayerAutomation.required===true
    &&Number(multiplayerAutomation.minimumSyntheticOrRealClients||0)>=2
  );
  const multiplayerLifecycle=!multiplayerRequired?'NOT_APPLICABLE'
    :!autonomousMultiplayerContractValid?'INVALID_AUTOMATION_CONTRACT'
    :multiplayerResults.length?'PASS_AUTOMATED_HARNESS'
    :'PENDING_AUTONOMOUS_HARNESS_EVIDENCE';
  const revisions=contract?.revisions||{};
  const revisionComparison=revisions.lastKnownGoodRevision&&revisions.currentRevision?'READY'
    :(revisions.lastKnownGoodRevision||revisions.firstBrokenRevision||revisions.currentRevision)?'PARTIAL':'NOT_AVAILABLE';
  const readyForFanIn=originalScenarioReplay==='PASS'
    &&invariants==='PASS'
    &&['PASS','NOT_APPLICABLE'].includes(saveMigration)
    &&['PASS_AUTOMATED_HARNESS','NOT_APPLICABLE'].includes(multiplayerLifecycle);
  return{
    status:readyForFanIn?'EVIDENCE_READY_FOR_FULL_REGRESSION':'WAITING_EVIDENCE',
    required:true,
    failureStage:clean(contract.failureStage)||null,
    failureSignature:clean(contract.failureSignature)||null,
    responsibleSystem:clean(contract.responsibleSystem)||null,
    responsibleFiles:Array.isArray(contract.responsibleFiles)?contract.responsibleFiles.map(clean).filter(Boolean):[],
    prePatchReproduced:contract.prePatchReproduced===true,
    originalScenarioReplay,
    invariants,
    invariantResults,
    saveMigration,
    saveResults,
    multiplayerLifecycle,
    multiplayerResults,
    multiplayerAutomation:{
      userAssistanceRequired:false,
      minimumPlayers:Number(contract?.multiplayerLifecycle?.minimumPlayers||0)||null,
      minimumSyntheticOrRealClients:Number(multiplayerAutomation.minimumSyntheticOrRealClients||0)||null,
      machineDrivenScenarios:Array.isArray(multiplayerAutomation.machineDrivenScenarios)?multiplayerAutomation.machineDrivenScenarios.map(clean).filter(Boolean):[],
      actualPlatformRuntimeEvidenceRequiredBeforePlatformSpecificMultiplayerPass:multiplayerAutomation.actualPlatformRuntimeEvidenceRequiredBeforePlatformSpecificMultiplayerPass===true
    },
    repeatCount:Math.max(0,Number(contract.repeatCount||0)||0),
    repairMode:clean(contract.repairMode)||'FOCUSED_REPAIR',
    revisions:{
      lastKnownGoodRevision:clean(revisions.lastKnownGoodRevision)||null,
      firstBrokenRevision:clean(revisions.firstBrokenRevision)||null,
      currentRevision:clean(revisions.currentRevision)||null
    },
    revisionComparison,
    readyForFanIn,
    fullRegressionStillRequired:true,
    unchangedSourceRevalidationForbidden:true,
    authorityExpanded:false
  };
}
function resolveReplayTargets(root,data={},plan={}){
  const sourceRoot=posix(data.sourceRoot);
  const rootResolved=path.resolve(root);
  const sourceResolved=sourceRoot?assertInside(root,sourceRoot):rootResolved;
  const base=sourceResolved+path.sep;
  const targets=[];
  for(const raw of plan.nodeTestTargets||[]){
    const rel=posix(raw);
    if(!rel||!/(?:test|spec|qa)/i.test(rel)||!/\.(?:js|mjs|cjs)$/i.test(rel))continue;
    const candidate=path.resolve(sourceResolved,rel);
    if(!((candidate+path.sep).startsWith(base)&&candidate!==sourceResolved))throw new Error(`CAUSAL_REPLAY_TARGET_ESCAPED_SOURCE_ROOT:${rel}`);
    if(!fs.existsSync(candidate)||!fs.statSync(candidate).isFile())throw new Error(`CAUSAL_REPLAY_TARGET_MISSING:${rel}`);
    targets.push({relative:posix(path.relative(rootResolved,candidate)),absolute:candidate});
  }
  return targets;
}
function runCausalReplay({root,data={}}={}){
  const plan=causalReplayPlan(data);
  if(!plan||plan.required!==true)return{status:'NOT_REQUIRED',executed:false,targets:[],verifiedResponsibleSystem:null,canonicalQaStillRequired:true};
  if(plan.executable!==true)return{status:'PLAN_ONLY',executed:false,reason:clean(plan.status)||'NO_EXECUTABLE_REPLAY',targets:[],verifiedResponsibleSystem:null,canonicalQaStillRequired:true};
  if(plan.prePatchReproduced!==true)throw new Error('CAUSAL_REPLAY_PREPATCH_REPRODUCTION_REQUIRED');
  const mode=clean(plan.mode);
  if(mode==='DIAGNOSTIC_RESCAN'){
    const type=clean(plan.diagnosticType).toUpperCase();
    const file=posix(plan.diagnosticFile);
    const sourceRoot=posix(data.sourceRoot);
    if(!type||!file||!sourceRoot)throw new Error('CAUSAL_REPLAY_DIAGNOSTIC_IDENTITY_REQUIRED');
    const sourceDir=assertInside(root,sourceRoot);
    const report=diagnoseGame(sourceDir,{maxIssues:200});
    const stillPresent=(report.issues||[]).some(row=>clean(row?.type).toUpperCase()===type&&posix(row?.file)===file);
    if(stillPresent){
      const error=new Error(`CAUSAL_REPLAY_DIAGNOSTIC_STILL_PRESENT:${type}:${file}`);
      error.causalReplay={
        status:'EXECUTED_FAIL',executed:true,prePatchReproduced:true,
        targets:[{target:`diagnostic:${type}:${file}`,outcome:'STILL_PRESENT_AFTER_PATCH'}],
        verifiedResponsibleSystem:null,
        verificationMode:'DIAGNOSTIC_EXACT_TYPE_FILE_RESCAN',
        identicalOrEquivalentInputStateRequired:plan.identicalOrEquivalentInputStateRequired!==false,
        canonicalQaStillRequired:true
      };
      throw error;
    }
    return{
      status:'EXECUTED_PASS',executed:true,prePatchReproduced:true,
      targets:[{target:`diagnostic:${type}:${file}`,outcome:'ABSENT_AFTER_PATCH'}],
      verifiedResponsibleSystem:clean(plan.verifiedResponsibleSystem).toUpperCase()||null,
      verificationMode:'DIAGNOSTIC_EXACT_TYPE_FILE_RESCAN',
      identicalOrEquivalentInputStateRequired:plan.identicalOrEquivalentInputStateRequired!==false,
      canonicalQaStillRequired:true
    };
  }
  if(mode!=='NODE_TEST_TARGETS')return{status:'PLAN_ONLY',executed:false,reason:clean(plan.status)||'UNSUPPORTED_REPLAY_MODE',targets:[],verifiedResponsibleSystem:null,canonicalQaStillRequired:true};
  const targets=resolveReplayTargets(root,data,plan);
  if(!targets.length)throw new Error('CAUSAL_REPLAY_EXECUTABLE_WITHOUT_TARGET');
  const results=[];
  for(const target of targets){
    execFileSync(process.execPath,['--test',target.absolute],{cwd:root,stdio:'pipe',encoding:'utf8'});
    results.push({target:target.relative,outcome:'PASS'});
  }
  return{status:'EXECUTED_PASS',executed:true,prePatchReproduced:true,targets:results,verifiedResponsibleSystem:null,identicalOrEquivalentInputStateRequired:plan.identicalOrEquivalentInputStateRequired!==false,canonicalQaStillRequired:true};
}
function architectureSourceText(root,data={}){
  const sourceRoot=posix(data.sourceRoot);
  if(!sourceRoot)return'';
  const sourceDir=assertInside(root,sourceRoot);
  const responsible=(data?.exploration?.responsibleFiles||[]).map(posix).filter(Boolean);
  const rows=[];
  for(const relative of responsible){
    const file=path.resolve(sourceDir,relative);
    const base=path.resolve(sourceDir)+path.sep;
    if(!((file+path.sep).startsWith(base)&&file!==path.resolve(sourceDir)))continue;
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
    if(!/\.(?:html?|js|mjs|cjs)$/i.test(relative))continue;
    rows.push(fs.readFileSync(file,'utf8'));
  }
  return rows.join('\n\n');
}
function runArchitectureDrift({root,data={}}={}){
  const before=data?.exploration?.editContract?.architectureSnapshot;
  if(!before||typeof before!=='object')return{status:'NOT_AVAILABLE',riskLevel:'LOW',score:0,signals:[],hardReject:false,focusedReviewRequired:false};
  const source=architectureSourceText(root,data);
  if(!source.trim())return{status:'NO_RESPONSIBLE_TEXT_SOURCE',riskLevel:'LOW',score:0,signals:[],hardReject:false,focusedReviewRequired:false,before};
  const sourceAnalysis=analyzeExistingGameSource(source);
  const graph=buildResponsibilityGraph({source,sourceAnalysis});
  const after=summarizeResponsibilityArchitecture(graph);
  const comparison=compareResponsibilityArchitecture(before,after);
  return{status:'ANALYZED',...comparison};
}


function checkConflictMarkers(text, file) {
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(text)) throw new Error(`merge conflict marker: ${file}`);
  if (text.includes('\u0000')) throw new Error(`NUL byte in text file: ${file}`);
}
function checkBalanced(text, open, close, file, label) {
  let depth = 0, quote = null, escape = false;
  for (let i=0;i<text.length;i+=1) {
    const ch=text[i];
    if (quote) {
      if (escape) escape=false;
      else if (ch==='\\') escape=true;
      else if (ch===quote) quote=null;
      continue;
    }
    if (ch==='"' || ch==="'") { quote=ch; continue; }
    if (ch===open) depth+=1;
    if (ch===close) depth-=1;
    if (depth<0) throw new Error(`${label} close before open: ${file}`);
  }
  if (depth!==0) throw new Error(`${label} unbalanced: ${file}`);
}
function syntaxFailure(file, error) {
  const detail = String(error?.stderr || error?.message || '').trim();
  return new Error(`SyntaxError in ${file}${detail ? `: ${detail}` : ''}`);
}
function runNodeSyntax(text, inputType) {
  execFileSync(process.execPath,[`--input-type=${inputType}`,'--check'],{
    input:text,
    encoding:'utf8',
    stdio:['pipe','pipe','pipe']
  });
}
function checkNodeSyntax(text, ext, file) {
  if (ext === '.mjs') {
    try { runNodeSyntax(text,'module'); return; }
    catch (error) { throw syntaxFailure(file,error); }
  }
  if (ext === '.cjs') {
    try { runNodeSyntax(text,'commonjs'); return; }
    catch (error) { throw syntaxFailure(file,error); }
  }
  let moduleError;
  try { runNodeSyntax(text,'module'); return; }
  catch (error) { moduleError=error; }
  try { runNodeSyntax(text,'commonjs'); return; }
  catch { throw syntaxFailure(file,moduleError); }
}
function htmlScriptType(attributes='') {
  const match=String(attributes||'').match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))/i);
  return clean(match?.[1]??match?.[2]??match?.[3]??'');
}
function checkHtmlInlineScriptSyntax(text, file) {
  const scriptPattern=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match, scriptIndex=0, checked=0;
  while((match=scriptPattern.exec(text))){
    scriptIndex+=1;
    const attributes=String(match[1]||'');
    const body=String(match[2]||'');
    if(/\bsrc\s*=/i.test(attributes)||!body.trim())continue;
    const type=htmlScriptType(attributes).toLowerCase();
    const executable=!type||type==='module'||/^(?:text|application)\/(?:java|ecma)script(?:\s*;|$)/i.test(type);
    if(!executable)continue;
    try{runNodeSyntax(body,type==='module'?'module':'commonjs');}
    catch(error){throw syntaxFailure(`${file}#script-${scriptIndex}`,error);}
    checked+=1;
  }
  return checked;
}
const GOLDEN_SCENE_RUNTIME_ROLES=Object.freeze(['PLAYER_OR_PRIMARY_CHARACTER_CLOSEUP','PRIMARY_ENEMY_OR_CREATURE_CLOSEUP','CORE_GAMEPLAY_ACTION','WORLD_OR_REGION_WIDE','MOBILE_GAMEPLAY_HUD']);
function presentationContract(data = {}) {
  const contract=data?.presentationQuality;
  return contract&&contract.required===true?contract:null;
}
function weatherPresentationContract(data = {}) {
  const contract=data?.weatherPresentation;
  return contract&&contract.required===true?contract:null;
}
function presentationSourceText(root, changed = []) {
  const rows=[];
  for(const relative of changed){
    const file=assertInside(root,relative);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
    if(!/\.(?:html?|js|mjs|cjs|css|svg|cs|lua|luau|gd|cpp|cc|cxx|h|hpp)$/i.test(relative))continue;
    rows.push(fs.readFileSync(file,'utf8'));
  }
  return rows.join('\n\n');
}
function patternHits(text='',patterns=[]){
  return patterns.reduce((count,re)=>count+(re.test(text)?1:0),0);
}
function specializedVerificationRequest(data={}){
  const request=data?.specializedVerificationRequest;
  return request&&request.required===true?request:null;
}
const SPECIALIZED_FOCUSED_QA_RULES=Object.freeze({
  VERIFIED_GAME_VISUAL_DNA_COMPATIBILITY_PASS:[
    /(?:concept|style.?bible|style.?lock|visual.?dna|art.?direction|컨셉|스타일.?바이블|스타일.?락|비주얼.?DNA|아트.?디렉션)/i,
    /(?:render|draw|material|texture|sprite|mesh|palette|lighting|visual|렌더|재질|텍스처|스프라이트|메시|팔레트|조명)/i
  ],
  VERIFIED_WORLD_ROUTE_NAVIGATION_PASS:[
    /(?:route|path|navigation|navmesh|pathfind|map.?dna|road|길|경로|동선|내비|맵.?DNA)/i,
    /(?:objective|spawn|landmark|shortcut|reachab|region|목표|스폰|랜드마크|지름길|도달|지역)/i
  ],
  VERIFIED_STREAMING_MOBILE_BUDGET_PASS:[
    /(?:stream|chunk|cell|lod|prewarm|pool|스트리밍|청크|셀|프리워밍|풀링)/i,
    /(?:budget|mobile|performance|distance|relevance|memory|frame|예산|모바일|성능|거리|메모리|프레임)/i
  ],
  VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS:[
    /(?:story|narrative|plot|phase|chapter|스토리|서사|플롯|단계|챕터)/i,
    /(?:transition|cause|event|prerequisite|consequence|state|전이|원인|이벤트|선행|결과|상태)/i
  ],
  VERIFIED_QUEST_GRAPH_PASS:[
    /(?:quest|mission|objective|퀘스트|미션|목표)/i,
    /(?:graph|dependency|prerequisite|complete|unlock|consequence|그래프|의존|선행|완료|해금|결과)/i
  ],
  VERIFIED_CHARACTER_PERSONA_VOICE_MEMORY_PASS:[
    /(?:persona|voice|personality|temperament|speech|페르소나|말투|성격|기질|화법)/i,
    /(?:memory|relationship|trust|fear|behavior|knowledge|기억|관계|신뢰|두려움|행동|지식)/i
  ],
  VERIFIED_WORLD_NARRATIVE_STATE_PASS:[
    /(?:world.?state|faction|region|landmark|environmental.?story|월드.?상태|세력|지역|랜드마크|환경.?스토리)/i,
    /(?:story|narrative|quest|dialogue|save|state|스토리|서사|퀘스트|대사|저장|상태)/i
  ]
});
function runSpecializedFocusedQa({root,data={},changed=[]}={}){
  const request=specializedVerificationRequest(data);
  if(!request)return{status:'NOT_REQUIRED',requestedMarkers:[],results:{},finalMarkerAuthority:'FAN_IN_ONLY',runtimeStillRequired:false,authorityExpanded:false};
  const requested=[...new Set((request.requestedMarkers||[]).map(clean).filter(Boolean))];
  const text=presentationSourceText(root,changed);
  if(!text.trim())throw new Error('SPECIALIZED_FOCUSED_QA_SOURCE_REQUIRED');
  const results={};
  const failed=[];
  for(const marker of requested){
    const rules=SPECIALIZED_FOCUSED_QA_RULES[marker]||[];
    const checks=rules.map((re,index)=>({name:`STRUCTURAL_SIGNAL_${index+1}`,pass:re.test(text)}));
    const pass=rules.length>=2&&checks.every(row=>row.pass);
    results[marker]={pass,checks,staticOnly:true};
    if(!pass)failed.push(marker);
  }
  const pass=failed.length===0;
  return{
    status:pass?'FOCUSED_STATIC_PASS':'FOCUSED_STATIC_NOT_VERIFIED',
    requestedMarkers:requested,
    failedMarkers:failed,
    results,
    finalMarkerAuthority:'FAN_IN_ONLY',
    finalVerifiedMarkers:[],
    learningPromotionBlocked:!pass,
    gameReleaseBlockedBySpecializedQa:false,
    fullRegressionStillRequired:true,
    nativeRuntimeStillRequired:request.nativeRuntimeRequired===true,
    runtimeStillRequired:true,
    markerOnlyPassForbidden:true,
    authorityExpanded:false
  };
}
function robloxCharacterMotionStaticEvidence(text=''){
  const source=String(text||'');
  const customActorFactory=/(?:humanoidFigure|figure|create\w*(?:Npc|NPC|Enemy|Monster|Creature|Character)|build\w*(?:Npc|NPC|Enemy|Monster|Creature|Character))\s*\(/i.test(source);
  const customModel=/Instance\.new\s*\(\s*["']Model["']\s*\)/i.test(source);
  const humanoidCreated=/Instance\.new\s*\(\s*["']Humanoid["']\s*\)|Instance\.new\s*\(\s*["']AnimationController["']\s*\)/i.test(source);
  const namedLimbs={
    arm:/(?:UpperArm|LowerArm|RightArm|LeftArm|ArmL|ArmR|Shoulder|Hand)/i.test(source),
    leg:/(?:UpperLeg|LowerLeg|RightLeg|LeftLeg|LegL|LegR|Foot|Boot)/i.test(source),
    torso:/(?:UpperTorso|LowerTorso|Torso|Chest|Waist|Pelvis)/i.test(source),
    head:/(?:\bHead\b|RPGHead|NpcHead|EnemyHead|MonsterHead)/i.test(source)
  };
  const limbFamilies=Object.values(namedLimbs).filter(Boolean).length;
  const characterTerms=/(?:character|player|npc|enemy|monster|boss|creature|humanoid|villager|resident)/i.test(source);
  const customArticulatedIntent=humanoidCreated||customActorFactory||(customModel&&characterTerms&&limbFamilies>=2);
  const nativePlayerRigIntent=!customArticulatedIntent&&/(?:CharacterAdded|LocalPlayer|player\.Character|HumanoidRootPart)/.test(source)&&/Humanoid/.test(source);
  const articulation=/(?:Motor6D|\bBone\b|UpperTorso|LowerTorso|LeftUpperArm|RightUpperArm|LeftUpperLeg|RightUpperLeg)/.test(source);
  const animator=/(?:Animator|AnimationController|AnimationTrack|LoadAnimation|WaitForChild\s*\(\s*["']Animate["'])/.test(source);
  const jointMotion=/(?:AnimationTrack|LoadAnimation|:Play\s*\(|AdjustWeight\s*\(|(?:Motor6D|Bone)[\s\S]{0,900}\.Transform\s*=|\.Transform\s*=\s*CFrame)/i.test(source);
  const rootMotion=/(?:\.CFrame\s*=|:PivotTo\s*\(|PrimaryPartCFrame|SetPrimaryPartCFrame)/.test(source);
  const weldConstraint=/WeldConstraint/.test(source);
  const blend=/(?:AdjustWeight\s*\(|:Play\s*\(\s*\.?\d|:Stop\s*\(\s*\.?\d|cross.?fade|fadeTime|blend)/i.test(source);
  const speedSync=/(?:AdjustSpeed\s*\(|PlaybackSpeed\s*=|WalkSpeed[\s\S]{0,500}(?:AnimationTrack|AdjustSpeed)|(?:speed|velocity)[\s\S]{0,500}AdjustSpeed)/i.test(source);
  const ik=/(?:IKControl|FootIK|foot.?ik|ground.?normal|pelvis.?height|spine.?lean|head.?gaze)/i.test(source);
  const articulatedExpected=customArticulatedIntent===true;
  const rootOnly=articulatedExpected&&rootMotion&&!jointMotion;
  const weldOnly=articulatedExpected&&weldConstraint&&!articulation;
  return Object.freeze({
    articulatedExpected,
    customArticulatedIntent,
    nativePlayerRigIntent,
    articulation,
    animator,
    jointMotion,
    rootMotion,
    weldConstraint,
    blend,
    speedSync,
    ik,
    rootOnly,
    weldOnly
  });
}

function runPresentationStaticQa({root,data={},changed=[]}={}){
  const contract=presentationContract(data);
  if(!contract)return{status:'NOT_REQUIRED',pass:null,checks:[],runtimeStillRequired:false,authorityExpanded:false};
  const pass=clean(contract.pass).toUpperCase();
  const target=clean(contract.target||data?.target).toLowerCase();
  const text=presentationSourceText(root,changed);
  if(!text.trim())throw new Error(`PRESENTATION_QA_SOURCE_REQUIRED:${pass}`);
  const checks=[],issues=[];
  const require=(name,ok)=>{checks.push({name,pass:Boolean(ok)});if(!ok)issues.push(name);};
  if(pass==='ASSET_ADAPTATION'){
    require('STYLE_SURFACE',/(?:fillStyle|strokeStyle|classList|style\.|--[\w-]+\s*:|background|linear-gradient|radial-gradient|material|texture|sprite)/i.test(text));
    require('RENDER_OR_VISUAL_OWNER',/(?:canvas|getContext\(|render|draw|sprite|mesh|visual|style)/i.test(text));
    if(target==='web'){
      const realAssetBindings=patternHits(text,[
        /drawImage\s*\(/i,
        /new\s+Image\s*\(/i,
        /<img\b/i,
        /background(?:-image)?\s*:\s*url\s*\(/i,
        /(?:src|href)\s*=\s*["'][^"']+\.(?:png|webp|jpg|jpeg|svg)/i,
        /\b(?:sprite|spritesheet|texture|atlas)\b/i
      ]);
      const webIdentityDomains=patternHits(text,[
        /\b(?:player|character|hero|npc|enemy|monster|boss|creature|avatar)\b/i,
        /\b(?:weapon|sword|blade|spear|axe|hammer|bow|staff|shield|tool|item|equipment|armor)\b/i,
        /\b(?:background|terrain|ground|tree|rock|plant|building|environment|sky|fog|biome|forest|village|dungeon|island)\b/i,
        /\b(?:palette|style.?lock|outline|shadow|lighting|gradient|material|theme|visual.?language)\b/i
      ]);
      const primitiveCalls=(text.match(/ctx\.(?:arc|fillRect|strokeRect|ellipse)\s*\(/gi)||[]).length;
      require('WEB_REAL_ASSET_BINDING',realAssetBindings>=2);
      require('WEB_GAME_VISUAL_IDENTITY_DOMAINS',webIdentityDomains>=3);
      require('WEB_NO_PRIMITIVE_ONLY_SCENE',primitiveCalls===0||realAssetBindings>=2);
    }
    if(target==='unity'||target==='roblox'){
      const nativeComposition=target==='unity'
        ?patternHits(text,[
          /GameObject\.CreatePrimitive\s*\(/i,
          /new\s+GameObject\s*\(/i,
          /(?:Instantiate|Resources\.Load|Addressables\.)\s*[<(]/i,
          /\b(?:MeshFilter|MeshRenderer|SkinnedMeshRenderer|SpriteRenderer)\b/i,
          /transform\.(?:SetParent|localScale|localPosition|localRotation)|\.transform\./i,
          /\b(?:Material|Shader|Renderer|Light)\b/i
        ])
        :patternHits(text,[
          /Instance\.new\s*\(\s*["'](?:Part|MeshPart|Model|Attachment|Bone)["']\s*\)/i,
          /\b(?:MeshPart|SpecialMesh|SurfaceAppearance|TextureID|MeshId)\b/i,
          /\b(?:Clone|FindFirstChild|WaitForChild)\s*\(/i,
          /\.(?:Parent|CFrame|Size|Position|Orientation)\s*=/i,
          /\b(?:WeldConstraint|Motor6D|Attachment|Bone)\b/i,
          /\b(?:Material|Color3|BrickColor|Lighting)\b/i
        ]);
      const singlePrimitiveOnly=target==='unity'
        ?(text.match(/GameObject\.CreatePrimitive\s*\(/gi)||[]).length<=1&&!/(?:new\s+GameObject|Instantiate\s*\(|MeshFilter|SkinnedMeshRenderer|SetParent|sharedMesh)/i.test(text)
        :(text.match(/Instance\.new\s*\(\s*["']Part["']\s*\)/gi)||[]).length<=1&&!/(?:MeshPart|SpecialMesh|Model["']|Attachment|WeldConstraint|Motor6D|SurfaceAppearance|Clone\s*\()/i.test(text);
      require('NATIVE_COMPOSITE_FORM',nativeComposition>=3);
      if(target==='roblox'){
        const coupledVisual=terms=>new RegExp('(?:'+terms+')[\\s\\S]{0,700}(?:Instance\\.new|Clone\\s*\\(|FindFirstChild|WaitForChild|Color3|BrickColor|Material|SurfaceAppearance|CFrame|\\.Size\\b|\\.Position\\b)|(?:Instance\\.new|Clone\\s*\\(|FindFirstChild|WaitForChild|Color3|BrickColor|Material|SurfaceAppearance|CFrame|\\.Size\\b|\\.Position\\b)[\\s\\S]{0,700}(?:'+terms+')','i').test(text);
        const requiredVisualDomains={
          CHARACTER_ENEMY:coupledVisual('head|torso|body|arm|leg|hand|foot|character|player|enemy|monster|npc|creature'),
          WEAPON_EQUIPMENT:coupledVisual('weapon|sword|blade|spear|axe|hammer|bow|staff|shield|gun|claw|fang|equipment|armor'),
          ENVIRONMENT_TERRAIN:coupledVisual('terrain|ground|tree|rock|plant|building|environment|sky|fog|biome|forest|village|dungeon'),
          MATERIAL_COLOR_STYLE:/(?:Color3|BrickColor|Material|SurfaceAppearance|UIGradient|Lighting|palette|style.?lock|gradient)/i.test(text)
        };
        for(const [domain,present] of Object.entries(requiredVisualDomains))require('ROBLOX_VISUAL_DOMAIN_'+domain,present);
        require('GAME_VISUAL_IDENTITY_DOMAINS',Object.values(requiredVisualDomains).every(Boolean));
        require('NO_SINGLE_PRIMITIVE_PLACEHOLDER',!singlePrimitiveOnly);
        const motionDriver=/(?:TweenService|RenderStepped|Heartbeat|Animator|AnimationTrack|Motor6D|Bone)/i.test(text);
        const motionMutation=/(?:TweenService[\s\S]{0,1200}(?:CFrame|Transform|Position|Orientation)\s*=|(?:RenderStepped|Heartbeat)[\s\S]{0,1200}\.(?:CFrame|Transform|Position|Orientation)\s*=|(?:Motor6D|Bone)[\s\S]{0,800}\.Transform\s*=|\.(?:CFrame|Transform|Position|Orientation)\s*=\s*(?:CFrame|Vector3|UDim2|[^\n;]+[+*\-]))/i.test(text);
        require('ROBLOX_NATIVE_MOTION_DRIVER',motionDriver);
        require('ROBLOX_NATIVE_TRANSFORM_MUTATION',motionMutation);
        const characterMotion=robloxCharacterMotionStaticEvidence(text);
        if(characterMotion.articulatedExpected){
          require('ROBLOX_CHARACTER_ARTICULATION',characterMotion.articulation);
          require('ROBLOX_CHARACTER_ANIMATOR',characterMotion.animator);
          require('ROBLOX_CHARACTER_JOINT_MOTION',characterMotion.jointMotion);
          require('ROBLOX_CHARACTER_BLEND',characterMotion.blend);
          require('ROBLOX_CHARACTER_SPEED_SYNC',characterMotion.speedSync);
          require('ROBLOX_NO_WELD_ONLY_ARTICULATED_BODY',!characterMotion.weldOnly);
          require('ROBLOX_NO_ROOT_ONLY_MANNEQUIN_MOTION',!characterMotion.rootOnly);
          if(characterMotion.weldOnly||characterMotion.rootOnly||!characterMotion.articulation||!characterMotion.animator||!characterMotion.jointMotion){
            require('CHARACTER_MOTION_MANNEQUIN',false);
          }
        }
      }else{
        const identityDomains=patternHits(text,[
          /\b(?:head|torso|body|arm|leg|hand|foot|character|player|enemy|monster|npc|creature)\b/i,
          /\b(?:weapon|sword|blade|spear|axe|hammer|bow|staff|shield|gun|claw|fang)\b/i,
          /\b(?:terrain|ground|tree|rock|plant|building|environment|sky|fog|lighting|biome|forest|village|dungeon)\b/i,
          /\b(?:palette|style.?lock|material|shader|outline|roughness|metallic|emission|color3|gradient)\b|Color\s*\(/i
        ]);
        require('GAME_VISUAL_IDENTITY_DOMAINS',identityDomains>=3);
        require('NO_SINGLE_PRIMITIVE_PLACEHOLDER',!singlePrimitiveOnly);
      }
    }
  }else if(pass==='LIVING_MOTION'){
    require('CONTINUOUS_UPDATE',/(?:requestAnimationFrame|setInterval|Update\s*\(|_process\s*\(|Heartbeat|RenderStepped)/i.test(text));
    require('SMOOTH_INTERPOLATION',/(?:lerp|damp|spring|ease|interpol|Math\.sin|smoothstep|velocity|accel|decel)/i.test(text));
    require('MOTION_STATE',/(?:idle|walk|run|speed|velocity|rotation|turn|breath|bob|sway)/i.test(text));
    if(target==='unity'||target==='roblox'){
      require('NATIVE_ACTOR_MOTION_OWNER',target==='unity'
        ?/(?:Animator|AnimationClip|SkinnedMeshRenderer|Transform|Bone|Quaternion|localRotation|localPosition)/i.test(text)
        :/(?:Animator|AnimationTrack|Motor6D|Bone|CFrame|Transform|TweenService)/i.test(text));
      require('SECONDARY_MOTION_SIGNAL',/(?:weapon|arm|hand|head|hair|tail|wing|cloak|cape|accessory|ornament)[\s\S]{0,800}(?:lerp|damp|spring|sway|bob|follow|lag|rotation|cframe|quaternion)|(?:lerp|damp|spring|sway|bob|follow|lag)[\s\S]{0,800}(?:weapon|arm|hand|head|hair|tail|wing|cloak|cape|accessory|ornament)/i.test(text));
      if(target==='roblox'){
        const characterMotion=robloxCharacterMotionStaticEvidence(text);
        if(characterMotion.articulatedExpected){
          require('ROBLOX_CHARACTER_ARTICULATION',characterMotion.articulation);
          require('ROBLOX_CHARACTER_ANIMATOR',characterMotion.animator);
          require('ROBLOX_CHARACTER_JOINT_MOTION',characterMotion.jointMotion);
          require('ROBLOX_CHARACTER_BLEND',characterMotion.blend);
          require('ROBLOX_CHARACTER_SPEED_SYNC',characterMotion.speedSync);
          require('ROBLOX_NO_WELD_ONLY_ARTICULATED_BODY',!characterMotion.weldOnly);
          require('ROBLOX_NO_ROOT_ONLY_MANNEQUIN_MOTION',!characterMotion.rootOnly);
          if(characterMotion.weldOnly||characterMotion.rootOnly||!characterMotion.articulation||!characterMotion.animator||!characterMotion.jointMotion){
            require('CHARACTER_MOTION_MANNEQUIN',false);
          }
        }
      }
    }
  }else if(pass==='ANIMATION_FEEL'){
    const hit=patternHits(text,[/anticipat/i,/hit.?stop|freeze.?frame/i,/recoil/i,/recover(?:y)?/i,/overshoot|settle/i,/smear|trail|afterimage/i,/squash|stretch/i]);
    require('IMPACT_SEQUENCE_SIGNALS',hit>=2);
    require('IMPACT_OR_ACTION_EVENT',/(?:impact|hit|attack|interact|damage|collision)/i.test(text));
  }else if(pass==='VFX'){
    const hit=patternHits(text,[/particle/i,/trail/i,/afterimage/i,/flash/i,/shake/i,/impact/i,/glow/i,/shockwave/i,/spark/i,/dust/i,/telegraph/i]);
    require('VFX_FEEDBACK_VARIETY',hit>=2);
    require('BOUNDED_EFFECT_LIFETIME',/(?:life|ttl|duration|remove|splice|filter|pool|maxParticles|maxEffects|cap)/i.test(text));
  }else if(pass==='AUDIO_FEEL'){
    if(target==='web'){
      require('AUDIO_RUNTIME',/(?:AudioContext|webkitAudioContext|new\s+Audio\s*\(|createGain|createOscillator)/i.test(text));
      require('USER_GESTURE_UNLOCK',/(?:pointerdown|touchstart|click|keydown|mousedown)/i.test(text));
      require('MUTE_CONTROL',/(?:mute|muted)/i.test(text));
      require('VOLUME_CONTROL',/(?:volume|gain)/i.test(text));
      require('DUPLICATE_RESUME_GUARD',/(?:visibilitychange|pagehide|pageshow|resume|suspend|audioState|musicState|currentTrack)/i.test(text));
    }else if(target==='unity'){
      require('UNITY_AUDIO_RUNTIME',/(?:AudioSource|AudioMixer|AudioClip|PlayOneShot|\.Play\s*\(|\.Stop\s*\()/i.test(text));
      require('UNITY_MIX_OR_VOLUME_CONTROL',/(?:AudioMixer|SetFloat\s*\(|volume\s*=|mute\s*=)/i.test(text));
      require('UNITY_STATE_DRIVEN_AUDIO',/(?:combat|boss|explore|ambient|reward|musicState|currentTrack|OnEnable|sceneLoaded)/i.test(text));
      require('UNITY_DUPLICATE_PLAYBACK_GUARD',/(?:isPlaying|DontDestroyOnLoad|singleton|Instance\s*==|currentTrack|Stop\s*\()/i.test(text));
    }else if(target==='roblox'){
      require('ROBLOX_AUDIO_RUNTIME',/(?:SoundService|Instance\.new\s*\(\s*["']Sound["']|:Play\s*\(|:Stop\s*\()/i.test(text));
      require('ROBLOX_MIX_OR_VOLUME_CONTROL',/(?:Volume\s*=|PlaybackSpeed\s*=|SoundGroup|RespectFilteringEnabled)/i.test(text));
      require('ROBLOX_STATE_DRIVEN_AUDIO',/(?:combat|boss|explore|ambient|reward|musicState|currentTrack|RemoteEvent|AttributeChanged)/i.test(text));
      require('ROBLOX_DUPLICATE_PLAYBACK_GUARD',/(?:IsPlaying|Playing|FindFirstChild\s*\(|currentTrack|:Stop\s*\()/i.test(text));
    }else{
      require('AUDIO_TARGET_SUPPORTED',false);
    }
    require('AUDIO_EVENT_BINDING',/(?:impact|hit|attack|reward|quest|purchase|craft|combat|boss|ambient|musicState|currentTrack)/i.test(text));
  }else if(pass==='CAMERA_LANGUAGE'){
    require('CAMERA_OWNER',/(?:camera|viewport|viewOffset|screenShake|cameraShake)/i.test(text));
    require('SMOOTH_CAMERA_RESPONSE',/(?:shake|zoom|lerp|ease|damp|offset|scale|follow)/i.test(text));
  }else if(pass==='POLISH_MOBILE'){
    require('MOBILE_INPUT',/(?:pointer|touch|virtual.?stick|joystick|UserInputService|ContextActionService|TouchEnabled|Input\.touch|Touchscreen|InputSystem)/i.test(text));
    require('FRAME_LOOP_OR_STABLE_RENDER',/(?:requestAnimationFrame|RenderStepped|Heartbeat|Update\s*\(|_process\s*\()/i.test(text));
    require('PRESENTATION_BUDGET_OR_LIFECYCLE',/(?:pool|maxParticles|maxEffects|devicePixelRatio|visibilitychange|pagehide|cleanup|dispose|remove|Destroy\s*\(|Debris|ttl|duration)/i.test(text));
    require('PRESENTATION_CONTRACT_MARKER',/(?:data-presentation-quality-version=["']1["']|PresentationQualityVersion\s*=\s*1|PRESENTATION_QUALITY_VERSION\s*=\s*1)/i.test(text));
  }
  if(issues.length)throw new Error(`PRESENTATION_STATIC_QA_FAILED:${pass}:${issues.join('|')}`);
  return{
    status:'STATIC_PASS',
    pass,
    checks,
    runtimeStillRequired:true,
    runtimeChecks:Array.isArray(contract.runtimeChecks)?contract.runtimeChecks.map(clean).filter(Boolean):[],
    goldenSceneRuntimeEvidenceRequired:target==='roblox'&&['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','CAMERA_LANGUAGE','POLISH_MOBILE'].includes(pass),
    goldenSceneRoles:Object.freeze(GOLDEN_SCENE_RUNTIME_ROLES.slice()),
    markerOnlyPresentationPassForbidden:true,
    primaryActorPrimitivePlaceholderForbiddenAfterPrototype:target==='roblox',
    gameplaySemanticsPreservationRequired:true,
    authorityExpanded:false
  };
}

const UNIVERSAL_ASSET_FAMILIES=Object.freeze(['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP']);
function robloxSourceTreeText(root,data={},changed=[]){
  let sourceRoot=posix(data?.sourceRoot);
  if(!sourceRoot){
    const hit=(changed||[]).map(posix).find(value=>/^roblox-games\/[^/]+\//.test(value));
    if(hit)sourceRoot=hit.split('/').slice(0,2).join('/');
  }
  if(!sourceRoot)return presentationSourceText(root,changed);
  const base=assertInside(root,sourceRoot);
  if(!fs.existsSync(base)||!fs.statSync(base).isDirectory())return presentationSourceText(root,changed);
  const rows=[];let bytes=0;
  const visit=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()){visit(file);continue;}
      if(!/\.(?:lua|luau)$/i.test(entry.name))continue;
      const content=fs.readFileSync(file,'utf8');
      bytes+=Buffer.byteLength(content,'utf8');
      if(bytes>2_000_000)continue;
      rows.push(content);
    }
  };
  visit(base);
  return rows.join('\n\n');
}
function robloxAssetFamilySignals(text=''){
  const source=String(text||'');
  return Object.freeze({
    CHARACTER:/(?:CharacterAdded|player\.Character|Instance\.new\s*\(\s*["']Humanoid["']|Name\s*=\s*["'](?:Player|Character|NPC|Npc|Villager|Resident))/i.test(source),
    CREATURE:/(?:Name\s*=\s*["'](?:Enemy|Monster|Boss|Creature|Zombie|Goblin|Wolf|Spider|Beetle|Ant|Bear|Shark)|create\w*(?:Enemy|Monster|Boss|Creature)\s*\()/i.test(source),
    BUILDING:/(?:Name\s*=\s*["'](?:Village|House|School|Shop|Building|Temple|Castle|Dungeon|Wall|Roof|Door|Warehouse|Hospital|PoliceStation)|create\w*(?:Building|House|School|Shop|Village)\s*\()/i.test(source),
    ENVIRONMENT:/(?:workspace\.Terrain|Terrain:|Lighting|Atmosphere|Sky|Name\s*=\s*["'](?:Tree|Rock|Ground|Terrain|Environment|Forest|Jungle|Snow|Water|Lake|Road|Path))/i.test(source),
    WEAPON:/(?:Instance\.new\s*\(\s*["']Tool["']|Name\s*=\s*["'](?:Weapon|Sword|Axe|Spear|Hammer|Bow|Crossbow|Gun|Staff|Shield))/i.test(source),
    SKILL:/(?:Name\s*=\s*["'](?:Skill|Spell|Projectile|Telegraph|Cast|Ability)|create\w*(?:Skill|Spell|Projectile|Ability)\s*\()/i.test(source),
    MATERIAL:/(?:\.Material\s*=|SurfaceAppearance|TextureID|MeshId|Color3\.(?:fromRGB|new)\s*\()/i.test(source),
    AUDIO:/(?:Instance\.new\s*\(\s*["']Sound["']|\.SoundId\s*=|\bSoundService\b)/i.test(source),
    VFX:/(?:ParticleEmitter|Trail|Beam|PointLight|SpotLight|SurfaceLight)/i.test(source),
    UI:/(?:ScreenGui|BillboardGui|SurfaceGui|TextButton|ImageButton|ImageLabel|TextLabel|ScrollingFrame)/i.test(source),
    MOTION:/(?:Animator|AnimationTrack|LoadAnimation|Motor6D|\bBone\b|TweenService|RenderStepped)/i.test(source),
    PROP:/(?:Name\s*=\s*["'](?:Chest|Crate|Barrel|Chair|Table|Bed|Shelf|Bench|Lamp|Lantern|Sign|Signpost|Torch|Banner|Rug|Book|Workbench|Furnace|Anvil|Cart))/i.test(source)
  });
}
function robloxStudioAssetBindingContract(data={}){
  const loadout=data?.assetProduction?.baseMaterialLoadout;
  const handoff=loadout?.robloxSelectionHandoff;
  if(clean(data?.target).toLowerCase()!=='roblox'||handoff?.handoffRequired!==true||handoff?.downstreamApplicationRequired!==true)return null;
  return loadout;
}
function runRobloxStudioAssetBindingQa({root,data={},changed=[]}={}){
  const loadout=robloxStudioAssetBindingContract(data);
  if(!loadout)return{status:'NOT_REQUIRED',checks:[],runtimeStillRequired:false,authorityExpanded:false};
  const text=presentationSourceText(root,changed);
  const fullText=robloxSourceTreeText(root,data,changed);
  if(!text.trim())throw new Error('ROBLOX_STUDIO_ASSET_BINDING_SOURCE_REQUIRED');
  const checks=[],issues=[];
  const require=(name,ok)=>{checks.push({name,pass:Boolean(ok)});if(!ok)issues.push(name);};
  const atoms=Object.values(loadout.families||{}).flat().map(clean).filter(Boolean);
  const selectionBody=text.match(/\bSTUDIO_ASSET_SELECTION\s*=\s*\{([\s\S]*?)\}/)?.[1]||'';
  const selectedAtoms=[...selectionBody.matchAll(/["']([A-Z][A-Z0-9_]{2,})["']/g)].map(match=>clean(match[1])).filter(Boolean);
  const selectedSet=new Set(selectedAtoms);
  const atomBound=atoms.length>0&&atoms.every(atom=>selectedSet.has(atom));
  const statusBody=text.match(/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{([\s\S]*?)\}/)?.[1]||'';
  const familyStatus={};
  for(const match of statusBody.matchAll(/\b([A-Z][A-Z0-9_]*)\s*=\s*["'](APPLIED|NOT_APPLICABLE)["']/g))familyStatus[clean(match[1])]=clean(match[2]);
  const allFamiliesAccounted=UNIVERSAL_ASSET_FAMILIES.every(family=>['APPLIED','NOT_APPLICABLE'].includes(familyStatus[family]));
  const runtimeObservable=/SetAttribute\s*\(\s*["']StudioAssetBindingVersion["']\s*,\s*STUDIO_ASSET_BINDING_VERSION\s*\)/.test(text)
    &&/SetAttribute\s*\(\s*["']StudioAssetAtoms["']\s*,\s*table\.concat\s*\(\s*STUDIO_ASSET_SELECTION\s*,\s*["'],["']\s*\)\s*\)/.test(text);
  const nativeSignals=patternHits(fullText,[
    /Instance\.new\s*\(/i,
    /\b(?:MeshPart|SpecialMesh|SurfaceAppearance|ParticleEmitter|Trail|Beam|Attachment|WeldConstraint|Motor6D|ScreenGui|Frame|TextButton|ImageButton|Sound)\b/i,
    /\.(?:Material|Color|BrickColor|TextureID|MeshId|CFrame|Size|Position|Orientation)\s*=/i,
    /Color3\.(?:fromRGB|new)\s*\(/i
  ]);
  const familySignals=robloxAssetFamilySignals(fullText);
  require('ROBLOX_STUDIO_ASSET_BINDING_VERSION',/\bSTUDIO_ASSET_BINDING_VERSION\s*=\s*2\b/.test(text));
  require('ROBLOX_STUDIO_ASSET_SELECTION_MANIFEST',selectedAtoms.length>0);
  require('ROBLOX_SELECTED_ATOM_TRACE',atomBound);
  require('ROBLOX_ASSET_FAMILY_STATUS_ALL_12',allFamiliesAccounted);
  require('ROBLOX_RUNTIME_OBSERVABLE_SELECTION',runtimeObservable);
  require('ROBLOX_NATIVE_VISUAL_BINDING',nativeSignals>=3);
  for(const family of UNIVERSAL_ASSET_FAMILIES){
    const status=familyStatus[family];
    if(status==='APPLIED')require('ROBLOX_ASSET_FAMILY_APPLIED_'+family,familySignals[family]===true);
    if(status==='NOT_APPLICABLE'&&familySignals[family]===true)require('ROBLOX_ASSET_FAMILY_NOT_APPLICABLE_VALID_'+family,false);
  }
  require('ROBLOX_MAP_ENVIRONMENT_ASSET_APPLIED',familyStatus.ENVIRONMENT==='APPLIED'&&familySignals.ENVIRONMENT===true);
  require('ROBLOX_MAP_PROP_ASSET_APPLIED',familyStatus.PROP==='APPLIED'&&familySignals.PROP===true);
  if(familySignals.BUILDING===true)require('ROBLOX_MAP_BUILDING_ASSET_APPLIED',familyStatus.BUILDING==='APPLIED');
  require('ROBLOX_MARKER_ONLY_FORBIDDEN',nativeSignals>=3&&atomBound&&runtimeObservable&&allFamiliesAccounted);
  if(issues.length)throw new Error(`ROBLOX_STUDIO_ASSET_BINDING_QA_FAILED:${issues.join('|')}`);
  return{
    status:'STATIC_PASS',checks,selectedAtomCount:atoms.length,runtimeStillRequired:true,
    requiredRuntimeEvidence:'ROBLOX_STUDIO_ASSET_RUNTIME_BINDING_PASS',
    companyAssetPromotionBlockedUntilRuntime:true,masteryPromotionBlockedUntilRuntime:true,
    selectionHandoffVerified:true,plannerSourceMutationForbidden:loadout?.robloxSelectionHandoff?.plannerSourceMutationForbidden===true,
    universalAssetFirst:true,allTwelveFamiliesAccounted:true,familyStatus,
    mapEnvironmentAssetCoverage:true,markerOnlyBindingForbidden:true,gameplaySemanticsPreservationRequired:true,authorityExpanded:false
  };
}
function runWeatherPresentationStaticQa({root,data={},changed=[]}={}){
  const contract=weatherPresentationContract(data);
  if(!contract)return{status:'NOT_REQUIRED',checks:[],runtimeStillRequired:false,authorityExpanded:false};
  const text=presentationSourceText(root,changed);
  if(!text.trim())throw new Error('WEATHER_PRESENTATION_QA_SOURCE_REQUIRED');
  const target=clean(contract.target||data?.target).toLowerCase();
  const checks=[],issues=[];
  const require=(name,ok)=>{checks.push({name,pass:Boolean(ok)});if(!ok)issues.push(name);};
  require('WEATHER_VERSION_MARKER',/(?:WEATHER_PRESENTATION_VERSION\s*=\s*1|WeatherPresentationVersion\s*=\s*1)/i.test(text));
  for(const state of ['CLEAR','RAIN','FOG','SNOW','STORM'])require('WEATHER_STATE_'+state,new RegExp('\\b'+state+'\\b','i').test(text));
  require('WEATHER_STATE_OWNER',/(?:weatherState|weather\.kind|weatherKind|currentWeather|WeatherState|WeatherKind|authoritativeWeather|weather\s*=)/i.test(text));
  require('WEATHER_TRANSITION_OR_UPDATE',/(?:setWeather|weatherTick|UpdateWeather|ApplyWeather|SetWeather|nextWeather|transition|changedAt|nextAt)/i.test(text));
  require('WEATHER_PERFORMANCE_BUDGET',/(?:particle.*(?:budget|cap|max|density)|effect.*density|deviceMemory|hardwareConcurrency|lowEnd|qualityLevel|performance|MaxParticles|Emission|RateOverTime)/i.test(text));
  require('WEATHER_PRESENTATION_ONLY_SIGNAL',/(?:presentation|visual|particle|fog|atmosphere|lighting|colorcorrection|weather)/i.test(text));
  if(target==='web'){
    require('WEB_WEATHER_RENDER',/(?:canvas|getContext\(|fillRect|Particle|CSS|classList|AudioContext|WebAudio|drawWeather|weatherOverlay)/i.test(text));
    require('WEB_MULTIPLAYER_WEATHER_BIND',/(?:serializeWorld|world-state|worldState|applyWorldSnapshot|broadcast)[\s\S]{0,1800}weather|weather[\s\S]{0,1800}(?:serializeWorld|world-state|worldState|applyWorldSnapshot|broadcast)/i.test(text));
  }else if(target==='unity'){
    require('UNITY_NATIVE_WEATHER',/(?:ParticleSystem|RenderSettings|fog|Light|Material|AudioSource|Volume|VisualEffect)/i.test(text));
    require('WEB_ASSET_COPY_ABSENT',!/(?:web-games\/|\.svg\b|canvas|getContext\()/i.test(text));
  }else if(target==='roblox'){
    require('ROBLOX_NATIVE_WEATHER',/(?:ParticleEmitter|Atmosphere|Lighting|ColorCorrection|Sound|Beam|Trail)/i.test(text));
    require('WEB_ASSET_COPY_ABSENT',!/(?:web-games\/|\.svg\b|canvas|getContext\()/i.test(text));
  }
  if(issues.length)throw new Error(`WEATHER_PRESENTATION_STATIC_QA_FAILED:${issues.join('|')}`);
  return{
    status:'STATIC_PASS',
    checks,
    runtimeStillRequired:true,
    runtimeChecks:Array.isArray(contract.runtimeChecks)?contract.runtimeChecks.map(clean).filter(Boolean):[],
    multiplayerRuntimeEvidenceRequired:true,
    gameplaySemanticsRegressionRequired:true,
    authorityExpanded:false
  };
}

function deterministicCheck(root, relative) {
  const file = assertInside(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`changed file missing: ${relative}`);
  const bytes = fs.readFileSync(file);
  if (!bytes.length) throw new Error(`changed file empty: ${relative}`);
  const ext = path.extname(relative).toLowerCase();
  const text = bytes.toString('utf8');
  checkConflictMarkers(text, relative);
  const checks = ['exists','non-empty','conflict-marker-scan'];
  if (['.js','.mjs','.cjs'].includes(ext)) {
    checkNodeSyntax(text,ext,relative);
    checks.push('node-syntax');
  } else if (ext === '.json') {
    JSON.parse(text);
    checks.push('json-parse');
  } else if (['.cs','.cpp','.cc','.cxx','.h','.hpp','.gd'].includes(ext)) {
    checkBalanced(text,'{','}',relative,'brace');
    checks.push('brace-balance');
  } else if (['.html','.htm','.uxml'].includes(ext)) {
    if (!/[<>]/.test(text)) throw new Error(`markup looks invalid: ${relative}`);
    const inlineScriptCount=checkHtmlInlineScriptSyntax(text,relative);
    checks.push('markup-sanity');
    if(inlineScriptCount>0)checks.push('inline-script-syntax');
  } else if (['.unity','.prefab','.asset'].includes(ext)) {
    if (!/^%YAML|^--- !u!/m.test(text)) throw new Error(`Unity YAML header missing: ${relative}`);
    checks.push('unity-yaml-sanity');
  }
  return { file:relative, checks };
}

export function runIncrementalQa({ root=process.cwd(), files=[], manifest='', cacheFile='', namespace='default', force=false }={}) {
  const started = Date.now();
  const data=manifestData(manifest);
  const changed = collectFiles({root, files, manifest});
  const replayPlan=causalReplayPlan(data);
  const gameRepair=gameRepairContract(data);
  const replayTargets=replayPlan?.executable===true&&clean(replayPlan?.mode)==='NODE_TEST_TARGETS'?resolveReplayTargets(root,data,replayPlan):[];
  const architectureBaseline=data?.exploration?.editContract?.architectureSnapshot||null;
  const presentation=presentationContract(data);
  const weatherPresentation=weatherPresentationContract(data);
  const specializedRequest=specializedVerificationRequest(data);
  const studioAssetBinding=robloxStudioAssetBindingContract(data);
  const payload = ['vibe2-incremental-qa-v14', namespace, JSON.stringify(replayPlan||null), JSON.stringify(gameRepair||null), JSON.stringify(architectureBaseline), JSON.stringify(presentation||null), JSON.stringify(weatherPresentation||null), JSON.stringify(specializedRequest||null), JSON.stringify(studioAssetBinding||null)];
  for (const relative of [...changed].sort()) {
    const file = assertInside(root, relative);
    if (!fs.existsSync(file)) throw new Error(`changed file missing: ${relative}`);
    payload.push(relative, fs.readFileSync(file));
  }
  for(const target of replayTargets)payload.push('CAUSAL_REPLAY:'+target.relative,fs.readFileSync(target.absolute));
  const contentHash = sha256(payload);
  const cachePath = clean(cacheFile);
  const cache = cachePath ? readJson(cachePath,{version:12,entries:{}}) : {version:12,entries:{}};
  const cached = cache.entries?.[contentHash];
  if (!force && cached?.outcome === 'PASS') {
    return { outcome:'PASS', cached:true, contentHash, changedFiles:changed, checks:cached.checks || [], causalReplay:cached.causalReplay||{status:'PLAN_ONLY',executed:false,canonicalQaStillRequired:true}, gameRepairQa:cached.gameRepairQa||{status:'NOT_REQUIRED',required:false,fullRegressionStillRequired:true}, architectureDrift:cached.architectureDrift||{status:'NOT_AVAILABLE',riskLevel:'LOW',score:0,signals:[],hardReject:false}, presentationQa:cached.presentationQa||{status:'NOT_REQUIRED',pass:null,checks:[],runtimeStillRequired:false,authorityExpanded:false}, weatherPresentationQa:cached.weatherPresentationQa||{status:'NOT_REQUIRED',checks:[],runtimeStillRequired:false,authorityExpanded:false}, robloxStudioAssetBindingQa:cached.robloxStudioAssetBindingQa||{status:'NOT_REQUIRED',checks:[],runtimeStillRequired:false,authorityExpanded:false}, specializedVerificationQa:cached.specializedVerificationQa||{status:'NOT_REQUIRED',requestedMarkers:[],results:{},finalMarkerAuthority:'FAN_IN_ONLY',runtimeStillRequired:false,authorityExpanded:false}, durationMs:Date.now()-started, fullRegressionStillRequired:true };
  }

  const checks = changed.map((relative)=>deterministicCheck(root,relative));
  execFileSync('git',['diff','--check'],{cwd:root,stdio:'pipe'});
  const causalReplay=runCausalReplay({root,data});
  const gameRepairQa=runGameRepairQa({root,data,causalReplay});
  const architectureDrift=runArchitectureDrift({root,data});
  const presentationQa=runPresentationStaticQa({root,data,changed});
  const weatherPresentationQa=runWeatherPresentationStaticQa({root,data,changed});
  const robloxStudioAssetBindingQa=runRobloxStudioAssetBindingQa({root,data,changed});
  const specializedVerificationQa=runSpecializedFocusedQa({root,data,changed});
  const result = { outcome:'PASS', cached:false, contentHash, changedFiles:changed, checks, causalReplay, gameRepairQa, architectureDrift, presentationQa, weatherPresentationQa, robloxStudioAssetBindingQa, specializedVerificationQa, durationMs:Date.now()-started, fullRegressionStillRequired:true };
  if (cachePath) {
    cache.entries=cache.entries||{};
    cache.version=12; cache.entries[contentHash]={ outcome:'PASS', namespace, checks, causalReplay, gameRepairQa, architectureDrift, presentationQa, weatherPresentationQa, robloxStudioAssetBindingQa, specializedVerificationQa, savedAt:new Date().toISOString() };
    const entries=Object.entries(cache.entries).slice(-200);
    cache.entries=Object.fromEntries(entries);
    writeJson(cachePath,cache);
  }
  return result;
}

export function incrementalQaFailureSignature(error){
  const message=clean(error?.message||error).replace(/\s+/g,' ');
  const known=[
    'CAUSAL_REPLAY_PREPATCH_REPRODUCTION_REQUIRED',
    'CAUSAL_REPLAY_EXECUTABLE_WITHOUT_TARGET',
    'CAUSAL_REPLAY_DIAGNOSTIC_IDENTITY_REQUIRED',
    'CAUSAL_REPLAY_DIAGNOSTIC_STILL_PRESENT',
    'PRESENTATION_STATIC_QA_FAILED',
    'WEATHER_PRESENTATION_STATIC_QA_FAILED',
    'WEATHER_PRESENTATION_QA_SOURCE_REQUIRED',
    'CAUSAL_REPLAY_TARGET_ESCAPED_SOURCE_ROOT',
    'CAUSAL_REPLAY_TARGET_MISSING',
    'GAME_REPAIR_INVARIANT_FAILED',
    'GAME_REPAIR_SAVE_MIGRATION_FAILED',
    'GAME_REPAIR_MULTIPLAYER_LIFECYCLE_FAILED'
  ];
  for(const token of known)if(message.includes(token))return message.startsWith(token)?message.slice(0,240):token;
  if(/SyntaxError/i.test(message))return 'SYNTAX_ERROR';
  if(/merge conflict marker/i.test(message))return 'MERGE_CONFLICT_MARKER';
  if(/changed file missing/i.test(message))return 'CHANGED_FILE_MISSING';
  if(/changed file empty/i.test(message))return 'CHANGED_FILE_EMPTY';
  if(/JSON/i.test(message)&&/parse|unexpected/i.test(message))return 'JSON_PARSE_ERROR';
  if(/unbalanced|close before open/i.test(message))return 'STRUCTURE_BALANCE_ERROR';
  if(/QA path escaped root/i.test(message))return 'QA_PATH_ESCAPED_ROOT';
  return clean(message.replace(/[^A-Za-z0-9:_|.\-]+/g,'_')).slice(0,160)||'INCREMENTAL_QA_FAILED';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=parseArgs();
  try{
    const result=runIncrementalQa({
      root:clean(args.root)||process.cwd(), files:list(args.files), manifest:clean(args.manifest), cacheFile:clean(args.cache), namespace:clean(args.namespace)||'default', force:String(args.force||'').toLowerCase()==='true'
    });
    if (clean(args.output)) writeJson(clean(args.output),result);
    console.log('VIBE2_INCREMENTAL_QA=PASS');
    console.log(`VIBE2_INCREMENTAL_QA_CACHE=${result.cached?'HIT':'MISS'}`);
    console.log(`VIBE2_INCREMENTAL_QA_HASH=${result.contentHash}`);
    console.log(`VIBE2_INCREMENTAL_QA_FILES=${result.changedFiles.join(',')}`);
    console.log(`VIBE2_CAUSAL_REPLAY_STATUS=${result.causalReplay?.status||'NOT_REQUIRED'}`);
    console.log(`VIBE2_CAUSAL_REPLAY_EXECUTED=${result.causalReplay?.executed===true?'YES':'NO'}`);
    console.log(`VIBE2_CAUSAL_REPLAY_PREPATCH_REPRODUCED=${result.causalReplay?.prePatchReproduced===true?'YES':'NO'}`);
    console.log(`VIBE2_CAUSAL_REPLAY_VERIFIED_RESPONSIBLE_SYSTEM=${result.causalReplay?.verifiedResponsibleSystem||'NONE'}`);
    console.log(`GAME_REPAIR_FAILURE_STAGE=${result.gameRepairQa?.failureStage||'NONE'}`);
    console.log(`GAME_REPAIR_FAILURE_SIGNATURE=${result.gameRepairQa?.failureSignature||'NONE'}`);
    console.log(`GAME_REPAIR_PREPATCH_REPRODUCED=${result.gameRepairQa?.prePatchReproduced===true?'YES':'NO'}`);
    console.log(`GAME_REPAIR_RESPONSIBLE_SYSTEM=${result.gameRepairQa?.responsibleSystem||'NONE'}`);
    console.log(`GAME_REPAIR_RESPONSIBLE_FILES=${(result.gameRepairQa?.responsibleFiles||[]).join(',')||'NONE'}`);
    console.log(`GAME_REPAIR_LAST_KNOWN_GOOD_REVISION=${result.gameRepairQa?.revisions?.lastKnownGoodRevision||'NONE'}`);
    console.log(`GAME_REPAIR_FIRST_BROKEN_REVISION=${result.gameRepairQa?.revisions?.firstBrokenRevision||'NONE'}`);
    console.log(`GAME_REPAIR_CURRENT_REVISION=${result.gameRepairQa?.revisions?.currentRevision||'NONE'}`);
    console.log(`GAME_REPAIR_ORIGINAL_SCENARIO_REPLAY=${result.gameRepairQa?.originalScenarioReplay||'NOT_APPLICABLE'}`);
    console.log(`GAME_REPAIR_INVARIANTS=${result.gameRepairQa?.invariants||'NOT_APPLICABLE'}`);
    console.log(`GAME_REPAIR_SAVE_MIGRATION=${result.gameRepairQa?.saveMigration||'NOT_APPLICABLE'}`);
    console.log(`GAME_REPAIR_MULTIPLAYER_LIFECYCLE=${result.gameRepairQa?.multiplayerLifecycle||'NOT_APPLICABLE'}`);
    console.log('GAME_REPAIR_USER_ASSISTANCE_REQUIRED=NO');
    console.log(`GAME_REPAIR_REPEAT_COUNT=${Number(result.gameRepairQa?.repeatCount||0)}`);
    console.log(`GAME_REPAIR_MODE=${result.gameRepairQa?.repairMode||'FOCUSED_REPAIR'}`);
    console.log(`GAME_REPAIR_READY_FOR_FAN_IN=${result.gameRepairQa?.readyForFanIn===true?'YES':'NO'}`);
    console.log('GAME_REPAIR_IMPACT_REGRESSION=PASS');
    console.log('GAME_REPAIR_FULL_REGRESSION_REQUIRED=YES');
    console.log(`VIBE2_ARCHITECTURE_DRIFT_STATUS=${result.architectureDrift?.status||'NOT_AVAILABLE'}`);
    console.log(`VIBE2_ARCHITECTURE_DRIFT_RISK=${result.architectureDrift?.riskLevel||'LOW'}`);
    console.log(`VIBE2_ARCHITECTURE_DRIFT_SCORE=${Number(result.architectureDrift?.score||0)}`);
    console.log(`VIBE2_ARCHITECTURE_DRIFT_SIGNALS=${(result.architectureDrift?.signals||[]).join(',')||'NONE'}`);
    console.log(`VIBE2_PRESENTATION_QA_STATUS=${result.presentationQa?.status||'NOT_REQUIRED'}`);
    console.log(`VIBE2_PRESENTATION_QA_PASS=${result.presentationQa?.pass||'NONE'}`);
    console.log(`VIBE2_PRESENTATION_RUNTIME_REQUIRED=${result.presentationQa?.runtimeStillRequired===true?'YES':'NO'}`);
    console.log(`VIBE2_GOLDEN_SCENE_RUNTIME_REQUIRED=${result.presentationQa?.goldenSceneRuntimeEvidenceRequired===true?'YES':'NO'}`);
    console.log(`VIBE2_GOLDEN_SCENE_ROLES=${(result.presentationQa?.goldenSceneRoles||[]).join(',')||'NONE'}`);
    console.log(`VIBE2_WEATHER_PRESENTATION_QA_STATUS=${result.weatherPresentationQa?.status||'NOT_REQUIRED'}`);
    console.log(`VIBE2_WEATHER_PRESENTATION_RUNTIME_REQUIRED=${result.weatherPresentationQa?.runtimeStillRequired===true?'YES':'NO'}`);
    console.log('VIBE2_FULL_REGRESSION_REQUIRED=YES');
  }catch(error){
    const signature=incrementalQaFailureSignature(error);
    const message=clean(error?.message||error).replace(/\s+/g,' ').slice(0,500);
    const causalReplay=error?.causalReplay&&typeof error.causalReplay==='object'?error.causalReplay:null;
    const result={outcome:'FAIL',failure:{signature,message},causalReplay,fullRegressionStillRequired:true};
    if(clean(args.output))writeJson(clean(args.output),result);
    console.error('VIBE2_INCREMENTAL_QA=FAIL');
    console.error(`VIBE2_INCREMENTAL_QA_FAILURE_SIGNATURE=${signature}`);
    console.error(`VIBE2_INCREMENTAL_QA_FAILURE_MESSAGE=${message}`);
    if(causalReplay){
      console.error(`VIBE2_CAUSAL_REPLAY_STATUS=${causalReplay.status||'EXECUTED_FAIL'}`);
      console.error(`VIBE2_CAUSAL_REPLAY_EXECUTED=${causalReplay.executed===true?'YES':'NO'}`);
      console.error(`VIBE2_CAUSAL_REPLAY_PREPATCH_REPRODUCED=${causalReplay.prePatchReproduced===true?'YES':'NO'}`);
      console.error(`VIBE2_CAUSAL_REPLAY_VERIFIED_RESPONSIBLE_SYSTEM=${causalReplay.verifiedResponsibleSystem||'NONE'}`);
    }
    process.exitCode=1;
  }
}
