// 파일명: tools/company-unity-web-gameplay-validation.mjs
// 역할: Unity Web 1차 게임을 실제 모바일 브라우저에서 실행하고 표준 QA 증거를 검증한다.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const args=Object.fromEntries(process.argv.slice(2).map(v=>{
  const m=v.match(/^--([^=]+)=(.*)$/);
  return m?[m[1],m[2]]:[v.replace(/^--/,''),'true'];
}));

const gameId=String(args['game-id']||'').trim();
const source=String(args.source||`web-games/${gameId}`).replaceAll('\\','/').replace(/^\/+|\/+$/g,'');
const output=String(args.output||'').trim();
const screenshot=String(args.screenshot||'').trim();
const port=Number(args.port||4187);

if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error(`INVALID_GAME_ID:${gameId}`);
if(source!==`web-games/${gameId}`)throw new Error(`UNITY_WEB_BUILD_OUTPUT_REQUIRED:${source}`);
if(!fs.existsSync(source))throw new Error(`UNITY_WEB_SOURCE_MISSING:${source}`);
if(!fs.existsSync(path.join(source,'index.html')))throw new Error('UNITY_WEB_INDEX_MISSING');

const requiredFiles={
  wasm:false,data:false,framework:false,loader:false,
};
const walk=dir=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.isFile()){
      const name=entry.name;
      if(/\.wasm(?:\.(?:br|gz))?$/.test(name))requiredFiles.wasm=true;
      if(/\.data(?:\.(?:br|gz))?$/.test(name))requiredFiles.data=true;
      if(/\.framework\.js(?:\.(?:br|gz))?$/.test(name))requiredFiles.framework=true;
      if(/\.loader\.js$/.test(name))requiredFiles.loader=true;
    }
  }
};
walk(source);
if(Object.values(requiredFiles).some(v=>!v))throw new Error(`UNITY_WEB_ARTIFACT_SET_INCOMPLETE:${JSON.stringify(requiredFiles)}`);

const contentType=file=>{
  const bare=file.replace(/\.(br|gz)$/,'');
  if(bare.endsWith('.wasm'))return 'application/wasm';
  if(bare.endsWith('.js'))return 'application/javascript; charset=utf-8';
  if(bare.endsWith('.json'))return 'application/json; charset=utf-8';
  if(bare.endsWith('.html'))return 'text/html; charset=utf-8';
  if(bare.endsWith('.css'))return 'text/css; charset=utf-8';
  return 'application/octet-stream';
};

const root=process.cwd();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const relative=pathname.replace(/^\/+/, '');
    const file=path.resolve(root,relative.endsWith('/')?`${relative}index.html`:relative);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('not found');return;
    }
    const headers={'Content-Type':contentType(file),'Cache-Control':'no-store'};
    if(file.endsWith('.br'))headers['Content-Encoding']='br';
    if(file.endsWith('.gz'))headers['Content-Encoding']='gzip';
    res.writeHead(200,headers);
    fs.createReadStream(file).pipe(res);
  }catch(error){
    res.writeHead(500);res.end(String(error?.message||error));
  }
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});

const markers=[];
const consoleErrors=[];
const pageErrors=[];
const failedRequests=[];

try{
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('console',msg=>{
    const text=String(msg.text()||'');
    if(text.includes('JAEWOON_UNITY_WEB_QA '))markers.push(text);
    if(msg.type()==='error')consoleErrors.push(text);
  });
  page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
  page.on('requestfailed',req=>failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText||''}`));

  const url=`http://127.0.0.1:${port}/${source}/?qa=1`;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForSelector('canvas',{state:'visible',timeout:90000});
  await page.waitForTimeout(4000);

  const boot=()=>markers.some(x=>x.includes(' BOOT ')&&x.includes(`game=${gameId}`)&&x.includes('status=PASS'));
  if(!boot())throw new Error('UNITY_WEB_QA_BOOT_MARKER_MISSING');

  await page.keyboard.press('Digit1');
  await page.waitForTimeout(1500);
  const enteredCombat=markers.some(x=>x.includes(' REGION ')&&x.includes('region=field-1'));
  if(!enteredCombat)throw new Error('UNITY_WEB_QA_REGION_TRANSITION_MISSING');

  for(let i=0;i<14&&!markers.some(x=>x.includes(' REWARD '));i++){
    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
  }

  const attacks=markers.filter(x=>x.includes(' ATTACK '));
  const rewards=markers.filter(x=>x.includes(' REWARD '));
  if(attacks.length<1)throw new Error('UNITY_WEB_QA_ATTACK_EVIDENCE_MISSING');
  if(rewards.length<1)throw new Error('UNITY_WEB_QA_REWARD_EVIDENCE_MISSING');

  await page.keyboard.press('KeyR');
  await page.waitForTimeout(1000);
  if(!markers.some(x=>x.includes(' REGION ')&&x.includes('region=town')))throw new Error('UNITY_WEB_QA_RETURN_TO_TOWN_MISSING');

  const statesBeforeReload=markers.filter(x=>x.includes(' STATE '));
  const rewardState=statesBeforeReload.slice().reverse().find(x=>/gold=([1-9]\d*)/.test(x));
  if(!rewardState)throw new Error('UNITY_WEB_QA_REWARD_STATE_NOT_REFLECTED');

  await page.reload({waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForSelector('canvas',{state:'visible',timeout:90000});
  await page.waitForTimeout(3500);

  const persisted=markers.slice().reverse().find(x=>x.includes(' STATE ')&&x.includes('region=town')&&/gold=([1-9]\d*)/.test(x));
  if(!persisted)throw new Error('UNITY_WEB_QA_SAVE_RESTORE_MISSING');

  const fatal=[...consoleErrors,...pageErrors,...failedRequests].filter(x=>/abort|out of memory|wasm.*error|failed to fetch|build error|exception/i.test(x));
  if(fatal.length)throw new Error(`UNITY_WEB_FATAL_RUNTIME_ERROR:${fatal.slice(0,5).join(' | ')}`);

  if(screenshot){
    fs.mkdirSync(path.dirname(screenshot),{recursive:true});
    await page.screenshot({path:screenshot,fullPage:true});
  }

  const evidence={
    version:1,
    engine:'UNITY_WEB',
    gameId,
    sourcePath:source,
    pass:true,
    boot:{pass:true},
    input:{pass:true,qaMode:'REAL_GAME_FUNCTION_INPUT'},
    gameplay:{
      pass:true,
      regionTransition:true,
      attackObserved:true,
      attackCount:attacks.length,
      rewardObserved:true,
    },
    saveRestore:{pass:true},
    mobile:{pass:true,viewport:{width:390,height:844},touch:true},
    performance:{pass:true,fatalRuntimeErrorCount:0},
    noCriticalRuntimeError:true,
    markers,
    generatedAt:new Date().toISOString(),
  };
  if(output){
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
  }
  console.log('UNITY_WEB_GAMEPLAY_QA=PASS');
  await browser.close();
} finally {
  await new Promise(resolve=>server.close(resolve));
}
