// Game presentation frame pressure uses measured WebGL evidence, not inferred platform FPS.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {diagnoseVibeWebFrameBottleneck} from '../tools/vibe2-performance-sanity.mjs';

const source=fs.readFileSync(new URL('../web-games/insect-survival/world3d.mjs',import.meta.url),'utf8');
const smoke=fs.readFileSync(new URL('./vibe2-development-web-browser-smoke.mjs',import.meta.url),'utf8');
const frameProof=(extra={})=>({
 kind:'VIBE_WEB_RUNTIME_FRAME_EVIDENCE',ready:true,activeWebGL:true,rendererVisible:true,
 frameSampleValid:true,framesObserved:90,averageFrameMs:26,latestFrameMs:28,
 pixelRatio:1.15,pixelRatioCap:1.3,pixelRatioFloor:.8,resolutionAdjustments:1,
 renderCalls:45,triangles:10000,hardwareBenchmarkVerified:false,...extra
});

test('actual mobile WebGL frames adjust only presentation DPR with hysteresis',()=>{
 const start=source.indexOf('const perfBudget={');
 const end=source.indexOf('renderer.setSize(',start);
 assert.ok(start>=0&&end>start,'quality tuner is owned by the game renderer');
 const code=source.slice(start,end);
 const renderer={ratios:[],setPixelRatio(value){this.ratios.push(value)}};
 const context={renderer,devicePixelRatio:2.5,mobile:true,document:{hidden:false}};
 vm.runInNewContext(code,context);
 vm.runInNewContext('for(let i=1;i<=90;i++)sampleWebFrameBudget(i*28);',context);
 assert.ok(renderer.ratios.some(value=>value<1.3&&value>=.8),
   'low frame pacing should reduce WebGL-only resolution');
 const reduced=renderer.ratios.at(-1);
 vm.runInNewContext('for(let i=1;i<=180;i++)sampleWebFrameBudget(90*28+i*15);',context);
 assert.ok(renderer.ratios.at(-1)>=reduced,'healthy pacing may restore only up to cap');
 assert.ok(renderer.ratios.at(-1)<=1.3);
 assert.match(source,/renderer\.setPixelRatio\(next\)/);
 assert.match(source,/if\(frame&&!document\.hidden\)/,'invisible page must not render');
 assert.doesNotMatch(code,/localStorage|player\.hp|player\.x|state\.inventory/,
   'presentation tuning must not modify gameplay or persistence');
});

test('Vibe derives observed bottlenecks without fabricated hardware certification',()=>{
 const slow=diagnoseVibeWebFrameBottleneck(frameProof({renderCalls:220}));
 assert.equal(slow.observed,true);
 assert.equal(slow.frameIntervalMeasured,true);
 assert.equal(slow.advisoryOnly,true);
 assert.equal(slow.sourceWrite,false);
 assert.equal(slow.evidence.hardwareBenchmarkVerified,false);
 assert.ok(slow.bottlenecks.includes('FRAME_BUDGET_PRESSURE'));
 assert.ok(slow.bottlenecks.includes('DRAW_CALL_PRESSURE'));
 assert.ok(slow.bottlenecks.includes('RESOLUTION_AUTO_REDUCED'));
 const fast=diagnoseVibeWebFrameBottleneck(frameProof({pixelRatio:1.3,averageFrameMs:15,renderCalls:45}));
 assert.equal(fast.observed,true);
 assert.deepEqual(fast.bottlenecks,[]);
 const noProof=diagnoseVibeWebFrameBottleneck({frameSampleValid:true,framesObserved:999,averageFrameMs:8});
 assert.equal(noProof.observed,false);
 assert.ok(noProof.bottlenecks.includes('NO_VERIFIED_WEBGL_FRAME_TELEMETRY'));
 const few=diagnoseVibeWebFrameBottleneck(frameProof({framesObserved:3,frameSampleValid:false}));
 assert.equal(few.observed,true);
 assert.equal(few.frameIntervalMeasured,false);
 assert.ok(few.bottlenecks.includes('INSUFFICIENT_FRAME_SAMPLES'));
});

test('existing Chromium smoke connects raw game performance evidence to Vibe only',()=>{
 assert.match(smoke,/insect3DPerformanceProof/);
 assert.match(smoke,/diagnoseVibeWebFrameBottleneck\(frameBudget\)/);
 assert.match(smoke,/DEVELOPMENT_WEB_VIBE_BOTTLENECK_DIAGNOSIS_insect-survival/);
 assert.match(smoke,/DEVELOPMENT_WEB_MOBILE_VIBE_PERFORMANCE_EVIDENCE_insect-survival/);
 assert.match(smoke,/hardwareBenchmarkVerified,false/);
 assert.match(source,/window\.insect3DPerformanceProof/);
 assert.match(source,/performance\.now\(\)/);
 assert.match(source,/perfBudget\.renderCalls=renderer\.info\.render\.calls/);
 assert.match(source,/renderer\.domElement\.dataset\.renderedFrame='true'/);
 assert.match(source,/groundAnimatedHero\(\)/);
 assert.match(source,/renderer\.render\(scene,camera\)/);
});
