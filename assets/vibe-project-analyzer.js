// 파일명: assets/vibe-project-analyzer.js
// 역할: Vibe Maker가 수정 전에 프로젝트 책임/이벤트/보호규칙을 구조적으로 분석
// 원칙: 정적 분석 결과는 수정 후보 선정용이며 게임 규칙을 추측해서 변경하지 않음

const clean=v=>String(v??'').trim();
const uniq=a=>[...new Set(a.filter(Boolean))];
const RX=Object.freeze({
 input:/\b(input|keydown|keyup|pointer|touch|joystick|_input|_unhandled_input)\b/i,
 combat:/\b(attack|damage|hit|combat|shoot|fire|skill|heal|critical|projectile)\b/i,
 render:/\b(render|draw|canvas|sprite|texture|animation|animator|visual|particle|vfx)\b/i,
 audio:/\b(audio|sound|music|bgm|sfx|play_sound|AudioStreamPlayer)\b/i,
 ui:/\b(ui|hud|button|panel|label|health.?bar|menu|dialog)\b/i,
 save:/\b(save|load|localStorage|storage|progress|checkpoint|FileAccess)\b/i,
 network:/\b(network|multiplayer|peer|rpc|websocket|room|lobby)\b/i,
 spawn:/\b(spawn|wave|enemy|boss|mob)\b/i
});
const PROTECTED=Object.freeze({hp:/\b(hp|health|max_hp|maxHealth)\b\s*[:=]\s*[-+]?\d+(?:\.\d+)?/gi,damage:/\b(damage|attack_damage|atk|power)\b\s*[:=]\s*[-+]?\d+(?:\.\d+)?/gi,cooldown:/\b(cooldown|cool_down|attack_delay|fire_rate)\b\s*[:=]\s*[-+]?\d+(?:\.\d+)?/gi,wave:/\b(wave|waves|max_wave|wave_count)\b\s*[:=]\s*[-+]?\d+/gi,reward:/\b(reward|gold|coin|xp|drop_rate|dropChance)\b\s*[:=]\s*[-+]?\d+(?:\.\d+)?/gi,saveKey:/(?:localStorage\.(?:getItem|setItem)|save_key|SAVE_KEY)\s*\(?\s*["'][^"']+["']/gi});
function symbols(path,source){const out=[];for(const m of source.matchAll(/(?:function\s+|(?:const|let|var)\s+)([A-Za-z_$][\w$]*)\s*(?:=\s*)?(?:async\s*)?\([^)]*\)\s*(?:=>)?\s*\{/g))out.push({name:m[1],kind:'function'});for(const m of source.matchAll(/^\s*func\s+([A-Za-z_]\w*)\s*\(/gm))out.push({name:m[1],kind:'godot-function'});for(const m of source.matchAll(/^\s*signal\s+([A-Za-z_]\w*)/gm))out.push({name:m[1],kind:'godot-signal'});for(const m of source.matchAll(/^\s*\[node\s+name=["']([^"']+)/gm))out.push({name:m[1],kind:'godot-node'});return out.map(x=>Object.freeze({...x,path}))}
function responsibilities(source){return Object.freeze(Object.entries(RX).filter(([,rx])=>rx.test(source)).map(([k])=>k))}
function events(source){const found=[];for(const e of ['attack','hit','damage','death','skill','spawn','wave','boss','save','load','input','touch','click'])if(new RegExp(`\\b${e}\\b`,'i').test(source))found.push(e);for(const m of source.matchAll(/\.emit\s*\(\s*["']([^"']+)/g))found.push(m[1]);for(const m of source.matchAll(/emit_signal\s*\(\s*["']([^"']+)/g))found.push(m[1]);return Object.freeze(uniq(found))}
function fingerprint(source){const values={};for(const[key,rx]of Object.entries(PROTECTED)){rx.lastIndex=0;values[key]=uniq([...source.matchAll(rx)].map(m=>m[0].replace(/\s+/g,' ').trim())).sort()}return Object.freeze(values)}
export function analyzeVibeFile({path='',source=''}={}){const text=String(source??''),file=clean(path);return Object.freeze({path:file,responsibilities:responsibilities(text),symbols:Object.freeze(symbols(file,text)),events:events(text),protectedFingerprint:fingerprint(text),lines:text.split('\n').length})}
export function buildVibeResponsibilityGraph(files=[]){const analyses=files.map(analyzeVibeFile),nodes=[],edges=[];for(const a of analyses){nodes.push(Object.freeze({id:a.path,type:'file',responsibilities:a.responsibilities}));for(const s of a.symbols)nodes.push(Object.freeze({id:`${a.path}#${s.name}`,type:s.kind,file:a.path}));for(const r of a.responsibilities)edges.push(Object.freeze({from:a.path,to:`responsibility:${r}`,type:'owns'}));for(const e of a.events)edges.push(Object.freeze({from:a.path,to:`event:${e}`,type:'emits-or-handles'}))}return Object.freeze({version:1,nodes:Object.freeze(nodes),edges:Object.freeze(edges),files:Object.freeze(analyses)})}
export function compareVibeRuleFingerprints(before,after){const changes=[];const keys=uniq([...Object.keys(before||{}),...Object.keys(after||{})]);for(const key of keys){const a=JSON.stringify(before?.[key]||[]),b=JSON.stringify(after?.[key]||[]);if(a!==b)changes.push(Object.freeze({key,before:before?.[key]||[],after:after?.[key]||[]}))}return Object.freeze({safe:changes.length===0,changes:Object.freeze(changes)})}
export function buildVibeEventSpine(graph){const map={};for(const edge of graph?.edges||[]){if(!edge.to.startsWith('event:'))continue;const event=edge.to.slice(6);(map[event]??=[]).push(edge.from)}return Object.freeze(Object.fromEntries(Object.entries(map).map(([k,v])=>[k,Object.freeze(uniq(v))])))}
if(typeof window!=='undefined'){window.analyzeJaewoonVibeFile=analyzeVibeFile;window.buildJaewoonVibeResponsibilityGraph=buildVibeResponsibilityGraph;window.compareJaewoonVibeRuleFingerprints=compareVibeRuleFingerprints;window.buildJaewoonVibeEventSpine=buildVibeEventSpine}
