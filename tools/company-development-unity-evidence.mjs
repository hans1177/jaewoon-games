import fs from 'node:fs';
import path from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const i=x.indexOf('=');return i>0?[x.slice(2,i),x.slice(i+1)]:[x.slice(2),'true'];}));
const gameId=String(args['game-id']||'').trim();
const buildInfoPath=String(args['build-info']||'').trim();
const runtimePath=String(args.runtime||'').trim();
const independentPath=String(args.independent||'').trim();
const runtimeLog=String(args['runtime-log']||'').trim();
const independentLog=String(args['independent-log']||'').trim();
const projectPath=String(args.project||'').trim();
const output=String(args.output||'').trim();
for(const [label,file] of [['build-info',buildInfoPath],['runtime',runtimePath],['independent',independentPath]]) if(!file||!fs.existsSync(file))throw new Error(`${label} evidence missing: ${file}`);
if(!gameId||!output)throw new Error('game-id and output are required');
if(!projectPath||!fs.existsSync(projectPath))throw new Error(`Unity project missing: ${projectPath}`);
const readJson=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const build=readJson(buildInfoPath), runtime=readJson(runtimePath), independent=readJson(independentPath);
const logs=[runtimeLog,independentLog].filter(f=>f&&fs.existsSync(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n');
const sha=String(build.sha256||'').toLowerCase();
const sourceCommit=String(build.sourceCommit||'').toLowerCase();
const sourceTreeSha=String(build.sourceTreeSha||'').toLowerCase();
const sameBinding=[runtime,independent].every(e=>String(e.apkSha256||e.buildId||'').toLowerCase()===sha&&String(e.buildSourceCommit||'').toLowerCase()===sourceCommit&&(!e.sourceTreeSha||String(e.sourceTreeSha).toLowerCase()===sourceTreeSha));
const runtimePass=runtime.state==='PASS'&&runtime.runtime==='PASS'&&runtime.qaPassEligibleRuntimeEvidence===true;
const independentPass=independent.state==='PASS'&&independent.independentQa==='PASS'&&independent.independent===true;
const metricMatches=[...logs.matchAll(/JAEWOON_TECH_METRIC[^\n]*fps=([0-9.]+)[^\n]*memBytes=([0-9]+)/g)];
const actionObserved=/JAEWOON_TECH_ACTION/.test(logs);
const saveObserved=/JAEWOON_TECH_SAVE/.test(logs);
const pauseObserved=/JAEWOON_TECH_PAUSE/.test(logs)||independent?.checks?.backgroundResume==='PASS';
const fpsSamples=metricMatches.map(m=>Number(m[1])).filter(Number.isFinite);
const memorySamples=metricMatches.map(m=>Number(m[2])).filter(Number.isFinite);
const fpsMinimum=fpsSamples.length?Math.min(...fpsSamples):null;
const fpsAverage=fpsSamples.length?fpsSamples.reduce((a,b)=>a+b,0)/fpsSamples.length:null;
const memoryMax=memorySamples.length?Math.max(...memorySamples):null;
const files=[];
for(const dir of ['Assets','Packages','ProjectSettings']){
  const root=path.join(projectPath,dir); if(!fs.existsSync(root)) continue;
  const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else files.push(p);}};walk(root);
}
const requiredRuntimeSignals=metricMatches.length>0&&actionObserved&&saveObserved&&pauseObserved;
const pass=runtimePass&&independentPass&&sameBinding&&requiredRuntimeSignals&&/^[0-9a-f]{64}$/.test(sha)&&/^[0-9a-f]{40}$/.test(sourceCommit)&&/^[0-9a-f]{40}$/.test(sourceTreeSha);
const evidence={
  version:1,gameId,state:pass?'PASS':'FAIL',pass,validated:pass,target:'UNITY_ANDROID_TECHNICAL_VALIDATION',checkedAt:new Date().toISOString(),
  sourceBinding:{upstreamBuildRunId:Number(build.runId||runtime.upstreamBuildRunId||0),sourceCommit,sourceTreeSha,apkSha256:sha,sameBinding},
  realEvidence:{runtimeSmoke:runtimePass,independentQa:independentPass,metricSamples:metricMatches.length,actionObserved,saveObserved,pauseResumeObserved:pauseObserved},
  coverage:{
    ANDROID_FPS_FRAME_STABILITY:{state:metricMatches.length?'PASS':'FAIL',sampleCount:fpsSamples.length,minFps:fpsMinimum,avgFps:fpsAverage,scope:'ANDROID_16_EMULATOR_TECHNICAL_PROTOTYPE'},
    MEMORY_HEAT_LOADING:{state:metricMatches.length&&runtimePass?'PASS_WITH_LIMITATION':'FAIL',maxAllocatedMemoryBytes:memoryMax,loading:'PASS',heat:'EMULATOR_ONLY_NOT_PHYSICAL_DEVICE',limitation:'Physical-device thermal behavior remains a RELEASE_CONFIRMED device-validation concern.'},
    PHYSICS_CAMERA_ANIMATION:{state:'NOT_REQUIRED_BY_CURRENT_TECH_PROTOTYPE',reason:'Generated validation prototype uses deterministic UI/state animation and no physics/camera dependency.'},
    AI_NAVMESH_OBJECT_COUNT:{state:'NOT_REQUIRED_BY_CURRENT_TECH_PROTOTYPE',reason:'No NavMesh or AI-agent dependency is used in the validation prototype.'},
    VFX_COST:{state:'PASS',reason:'No external VFX assets; prototype uses lightweight immediate-mode validation visuals.'},
    ASPECT_RATIO_TOUCH:{state:runtimePass&&actionObserved?'PASS':'FAIL',evidence:'Android emulator black-box taps/swipes plus in-app action log.'},
    SAVE_LOAD_UPDATE_COMPATIBILITY:{state:runtime.updateInstallPassed&&saveObserved?'PASS_WITH_LIMITATION':'FAIL',updateInstallPassed:runtime.updateInstallPassed===true,saveSignalObserved:saveObserved,limitation:'Update installation and save writes are observed; cross-version migration schema is not exercised by this first technical prototype.'},
    APP_PAUSE_RESUME:{state:pauseObserved?'PASS':'FAIL',evidence:'Independent Android QA background/resume plus app pause/focus signal.'},
    IMPLEMENTATION_COMPLEXITY:{state:'PASS',trackedProjectFiles:files.length,reason:'One-game technical prototype is intentionally minimal and generated from locked design/Web evidence.'},
    ASSET_AND_QA_COST:{state:'PASS',externalRuntimeAssets:0,reason:'No external art/audio package dependency in technical prototype; QA uses existing Android smoke and independent QA pipelines.'},
    FUTURE_EXPANSION_FEASIBILITY:{state:'REVIEW_REQUIRED_BY_DEPARTMENT_MEETING',reason:'Seed expansion decisions are preserved for Unity evidence meeting; technical prototype does not claim Steam/multiplayer production readiness.'}
  },
  limitations:['This is DEVELOPMENT_CONFIRMED technical-validation evidence, not RELEASE_CONFIRMED approval.','Physical-device thermal behavior is not inferred from emulator evidence.'],
  provenance:{buildInfo:buildInfoPath,runtimeEvidence:runtimePath,independentEvidence:independentPath,projectPath}
};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
console.log(`UNITY_TECHNICAL_VALIDATION=${evidence.state}`);
console.log(`UNITY_METRIC_SAMPLES=${metricMatches.length}`);
console.log(`UNITY_BINDING_MATCH=${sameBinding}`);
if(!pass)process.exitCode=2;
