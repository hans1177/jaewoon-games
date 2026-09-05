// 파일명: assets/vibe-local-executor.js
// 역할: 서버 AI 없이 안전하고 결정적인 요청을 실제 소스 변경안으로 변환
// 원칙: 임의 코드 생성 금지. 구조적으로 검증 가능한 변경만 수행하고 나머지는 명시적으로 미지원 처리.

const clean=v=>String(v??'').trim();
const ext=p=>{const i=p.lastIndexOf('.');return i<0?'':p.slice(i).toLowerCase()};
const unique=v=>[...new Set(v.filter(Boolean))];

function replaceCssDeclaration(source,property,value){const re=new RegExp(`(${property.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*:\\s*)([^;}{]+)(;)`,'ig');let count=0;const next=source.replace(re,(m,a,b,c)=>{count++;return`${a}${value}${c}`});return{next,count}}
function appendCssRule(source,selector,declarations){if(!/\.css$/i.test(selector)&&source.includes(`${selector}{`))return{next:source,count:0};const block=`\n${selector}{${declarations}}\n`;return{next:source.replace(/\s*$/,'')+block,count:1}}
function webMobileTransform(path,source){let next=source,count=0;if(ext(path)==='.css'){for(const[p,v]of[['touch-action','manipulation'],['-webkit-tap-highlight-color','transparent']]){const r=replaceCssDeclaration(next,p,v);next=r.next;count+=r.count}if(!/env\(safe-area-inset-/i.test(next)){const r=appendCssRule(next,':root','--vibe-safe-top:env(safe-area-inset-top,0px);--vibe-safe-right:env(safe-area-inset-right,0px);--vibe-safe-bottom:env(safe-area-inset-bottom,0px);--vibe-safe-left:env(safe-area-inset-left,0px);');next=r.next;count+=r.count}if(!/@media\s*\(pointer:\s*coarse\)/i.test(next)){const r=appendCssRule(next,'@media (pointer:coarse)','button,[role="button"],input,select{min-height:44px}');next=r.next;count+=r.count}}
 if(ext(path)==='.html'&&!/name=["']viewport["']/i.test(next)&&/<head[^>]*>/i.test(next)){next=next.replace(/<head([^>]*)>/i,'<head$1>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');count++}return{next,count,reason:count?'mobile-safe-structure':'no-safe-mobile-transform'}}
function godotMobileTransform(path,source){let next=source,count=0;if(/project\.godot$/i.test(path)){const settings=[['display/window/stretch/mode','"canvas_items"'],['display/window/handheld/orientation','1']];for(const[key,value]of settings){const re=new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*=.*$`,'m');if(re.test(next)){next=next.replace(re,`${key}=${value}`);count++}}}return{next,count,reason:count?'godot-mobile-settings':'no-safe-godot-transform'}}
function performanceTransform(path,source){let next=source,count=0;if(['.js','.mjs'].includes(ext(path))){const r=next.replace(/setInterval\(([^,]+),\s*0\s*\)/g,(m,fn)=>{count++;return`setInterval(${fn}, 16)`});next=r}return{next,count,reason:count?'bounded-zero-interval':'no-safe-performance-transform'}}

export function executeVibeLocalChange({path='',current='',contract=null}={}){
 const file=clean(path),source=String(current??'');if(!file)throw new Error('executor path required');if(!contract||contract.serverAI!==false)throw new Error('local execution contract required');let next=source;const applied=[],skipped=[];
 for(const op of contract.operations||[]){let result={next,count:0,reason:'unsupported-operation'};if(op.id==='mobile-ui')result=contract.target==='godot'?godotMobileTransform(file,next):webMobileTransform(file,next);else if(op.id==='performance')result=performanceTransform(file,next);if(result.count){next=result.next;applied.push(`${op.id}:${result.reason}`)}else skipped.push(`${op.id}:${result.reason}`)}
 return Object.freeze({path:file,current:source,next,changed:next!==source,applied:Object.freeze(unique(applied)),skipped:Object.freeze(unique(skipped)),mode:'deterministic-local',serverAI:false});
}
export function executeVibeLocalChangeSet({files=[],contract=null}={}){return Object.freeze(files.map(file=>executeVibeLocalChange({path:file.path,current:file.current,contract})))}
if(typeof window!=='undefined'){window.executeJaewoonVibeLocalChange=executeVibeLocalChange;window.executeJaewoonVibeLocalChangeSet=executeVibeLocalChangeSet}
