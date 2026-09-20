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
  if(!plan||plan.required!==true)return{status:'NOT_REQUIRED',executed:false,targets:[],canonicalQaStillRequired:true};
  if(plan.executable!==true||clean(plan.mode)!=='NODE_TEST_TARGETS')return{status:'PLAN_ONLY',executed:false,reason:clean(plan.status)||'NO_EXECUTABLE_REPLAY',targets:[],canonicalQaStillRequired:true};
  if(plan.prePatchReproduced!==true)throw new Error('CAUSAL_REPLAY_PREPATCH_REPRODUCTION_REQUIRED');
  const targets=resolveReplayTargets(root,data,plan);
  if(!targets.length)throw new Error('CAUSAL_REPLAY_EXECUTABLE_WITHOUT_TARGET');
  const results=[];
  for(const target of targets){
    execFileSync(process.execPath,['--test',target.absolute],{cwd:root,stdio:'pipe',encoding:'utf8'});
    results.push({target:target.relative,outcome:'PASS'});
  }
  return{status:'EXECUTED_PASS',executed:true,prePatchReproduced:true,targets:results,identicalOrEquivalentInputStateRequired:plan.identicalOrEquivalentInputStateRequired!==false,canonicalQaStillRequired:true};
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
function presentationContract(data = {}) {
  const contract=data?.presentationQuality;
  return contract&&contract.required===true?contract:null;
}
function presentationSourceText(root, changed = []) {
  const rows=[];
  for(const relative of changed){
    const file=assertInside(root,relative);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
    if(!/\.(?:html?|js|mjs|cjs|css|svg|cs|gd|cpp|cc|cxx|h|hpp)$/i.test(relative))continue;
    rows.push(fs.readFileSync(file,'utf8'));
  }
  return rows.join('\n\n');
}
function patternHits(text='',patterns=[]){
  return patterns.reduce((count,re)=>count+(re.test(text)?1:0),0);
}
function runPresentationStaticQa({root,data={},changed=[]}={}){
  const contract=presentationContract(data);
  if(!contract)return{status:'NOT_REQUIRED',pass:null,checks:[],runtimeStillRequired:false,authorityExpanded:false};
  const pass=clean(contract.pass).toUpperCase();
  const text=presentationSourceText(root,changed);
  if(!text.trim())throw new Error(`PRESENTATION_QA_SOURCE_REQUIRED:${pass}`);
  const checks=[],issues=[];
  const require=(name,ok)=>{checks.push({name,pass:Boolean(ok)});if(!ok)issues.push(name);};
  if(pass==='ASSET_ADAPTATION'){
    require('STYLE_SURFACE',/(?:fillStyle|strokeStyle|classList|style\.|--[\w-]+\s*:|background|linear-gradient|radial-gradient|material|texture|sprite)/i.test(text));
    require('RENDER_OR_VISUAL_OWNER',/(?:canvas|getContext\(|render|draw|sprite|mesh|visual|style)/i.test(text));
  }else if(pass==='LIVING_MOTION'){
    require('CONTINUOUS_UPDATE',/(?:requestAnimationFrame|setInterval|Update\s*\(|_process\s*\(|Heartbeat|RenderStepped)/i.test(text));
    require('SMOOTH_INTERPOLATION',/(?:lerp|damp|spring|ease|interpol|Math\.sin|smoothstep|velocity|accel|decel)/i.test(text));
    require('MOTION_STATE',/(?:idle|walk|run|speed|velocity|rotation|turn|breath|bob|sway)/i.test(text));
  }else if(pass==='ANIMATION_FEEL'){
    const hit=patternHits(text,[/anticipat/i,/hit.?stop|freeze.?frame/i,/recoil/i,/recover(?:y)?/i,/overshoot|settle/i,/smear|trail|afterimage/i,/squash|stretch/i]);
    require('IMPACT_SEQUENCE_SIGNALS',hit>=2);
    require('IMPACT_OR_ACTION_EVENT',/(?:impact|hit|attack|interact|damage|collision)/i.test(text));
  }else if(pass==='VFX'){
    const hit=patternHits(text,[/particle/i,/trail/i,/afterimage/i,/flash/i,/shake/i,/impact/i,/glow/i,/shockwave/i,/spark/i,/dust/i,/telegraph/i]);
    require('VFX_FEEDBACK_VARIETY',hit>=2);
    require('BOUNDED_EFFECT_LIFETIME',/(?:life|ttl|duration|remove|splice|filter|pool|maxParticles|maxEffects|cap)/i.test(text));
  }else if(pass==='AUDIO_FEEL'){
    require('AUDIO_RUNTIME',/(?:AudioContext|webkitAudioContext|new\s+Audio\s*\(|createGain|createOscillator)/i.test(text));
    require('USER_GESTURE_UNLOCK',/(?:pointerdown|touchstart|click|keydown|mousedown)/i.test(text));
    require('MUTE_CONTROL',/(?:mute|muted)/i.test(text));
    require('VOLUME_CONTROL',/(?:volume|gain)/i.test(text));
    require('DUPLICATE_RESUME_GUARD',/(?:visibilitychange|pagehide|pageshow|resume|suspend|audioState|musicState|currentTrack)/i.test(text));
  }else if(pass==='CAMERA_LANGUAGE'){
    require('CAMERA_OWNER',/(?:camera|viewport|viewOffset|screenShake|cameraShake)/i.test(text));
    require('SMOOTH_CAMERA_RESPONSE',/(?:shake|zoom|lerp|ease|damp|offset|scale|follow)/i.test(text));
  }else if(pass==='POLISH_MOBILE'){
    require('MOBILE_INPUT',/(?:pointer|touch|virtual.?stick|joystick)/i.test(text));
    require('FRAME_LOOP_OR_STABLE_RENDER',/(?:requestAnimationFrame|RenderStepped|Update\s*\(|_process\s*\()/i.test(text));
    require('PRESENTATION_BUDGET_OR_LIFECYCLE',/(?:pool|maxParticles|maxEffects|devicePixelRatio|visibilitychange|pagehide|cleanup|dispose|remove|ttl|duration)/i.test(text));
    require('PRESENTATION_CONTRACT_MARKER',/data-presentation-quality-version=["']1["']/i.test(text));
  }
  if(issues.length)throw new Error(`PRESENTATION_STATIC_QA_FAILED:${pass}:${issues.join('|')}`);
  return{
    status:'STATIC_PASS',
    pass,
    checks,
    runtimeStillRequired:true,
    runtimeChecks:Array.isArray(contract.runtimeChecks)?contract.runtimeChecks.map(clean).filter(Boolean):[],
    gameplaySemanticsPreservationRequired:true,
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
    checks.push('markup-sanity');
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
  const replayTargets=replayPlan?.executable===true?resolveReplayTargets(root,data,replayPlan):[];
  const architectureBaseline=data?.exploration?.editContract?.architectureSnapshot||null;
  const presentation=presentationContract(data);
  const payload = ['vibe2-incremental-qa-v6', namespace, JSON.stringify(replayPlan||null), JSON.stringify(architectureBaseline), JSON.stringify(presentation||null)];
  for (const relative of [...changed].sort()) {
    const file = assertInside(root, relative);
    if (!fs.existsSync(file)) throw new Error(`changed file missing: ${relative}`);
    payload.push(relative, fs.readFileSync(file));
  }
  for(const target of replayTargets)payload.push('CAUSAL_REPLAY:'+target.relative,fs.readFileSync(target.absolute));
  const contentHash = sha256(payload);
  const cachePath = clean(cacheFile);
  const cache = cachePath ? readJson(cachePath,{version:3,entries:{}}) : {version:3,entries:{}};
  const cached = cache.entries?.[contentHash];
  if (!force && cached?.outcome === 'PASS') {
    return { outcome:'PASS', cached:true, contentHash, changedFiles:changed, checks:cached.checks || [], causalReplay:cached.causalReplay||{status:'PLAN_ONLY',executed:false,canonicalQaStillRequired:true}, architectureDrift:cached.architectureDrift||{status:'NOT_AVAILABLE',riskLevel:'LOW',score:0,signals:[],hardReject:false}, presentationQa:cached.presentationQa||{status:'NOT_REQUIRED',pass:null,checks:[],runtimeStillRequired:false,authorityExpanded:false}, durationMs:Date.now()-started, fullRegressionStillRequired:true };
  }

  const checks = changed.map((relative)=>deterministicCheck(root,relative));
  execFileSync('git',['diff','--check'],{cwd:root,stdio:'pipe'});
  const causalReplay=runCausalReplay({root,data});
  const architectureDrift=runArchitectureDrift({root,data});
  const presentationQa=runPresentationStaticQa({root,data,changed});
  const result = { outcome:'PASS', cached:false, contentHash, changedFiles:changed, checks, causalReplay, architectureDrift, presentationQa, durationMs:Date.now()-started, fullRegressionStillRequired:true };
  if (cachePath) {
    cache.version=3; cache.entries=cache.entries||{};
    cache.version=5; cache.entries[contentHash]={ outcome:'PASS', namespace, checks, causalReplay, architectureDrift, presentationQa, savedAt:new Date().toISOString() };
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
    'PRESENTATION_STATIC_QA_FAILED',
    'CAUSAL_REPLAY_TARGET_ESCAPED_SOURCE_ROOT',
    'CAUSAL_REPLAY_TARGET_MISSING'
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
    console.log(`VIBE2_ARCHITECTURE_DRIFT_STATUS=${result.architectureDrift?.status||'NOT_AVAILABLE'}`);
    console.log(`VIBE2_ARCHITECTURE_DRIFT_RISK=${result.architectureDrift?.riskLevel||'LOW'}`);
    console.log(`VIBE2_ARCHITECTURE_DRIFT_SCORE=${Number(result.architectureDrift?.score||0)}`);
    console.log(`VIBE2_ARCHITECTURE_DRIFT_SIGNALS=${(result.architectureDrift?.signals||[]).join(',')||'NONE'}`);
    console.log(`VIBE2_PRESENTATION_QA_STATUS=${result.presentationQa?.status||'NOT_REQUIRED'}`);
    console.log(`VIBE2_PRESENTATION_QA_PASS=${result.presentationQa?.pass||'NONE'}`);
    console.log(`VIBE2_PRESENTATION_RUNTIME_REQUIRED=${result.presentationQa?.runtimeStillRequired===true?'YES':'NO'}`);
    console.log('VIBE2_FULL_REGRESSION_REQUIRED=YES');
  }catch(error){
    const signature=incrementalQaFailureSignature(error);
    const message=clean(error?.message||error).replace(/\s+/g,' ').slice(0,500);
    const result={outcome:'FAIL',failure:{signature,message},fullRegressionStillRequired:true};
    if(clean(args.output))writeJson(clean(args.output),result);
    console.error('VIBE2_INCREMENTAL_QA=FAIL');
    console.error(`VIBE2_INCREMENTAL_QA_FAILURE_SIGNATURE=${signature}`);
    console.error(`VIBE2_INCREMENTAL_QA_FAILURE_MESSAGE=${message}`);
    process.exitCode=1;
  }
}
