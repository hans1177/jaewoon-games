// 각 부서 AI가 자기 근거만으로 담당 아트북 페이지의 시각 설계안을 만들고 SVG를 생성한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const COUNTS={planning:2,graphics:2,development:2,qa:1,balance:1};
const TYPES={planning:['world-map','story-flow'],graphics:['concept-board','style-board'],development:['gameplay-loop','system-flow'],qa:['test-journey'],balance:['balance-curve']};
const readJson=(f,v=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return v;}};
const writeJson=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n)=>{const s=clean(v);return s.length>n?s.slice(0,n-1)+'…':s;};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const role=clean(process.env.ARTBOOK_ROLE);
if(!ROLES.includes(role))throw new Error('invalid ARTBOOK_ROLE');
const date=clean(process.env.ARTBOOK_DATE),gameId=clean(process.env.ARTBOOK_GAME_ID);
if(!date||!gameId)throw new Error('ARTBOOK_DATE/GAME_ID missing');
const base=path.join('artbook-submissions',gameId,date),file=path.join(base,`${role}.json`),submission=readJson(file,null);
if(!submission||String(submission.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`${role}: department submission missing`);
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const gameName=clean(submission.gameName||readJson(`artbook-work-orders/${date}-${gameId}.json`,{})?.gameName||gameId);
const pageCount=COUNTS[role],types=TYPES[role];
const roleBrief={
 planning:'세계관·지역·스토리·퀘스트 인과를 지도와 흐름으로 보여준다. 글 설명보다 위치, 사건, 연결 관계가 먼저 보여야 한다.',
 graphics:'캐릭터·몬스터·환경·UI의 형태와 분위기 차이를 컨셉보드처럼 보여준다. 긴 설명 대신 실루엣·비율·팔레트·구성요소를 사용한다.',
 development:'플레이 루프와 시스템 연결을 흐름도로 보여준다. 입력→행동→전투/성장→저장 같은 실제 구현 관계가 한눈에 보여야 한다.',
 qa:'플레이 시작부터 저장/재실행까지 테스트 동선을 한 장에 보여주고 위험 지점을 명확한 표식으로 구분한다.',
 balance:'체력·공격·보상·성장·난이도의 변화와 관계를 곡선/단계/게이지 중심으로 보여준다.'
}[role];
const schema={type:'object',required:['pages'],properties:{pages:{type:'array',minItems:pageCount,maxItems:pageCount,items:{type:'object',required:['title','focus','elements','caption'],properties:{title:{type:'string'},focus:{type:'string'},caption:{type:'string'},elements:{type:'array',minItems:3,maxItems:6,items:{type:'object',required:['label'],properties:{label:{type:'string'},note:{type:'string'},kind:{type:'string'}},additionalProperties:false}},callouts:{type:'array',maxItems:3,items:{type:'string'}}},additionalProperties:false}}},additionalProperties:false};
const system=`/no_think\n너는 재운컴퍼니 ${NAMES[role]} 부서 직원이다. 지금은 검토문을 쓰는 시간이 아니라 실제 아트북 페이지를 설계한다. ${roleBrief} 제공된 자기 부서 결과만 사용하고 새 설정을 만들지 않는다. 다른 부서 결과를 추측하지 않는다. 한국어만 사용하되 Unity, Web처럼 고유 기술명은 허용한다. 화면에서 읽는 문장은 매우 짧게 쓴다. 각 페이지 title 18자 이하, focus 28자 이하, caption 45자 이하, element label 12자 이하, note 20자 이하. 페이지마다 서로 다른 정보가 보여야 한다. JSON만 출력한다.`;
const payload={gameId,gameName,department:NAMES[role],pageTypes:types,pageCount,headline:submission.headline,section:submission.section,unverified:submission.unverified||[],existingVisualNotes:submission.visualNotes||[]};
async function generate(){let last=null;for(let attempt=0;attempt<4;attempt++){try{const r=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}],options:{temperature:0.16,seed:2600+ROLES.indexOf(role)*101+attempt,num_ctx:4096,num_predict:900}})});if(!r.ok)throw new Error(`ollama ${r.status}`);const p=await r.json(),raw=clean(p?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'');const value=JSON.parse(raw);if(!Array.isArray(value.pages)||value.pages.length!==pageCount)throw new Error('page count mismatch');return value.pages.map((p,i)=>({title:clip(p.title||`${NAMES[role]} ${i+1}`,18),focus:clip(p.focus,28),caption:clip(p.caption,45),elements:(Array.isArray(p.elements)?p.elements:[]).slice(0,6).map(e=>({label:clip(e.label,12),note:clip(e.note,20),kind:clip(e.kind,12)})).filter(e=>e.label).slice(0,6),callouts:(Array.isArray(p.callouts)?p.callouts:[]).map(x=>clip(x,20)).filter(Boolean).slice(0,3),visualType:types[i]}));}catch(e){last=e;console.error(`ARTBOOK_VISUAL_PLAN_RETRY=${role}:${attempt+1}:${e.message}`);}}throw last||new Error('visual plan failed');}

const themes={planning:['#102d42','#1f668a','#8bdcff'],graphics:['#21163d','#68428a','#f3a7ff'],development:['#102b4f','#245aa8','#73b9ff'],qa:['#163b32','#27745e','#82dfbd'],balance:['#3b183f','#7a3f91','#e7a0ff']};
function text(x,y,t,size=26,weight=800,fill='#eef9ff',anchor='start'){return`<text x="${x}" y="${y}" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(t)}</text>`;}
function box(x,y,w,h,label,note,accent){return`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="#07131d" fill-opacity=".55" stroke="${accent}" stroke-opacity=".65" stroke-width="2"/>${text(x+22,y+42,label,24,900)}${note?text(x+22,y+72,note,17,650,'#b9d7e8'):''}</g>`;}
function node(cx,cy,label,accent,r=42){return`<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="#07131d" fill-opacity=".72" stroke="${accent}" stroke-width="4"/>${text(cx,cy+7,label,18,900,'#fff','middle')}</g>`;}
function arrow(x1,y1,x2,y2,accent){return`<g stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round"><line x1="${x1}" y1="${y1}" x2="${x2-12}" y2="${y2}"/><polyline points="${x2-24},${y2-10} ${x2-8},${y2} ${x2-24},${y2+10}"/></g>`;}
function render(plan,index){const [c0,c1,accent]=themes[role],els=plan.elements.length?plan.elements:[{label:NAMES[role]}];let art='';
 if(plan.visualType==='world-map'){
   art+=`<path d="M80 500 C210 420 285 460 390 385 S610 430 720 325 S915 345 1120 230" stroke="${accent}" stroke-width="14" fill="none" opacity=".28"/><path d="M0 560 L190 380 340 540 500 330 690 560 865 300 1200 560 1200 675 0 675Z" fill="#07131d" opacity=".55"/>`;
   const pts=[[150,455],[365,415],[585,390],[815,330],[1040,275]];els.slice(0,5).forEach((e,i)=>{if(i>0)art+=arrow(pts[i-1][0]+45,pts[i-1][1],pts[i][0]-45,pts[i][1],accent);art+=node(pts[i][0],pts[i][1],e.label,accent,38);if(e.note)art+=text(pts[i][0],pts[i][1]+72,e.note,15,700,'#c9e8f7','middle');});
 } else if(plan.visualType==='story-flow'){
   const xs=[115,380,645,910];els.slice(0,4).forEach((e,i)=>{if(i>0)art+=arrow(xs[i-1]+170,360,xs[i],360,accent);art+=box(xs[i],290,170,145,e.label,e.note,accent);});
   art+=`<path d="M120 500 C300 530 430 480 590 515 S900 560 1080 490" stroke="${accent}" stroke-width="5" stroke-dasharray="12 10" fill="none" opacity=".65"/>`;
 } else if(plan.visualType==='concept-board'){
   art+=`<g transform="translate(465 205)"><circle cx="130" cy="95" r="62" fill="${accent}" opacity=".28"/><path d="M130 155 C75 170 55 240 70 355 L190 355 C205 240 185 170 130 155Z" fill="#0b1720" stroke="${accent}" stroke-width="5"/><path d="M83 220 L30 315 M177 220 L230 315 M95 355 L62 475 M165 355 L198 475" stroke="${accent}" stroke-width="14" stroke-linecap="round"/></g>`;
   const panels=[[70,245],[790,220],[70,455],[790,455]];els.slice(0,4).forEach((e,i)=>{art+=box(panels[i][0],panels[i][1],300,145,e.label,e.note,accent);});
 } else if(plan.visualType==='style-board'){
   art+=`<rect x="80" y="245" width="420" height="290" rx="28" fill="#07131d" fill-opacity=".55" stroke="${accent}" stroke-width="2"/><path d="M105 500 L195 355 265 445 345 315 470 500Z" fill="${accent}" opacity=".35"/><circle cx="620" cy="315" r="54" fill="${accent}" opacity=".9"/><circle cx="720" cy="315" r="54" fill="${c1}" opacity=".9"/><circle cx="820" cy="315" r="54" fill="#e8d39b" opacity=".9"/><rect x="560" y="405" width="470" height="130" rx="24" fill="#07131d" fill-opacity=".55" stroke="${accent}"/><rect x="590" y="435" width="130" height="66" rx="16" fill="${accent}" opacity=".28"/><rect x="745" y="435" width="250" height="24" rx="12" fill="#dff7ff" opacity=".7"/><rect x="745" y="474" width="190" height="18" rx="9" fill="#dff7ff" opacity=".35"/>`;
   els.slice(0,4).forEach((e,i)=>art+=text(560+(i%2)*240,590+Math.floor(i/2)*30,`• ${e.label}${e.note?' · '+e.note:''}`,17,750,'#d6ecf7'));
 } else if(plan.visualType==='gameplay-loop'){
   const pts=[[600,250],[880,390],[600,520],[320,390]];els.slice(0,4).forEach((e,i)=>{const n=(i+1)%Math.min(4,els.length);if(i<Math.min(4,els.length))art+=arrow(pts[i][0]+(i===1?-45:45),pts[i][1],pts[n][0]+(n===3?45:-45),pts[n][1],accent);art+=node(pts[i][0],pts[i][1],e.label,accent,58);if(e.note)art+=text(pts[i][0],pts[i][1]+90,e.note,16,700,'#c9e8f7','middle');});art+=node(600,390,'플레이',accent,70);
 } else if(plan.visualType==='system-flow'){
   const ys=[255,355,455];const groups=[els.slice(0,2),els.slice(2,4),els.slice(4,6)];groups.forEach((g,gi)=>g.forEach((e,i)=>art+=box(180+i*450,ys[gi],370,76,e.label,e.note,accent)));for(let i=0;i<2;i++)art+=arrow(600,ys[i]+82,600,ys[i+1]-8,accent);
 } else if(plan.visualType==='test-journey'){
   const xs=[120,330,540,750,960];els.slice(0,5).forEach((e,i)=>{if(i>0)art+=arrow(xs[i-1]+48,385,xs[i]-48,385,accent);art+=node(xs[i],385,e.label,accent,45);if(e.note)art+=text(xs[i],458,e.note,15,700,'#d3eee5','middle');});plan.callouts.forEach((c,i)=>art+=`<g><polygon points="${185+i*320},250 ${205+i*320},215 ${225+i*320},250" fill="#ffd98a"/><circle cx="205" cy="0" r="0"/>${text(235+i*320,252,c,16,900,'#ffe7ae')}</g>`);
 } else if(plan.visualType==='balance-curve'){
   art+=`<line x1="150" y1="530" x2="1080" y2="530" stroke="#cce9f7" stroke-width="3" opacity=".7"/><line x1="150" y1="530" x2="150" y2="230" stroke="#cce9f7" stroke-width="3" opacity=".7"/>`;
   const pts=els.slice(0,5).map((e,i)=>[220+i*185,480-Math.min(210,35+i*40+(e.note?.length||0))]);art+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;pts.forEach((p,i)=>{art+=`<circle cx="${p[0]}" cy="${p[1]}" r="12" fill="${accent}"/>`;art+=text(p[0],565,els[i].label,15,800,'#dbeef8','middle');if(els[i].note)art+=text(p[0],p[1]-24,els[i].note,14,750,'#ffe7fa','middle');});
 }
 const calls=plan.callouts.slice(0,3).map((c,i)=>`<rect x="${70+i*360}" y="595" width="330" height="44" rx="18" fill="#07131d" fill-opacity=".65" stroke="${accent}" stroke-opacity=".45"/>${text(88+i*360,624,c,16,800,'#d8edf8')}`).join('');
 return`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs><rect width="1200" height="675" fill="url(#bg)"/><circle cx="1040" cy="90" r="190" fill="${accent}" opacity=".08"/><circle cx="120" cy="650" r="240" fill="#000" opacity=".16"/>${text(62,70,`${gameName} · ${NAMES[role]}`,20,900,accent)}${text(62,120,plan.title,36,950)}${text(62,156,plan.focus,19,700,'#cce8f5')}${art}${calls}<rect x="38" y="38" width="1124" height="599" rx="30" fill="none" stroke="#ffffff" stroke-opacity=".16"/></svg>`;}

const plans=await generate();
const pages=[];
for(let i=0;i<plans.length;i++){const p=plans[i];if(p.elements.length<3)throw new Error(`${role}: page ${i+1} needs 3+ visual elements`);const image=path.join(base,'visuals',`${role}-${i+1}.svg`).replaceAll('\\','/');fs.mkdirSync(path.dirname(image),{recursive:true});fs.writeFileSync(image,render(p,i));pages.push({owner:role,ownerName:NAMES[role],pageSlot:i+1,visualType:p.visualType,title:p.title,focus:p.focus,caption:p.caption,elements:p.elements,callouts:p.callouts,image,employeeAuthored:true,sourceDepartment:role});}
submission.presentation={version:1,mode:'VISUAL_FIRST_EMPLOYEE_AUTHORED',pageCount,pages,generatedBy:{department:role,model,localInference:true,assistantAuthored:false},rules:{imageFirst:true,shortText:true,koreanFirst:true,newClaimsForbidden:true,otherDepartmentsUnread:true}};
writeJson(file,submission);
console.log(`ARTBOOK_VISUAL_PAGES=${role}:${pages.length}`);console.log('ARTBOOK_VISUAL_AUTHOR=DEPARTMENT_AI');console.log('ASSISTANT_AUTHORSHIP=NO');
