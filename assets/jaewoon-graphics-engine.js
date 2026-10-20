// 파일명: assets/jaewoon-graphics-engine.js
// 역할: Graphics DNA, 시각 성능예산, A/B/C 후보검증, 다중게임 승격과 실제 그래픽 구현 범위 계획을 위한 공통 그래픽 진화 코어
// 원칙: 렌더/표현 계층만 다루며 authoritative gameplay state를 변경하지 않는다.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.JaewoonGraphicsEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 2;
  const STRATEGIES = Object.freeze(['KEEP','ENHANCE','COMBINE','REPLACE']);
  const TIERS = Object.freeze(['LOW','MID','HIGH']);
  const DNA_LEVELS = Object.freeze(['ASSET','CHARACTER','ARCHETYPE','ENVIRONMENT','GAME','COMPANY']);
  const SCORE_WEIGHTS = Object.freeze({
    readability:15,
    identity:15,
    actors:10,
    environment:10,
    uiHud:10,
    combatVfx:10,
    signatureScene:10,
    motionStyleMatch:5,
    mobilePerformance:10,
    licenseRegressionSafety:5,
  });
  const PROTECTED_KEYS = new Set([
    'hp','health','damage','attack','attackPower','cooldown','spawn','spawnRate','spawnCount','reward','rewards',
    'dropRate','dropRates','save','saveData','saveMeaning','progression','collision','hitbox','hitboxes','questReward',
    'economy','price','prices','combatResult','gameplayFlow'
  ].map((key) => key.toLowerCase()));
  const BLOCKED_LICENSE = ['NC','NON_COMMERCIAL','UNKNOWN','UNVERIFIED','ND','NO_DERIVATIVES','LOST_PROVENANCE'];
  const VISUAL_ANOMALY_PATTERNS = Object.freeze([
    ['SPRITE_CLIPPED',/(?:sprite.{0,20}clip|clipped.{0,20}sprite|스프라이트.{0,12}(?:잘림|클리핑))/i],
    ['ALPHA_BACKGROUND_ERROR',/(?:alpha.{0,20}(?:background|error)|투명.{0,10}(?:배경|오류))/i],
    ['ABNORMAL_SCALE',/(?:abnormal.{0,12}scale|scale.{0,12}(?:wrong|broken)|비정상.{0,10}(?:크기|스케일))/i],
    ['BLUR_OR_PIXEL_BREAK',/(?:blur|pixel.{0,10}(?:break|broken)|뭉개|픽셀.{0,10}(?:깨|손상))/i],
    ['UI_OUTSIDE_SAFE_AREA',/(?:safe.?area|ui.{0,16}(?:outside|overflow)|화면.{0,10}(?:밖|넘침)|안전.?영역)/i],
    ['LOW_CONTRAST',/(?:low.?contrast|대비.{0,10}(?:낮|부족))/i],
    ['COLOR_ONLY_ENEMY_DUPLICATE',/(?:color.?only.{0,20}(?:enemy|duplicate)|색만.{0,12}(?:다른|바꾼).{0,12}(?:적|몬스터))/i],
    ['VFX_HIDES_TELEGRAPH',/(?:vfx.{0,20}(?:hide|cover).{0,20}telegraph|이펙트.{0,16}(?:전조|공격).{0,16}(?:가림|숨김))/i],
    ['PARTICLE_EXPLOSION',/(?:particle.{0,16}(?:explosion|too many|overflow)|파티클.{0,16}(?:과다|폭증))/i],
    ['SUBJECT_LOST_IN_BACKGROUND',/(?:subject.{0,20}(?:lost|hidden).{0,20}background|배경.{0,16}(?:캐릭터|주체).{0,16}(?:묻|안 보))/i],
    ['MOBILE_ENEMY_UNREADABLE',/(?:mobile.{0,20}(?:enemy|actor).{0,20}unreadable|모바일.{0,16}(?:적|몬스터).{0,16}(?:안 보|식별|가독))/i],
    ['FONT_ICON_BLUR',/(?:font|icon).{0,16}blur|(?:폰트|아이콘).{0,16}(?:뭉개|흐림)/i],
    ['ASSET_LOAD_FAILURE',/(?:asset.{0,20}(?:load|missing|404)|(?:에셋|이미지|스프라이트).{0,16}(?:로드|누락|404|안 뜸))/i],
    ['LICENSE_LEDGER_MISSING',/(?:license.{0,16}(?:missing|ledger)|라이선스.{0,16}(?:누락|없음))/i],
    ['STYLE_DNA_MISMATCH',/(?:style.?dna.{0,16}mismatch|스타일.{0,16}(?:불일치|안 맞))/i],
  ]);
  const ANOMALY_FILE_HINTS = Object.freeze({
    SPRITE_CLIPPED:['sprite','render','visual','ui'],ALPHA_BACKGROUND_ERROR:['sprite','render','visual','asset'],ABNORMAL_SCALE:['ui','hud','render','visual'],
    BLUR_OR_PIXEL_BREAK:['sprite','ui','render','visual'],UI_OUTSIDE_SAFE_AREA:['ui','hud','style','css','canvas'],LOW_CONTRAST:['ui','hud','style','css','material'],
    COLOR_ONLY_ENEMY_DUPLICATE:['sprite','visual','render','asset'],VFX_HIDES_TELEGRAPH:['vfx','effect','render','visual'],PARTICLE_EXPLOSION:['vfx','effect','particle','render'],
    SUBJECT_LOST_IN_BACKGROUND:['render','visual','environment','camera'],MOBILE_ENEMY_UNREADABLE:['sprite','render','visual','ui'],FONT_ICON_BLUR:['font','icon','ui','hud','style'],
    ASSET_LOAD_FAILURE:['asset','sprite','render','ui'],LICENSE_LEDGER_MISSING:['asset'],STYLE_DNA_MISMATCH:['visual','render','style','ui','vfx'],
  });

  // 유틸: 렌더링 계측 실패(Infinity/NaN)를 최고 점수로 취급하지 않는다.
  const clamp = (value, min, max) => {
    const measured = Number(value);
    return Number.isFinite(measured) ? Math.max(min, Math.min(max, measured)) : min;
  };
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const posix = value => String(value ?? '').replaceAll('\\','/').replace(/^\.\//,'');

  function findProtectedKeys(value, found = new Set(), seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return found;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (PROTECTED_KEYS.has(String(key).toLowerCase())) found.add(key);
      findProtectedKeys(child, found, seen);
    }
    return found;
  }

  function validateVisualCandidate(candidate = {}) {
    const touched = [...findProtectedKeys(candidate)].sort();
    const stableTarget = candidate.target === 'stable' || candidate.target === 'public' || candidate.target === 'main';
    const selfPromote = candidate.selfPromote === true || candidate.promote === true;
    const blockers = [];
    if (touched.length) blockers.push('GAMEPLAY_AUTHORITY_MUTATION');
    if (stableTarget) blockers.push('STABLE_OR_MAIN_DIRECT_MUTATION');
    if (selfPromote) blockers.push('UNVERIFIED_SELF_PROMOTE');
    return Object.freeze({ pass:blockers.length === 0, blockers:Object.freeze(blockers), protectedKeys:Object.freeze(touched), authority:'CANDIDATE_ONLY' });
  }

  function validateAssetLicense(entry = {}) {
    const license = String(entry.license ?? '').trim().toUpperCase();
    const source = String(entry.source ?? '').trim();
    const author = String(entry.author ?? entry.creator ?? '').trim();
    const checkedAt = String(entry.checkedAt ?? entry.verifiedAt ?? '').trim();
    const gameId = String(entry.gameId ?? entry.targetGame ?? '').trim();
    const use = String(entry.use ?? entry.purpose ?? '').trim();
    const blocked = BLOCKED_LICENSE.some((token) => license.includes(token));
    const commercial = entry.commercialUse !== false;
    const derivativeNeeded = entry.modified === true || Boolean(entry.derivativeFile);
    const modificationAllowed = entry.modificationUse !== false && !license.includes('ND');
    const pass = Boolean(source && author && license && checkedAt && gameId && use && !blocked && commercial && (!derivativeNeeded || modificationAllowed));
    return Object.freeze({ pass, blocked, license, commercial, modificationAllowed });
  }

  function classifyAsset({ currentQuality=1, readability=1, identityFit=1, licensePass=true, needsParts=false, externalReplacementReady=false } = {}) {
    if (!licensePass) return 'REPLACE';
    if (currentQuality >= 0.8 && readability >= 0.8 && identityFit >= 0.8 && !needsParts) return 'KEEP';
    if (needsParts && identityFit >= 0.55) return 'COMBINE';
    if (currentQuality >= 0.45 && readability >= 0.4 && identityFit >= 0.5) return 'ENHANCE';
    return externalReplacementReady ? 'REPLACE' : 'ENHANCE';
  }

  function createGraphicsProfile(options = {}) {
    const tier = String(options.deviceTier ?? 'MID').toUpperCase();
    if (!TIERS.includes(tier)) throw new Error(`unknown device tier: ${tier}`);
    return Object.freeze({
      engineVersion:VERSION,
      profileVersion:Number(options.profileVersion ?? 1),
      styleDnaVersion:Number(options.styleDnaVersion ?? 1),
      gameId:options.gameId ?? null,
      deviceTier:tier,
      strategy:STRATEGIES.includes(options.strategy) ? options.strategy : 'ENHANCE',
      dna:Object.freeze({
        asset:options.dna?.asset ?? null,
        character:options.dna?.character ?? null,
        archetype:options.dna?.archetype ?? null,
        environment:options.dna?.environment ?? null,
        game:options.dna?.game ?? null,
        company:options.dna?.company ?? null,
      }),
      target:'candidate',
      selfPromote:false,
    });
  }

  function deviceVisualBudget(tier='MID') {
    const key = String(tier).toUpperCase();
    const profiles = {
      LOW:{ decorativeParticles:0.30, postFx:0.20, distantEffects:0.35, environmentMotion:0.45, coreSilhouette:1, attackReadability:1, uiHud:1, playerFeedback:1 },
      MID:{ decorativeParticles:0.65, postFx:0.55, distantEffects:0.70, environmentMotion:0.75, coreSilhouette:1, attackReadability:1, uiHud:1, playerFeedback:1 },
      HIGH:{ decorativeParticles:1, postFx:1, distantEffects:1, environmentMotion:1, coreSilhouette:1, attackReadability:1, uiHud:1, playerFeedback:1 },
    };
    if (!profiles[key]) throw new Error(`unknown device tier: ${tier}`);
    return Object.freeze({ tier:key, ...profiles[key] });
  }

  function graphicsScore(evidence = {}) {
    const parts = {};
    let total = 0;
    for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
      const normalized = clamp(evidence[key], 0, 1);
      const points = normalized * weight;
      parts[key] = points;
      total += points;
    }
    return Object.freeze({ total:Math.round(total * 100) / 100, parts:Object.freeze(parts), max:100 });
  }

  function detectVisualAnomalies(observation = {}) {
    const checks = {
      SPRITE_CLIPPED: observation.spriteClipped,
      ALPHA_BACKGROUND_ERROR: observation.alphaBackgroundError,
      ABNORMAL_SCALE: observation.abnormalScale,
      BLUR_OR_PIXEL_BREAK: observation.blurOrPixelBreak,
      UI_OUTSIDE_SAFE_AREA: observation.uiOutsideSafeArea,
      LOW_CONTRAST: observation.lowContrast,
      COLOR_ONLY_ENEMY_DUPLICATE: observation.colorOnlyEnemyDuplicate,
      VFX_HIDES_TELEGRAPH: observation.vfxHidesTelegraph,
      PARTICLE_EXPLOSION: observation.particleExplosion,
      SUBJECT_LOST_IN_BACKGROUND: observation.subjectLostInBackground,
      MOBILE_ENEMY_UNREADABLE: observation.mobileEnemyUnreadable,
      FONT_ICON_BLUR: observation.fontIconBlur,
      ASSET_LOAD_FAILURE: observation.assetLoadFailure,
      LICENSE_LEDGER_MISSING: observation.licenseLedgerMissing,
      STYLE_DNA_MISMATCH: observation.styleDnaMismatch,
    };
    return Object.freeze(Object.entries(checks).filter(([, active]) => active === true).map(([name]) => name));
  }

  function inferVisualAnomalies(text='') {
    const source=clean(text);
    return Object.freeze(VISUAL_ANOMALY_PATTERNS.filter(([,pattern])=>pattern.test(source)).map(([name])=>name));
  }

  function visualFileAuthority(file='') {
    const rel=posix(file),lower=rel.toLowerCase();
    if(!rel)return Object.freeze({file:rel,safe:false,reason:'EMPTY_PATH'});
    // 메인: 시각 책임 후보여도 절대 경로·상위 폴더·URI로 저장소 범위를 벗어나면 거부한다.
    if(rel.startsWith('/')||rel.startsWith('~')||/^[a-z][a-z0-9+.-]*:/i.test(rel)||rel.split('/').includes('..')||rel.includes('\0'))return Object.freeze({file:rel,safe:false,reason:'UNSAFE_VISUAL_PATH'});
    if(lower.startsWith('.github/')||lower.startsWith('.autonomous/')||lower.startsWith('company-learning/')||/\.(?:md|txt)$/.test(lower))return Object.freeze({file:rel,safe:false,reason:'NON_VISUAL_META'});
    const strongVisual=/\.(?:css|svg|shader|mat|anim|controller|prefab|unity)$/.test(lower)||/(?:^|[\/_-])(?:ui|hud|render|visual|sprite|animation|animator|effect|vfx|particle|shader|material|camera|environment)(?:[\/_\-.]|$)/.test(lower);
    const strongGameplay=/(?:gamecore|game-state|gamestate|playerstate|save|economy|balance|combat|quest|inventory|reward|damage|health|spawn)/.test(lower);
    if(!strongVisual)return Object.freeze({file:rel,safe:false,reason:'NO_VISUAL_IMPLEMENTATION_SIGNAL'});
    if(strongGameplay&&!/(?:ui|hud|render|visual|sprite|animation|animator|effect|vfx)/.test(lower))return Object.freeze({file:rel,safe:false,reason:'GAMEPLAY_AUTHORITY_RISK'});
    return Object.freeze({file:rel,safe:true,reason:'VISUAL_PRESENTATION_SCOPE'});
  }

  function planGraphicsImplementation({anomalies=[],files=[],goal='',deviceTier='MID',leasedFiles=[],maxFiles=2}={}) {
    const explicit=[...new Set([...(Array.isArray(anomalies)?anomalies:[]),...inferVisualAnomalies(goal)])];
    const actionText=clean(goal);
    const actionable=explicit.length>0||(/(?:그래픽|화면|ui|hud|render|sprite|animation|effect|vfx|스타일|애니메이션|이펙트)/i.test(actionText)&&/(?:수정|구현|추가|개선|연결|고치|fix|implement|improve|update|adjust)/i.test(actionText));
    if(!actionable)return Object.freeze({run:false,scope:Object.freeze([]),tasks:Object.freeze([]),reason:'NO_ACTIONABLE_VISUAL_EVIDENCE',anomalies:Object.freeze(explicit),deviceBudget:deviceVisualBudget(deviceTier)});
    const leased=new Set((leasedFiles||[]).map(posix));
    const candidates=(files||[]).map(item=>typeof item==='string'?{path:item}:{...item,path:item.path}).map((item,index)=>{
      const authority=visualFileAuthority(item.path);if(!authority.safe||leased.has(posix(item.path)))return null;
      const lower=posix(item.path).toLowerCase();let score=Number(item.score||0)+4;
      for(const anomaly of explicit)for(const hint of ANOMALY_FILE_HINTS[anomaly]||[])if(lower.includes(hint))score+=6;
      if(/\.(?:css|svg)$/.test(lower))score+=3;
      return {...item,path:posix(item.path),authority,score,index};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index||a.path.localeCompare(b.path));
    const limit=Math.max(1,Math.min(2,Number(maxFiles)||2)),scope=candidates.slice(0,limit).map(row=>row.path);
    if(!scope.length)return Object.freeze({run:false,scope:Object.freeze([]),tasks:Object.freeze([]),reason:'NO_SAFE_VISUAL_SCOPE',anomalies:Object.freeze(explicit),deviceBudget:deviceVisualBudget(deviceTier)});
    const primary=explicit[0]||'VISUAL_QUALITY';
    const tasks=scope.map(file=>Object.freeze({path:file,action:`${primary} 시각 문제를 이 표현 계층에서 최소 수정`,authority:'GAMEPLAY_STATE_READ_ONLY'}));
    return Object.freeze({run:true,scope:Object.freeze(scope),tasks:Object.freeze(tasks),reason:'ACTIONABLE_VISUAL_SCOPE',anomalies:Object.freeze(explicit),deviceBudget:deviceVisualBudget(deviceTier),maxChangedFiles:2});
  }

  function graphicsImplementationImpact({changedFiles=[]}={}) {
    const rows=(changedFiles||[]).map(visualFileAuthority),safe=rows.filter(row=>row.safe).map(row=>row.file),blocked=rows.filter(row=>!row.safe);
    return Object.freeze({pass:safe.length>0&&blocked.length===0,implementationCredit:safe.length>0,visualFiles:Object.freeze(safe),blocked:Object.freeze(blocked),authority:'PRESENTATION_ONLY'});
  }

  function sameConditions(conditions = {}) {
    return ['sameDevice','sameScene','sameCharacter','sameInput','samePerformanceLimit'].every((key) => conditions[key] === true);
  }

  function evaluateGraphicsExperiment({ baseline, candidates=[], conditions={} } = {}) {
    if (!sameConditions(conditions)) return Object.freeze({ pass:false, reason:'CONDITIONS_MISMATCH', winner:null, comparisons:[] });
    const baseScore = graphicsScore(baseline?.evidence ?? {}).total;
    const comparisons = candidates.map((candidate) => {
      const validation = validateVisualCandidate(candidate);
      const anomalies = detectVisualAnomalies(candidate.observation ?? {});
      const score = graphicsScore(candidate.evidence ?? {}).total;
      const performancePass = candidate.performancePass !== false;
      const inputPass = candidate.inputPass !== false;
      const licenses = (candidate.externalAssets ?? []).map(validateAssetLicense);
      const licensePass = licenses.every((item) => item.pass);
      const pass = validation.pass && anomalies.length === 0 && performancePass && inputPass && licensePass && score > baseScore;
      return Object.freeze({ id:candidate.id ?? null, variant:candidate.variant ?? null, score, delta:Math.round((score-baseScore)*100)/100, pass, validation, anomalies, performancePass, inputPass, licensePass });
    }).sort((a,b) => Number(b.pass)-Number(a.pass) || b.score-a.score);
    const winner = comparisons.find(({ pass }) => pass) ?? null;
    return Object.freeze({ pass:Boolean(winner), reason:winner ? 'CANDIDATE_IMPROVED' : 'NO_VERIFIED_IMPROVEMENT', baselineScore:baseScore, winner, comparisons:Object.freeze(comparisons) });
  }

  function graphicsDnaPromotion(records = []) {
    const successful = records.filter((record) => record?.verified === true && record?.regressionPass === true && record?.performancePass === true);
    const games = new Set(successful.map(({ gameId }) => gameId).filter(Boolean));
    const contexts = new Set(successful.map((record) => record.context ?? record.genre ?? record.archetype ?? null).filter(Boolean));
    const eligible = games.size >= 3 && contexts.size >= 2;
    return Object.freeze({
      stage:eligible ? 'MULTI_GAME_VERIFIED' : games.size > 0 ? 'GAME_VERIFIED' : 'PROPOSED',
      companyStandardEligible:eligible,
      uniqueGames:games.size,
      uniqueContexts:contexts.size,
      selfPromoteAllowed:false,
      requiresJayVerdict:true,
    });
  }

  function createStyleDna({ graphics=null, motion=null, palette=null, silhouette=null, vfx=null, ui=null, camera=null, soundTiming=null, signatureScene=null } = {}) {
    return Object.freeze({ graphics, motion, palette, silhouette, vfx, ui, camera, soundTiming, signatureScene });
  }


  // Web overlay for confirmed presentation events; the game retains its renderer.
  function createWebPresentationController({
    host,documentRef=(typeof document!=='undefined'?document:null),
    reducedMotion=false,maxDamagePopups=36,maxToasts=3,safeInsets={},skin={}
  }={}){
    if(!host||!documentRef||typeof documentRef.createElement!=='function'
      ||typeof host.appendChild!=='function')return Object.freeze({ready:false,reason:'EXISTING_DOM_HOST_REQUIRED'});
    const doc=documentRef,changedHostPosition=!host.style.position;
    const ink=typeof skin.ink==='string'?skin.ink:'#f4f6fa';
    const panel=typeof skin.panel==='string'?skin.panel:'rgba(19,23,34,.95)';
    const edge=typeof skin.edge==='string'?skin.edge:'rgba(188,199,220,.68)';
    const corner=Number.isFinite(Number(skin.corner))?Math.max(0,Math.min(24,Number(skin.corner))):9;
    if(changedHostPosition)host.style.position='relative';
    const stage=doc.createElement('div');
    Object.assign(stage.style,{position:'absolute',inset:'0',zIndex:'120',pointerEvents:'none',
      overflow:'hidden',fontFamily:'inherit',contain:'layout style'});
    stage.setAttribute('data-vibe-presentation-overlay','true');
    host.appendChild(stage);
    const damage=new Map(),toasts=[],timers=new Set(),icons=new Map(),seen=new Map();
    let tooltip=null,destroyed=false;
    const timer=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!destroyed)fn();},ms);timers.add(id);return id;};
    const dimensions=()=>({width:host.clientWidth||host.offsetWidth||1,height:host.clientHeight||host.offsetHeight||1});
    const clampTo=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number(v)||0));
    const make=(name,css,textValue='')=>{
      const node=doc.createElement(name);Object.assign(node.style,css);
      node.textContent=String(textValue);stage.appendChild(node);return node;
    };
    const remove=node=>{if(node&&node.parentNode)node.parentNode.removeChild(node);};
    const colorFor=kind=>({
      CRITICAL:'#ffe79e',HEAL:'#81f4bc',SHIELD:'#8bddff',DOT:'#dac7ff',
      MISS:'#f5f4ee',BLOCK:'#c3d5ff',DAMAGE:'#fff6ee'
    })[String(kind||'DAMAGE').toUpperCase()]||'#fff6ee';
    const animate=(node,keyframes,duration,onDone)=>{
      if(!reducedMotion&&typeof node.animate==='function'){
        const a=node.animate(keyframes,{duration,fill:'forwards',easing:'cubic-bezier(.16,.78,.26,1)'});
        a.onfinish=onDone;return a;
      }
      timer(onDone,reducedMotion?200:duration);return null;
    };
    function showDamage({eventId,amount,x,y,kind='DAMAGE',confirmed=false}={}){
      if(destroyed||confirmed!==true||!eventId||!Number.isFinite(Number(amount)))return false;
      const now=Date.now();
      for(const [id,expiry] of seen)if(expiry<=now)seen.delete(id);
      if(seen.has(eventId))return false;
      const view=dimensions(),px=Number(x),py=Number(y);
      if(!Number.isFinite(px)||!Number.isFinite(py)||px<0||py<0||px>view.width||py>view.height)return false;
      if(damage.size>=Math.max(1,Math.floor(maxDamagePopups)))return false;
      seen.set(eventId,now+4500);
      if(seen.size>300)seen.delete(seen.keys().next().value);
      const type=String(kind).toUpperCase(),isCrit=type==='CRITICAL',dx=((damage.size%5)-2)*17;
      const safeX=clampTo(px+dx,Math.min(65,view.width/2),Math.max(view.width/2,view.width-65));
      const safeY=clampTo(py,Math.min(26,view.height/2),Math.max(view.height/2,view.height-26));
      const pos='translate('+String(safeX)+'px,'+String(safeY)+'px) translate(-50%,-50%)';
      const node=make('span',{
        position:'absolute',left:'0',top:'0',transform:pos,
        fontSize:isCrit?'27px':'19px',fontWeight:'900',lineHeight:'1',
        color:colorFor(type),letterSpacing:'.02em',textShadow:'0 2px 2px #10121e, 0 0 5px #14151c',
        whiteSpace:'nowrap',userSelect:'none',willChange:'transform, opacity',pointerEvents:'none'
      },type==='MISS'?'MISS':(type==='HEAL'?'+':'')+Math.round(Number(amount)).toLocaleString('en-US'));
      damage.set(eventId,node);
      const end=()=>{if(damage.get(eventId)===node)damage.delete(eventId);remove(node);};
      if(reducedMotion){timer(end,280);return true;}
      const move=(x,y,scale)=>'translate('+x+'px,'+y+'px) translate(-50%,-50%) scale('+scale+')';
      animate(node,[
        {opacity:0,transform:move(safeX,safeY+9,.75)},
        {opacity:1,offset:.18,transform:move(safeX,safeY-16,isCrit?1.38:1.06)},
        {opacity:0,transform:move(safeX+Math.min(12,Math.max(0,view.width-safeX-65)),Math.max(18,safeY-65),1)}
      ],isCrit?940:740,end);
      timer(end,1300);return true;
    }
    function hideTooltip(){if(tooltip){remove(tooltip);tooltip=null;}}
    function showTooltip({text='',anchorRect,width=270,kind='INFO'}={}){
      if(destroyed||!anchorRect)return false;
      const x=Number(anchorRect.x),y=Number(anchorRect.y),
        aw=Number(anchorRect.width),ah=Number(anchorRect.height);
      if(![x,y,aw,ah].every(Number.isFinite))return false;
      hideTooltip();
      const v=dimensions(),w=clampTo(width,120,Math.max(120,v.width-16)),
        left=clampTo(x+aw/2-w/2,Number(safeInsets.left)||8,
          Math.max(0,v.width-w-(Number(safeInsets.right)||8)));
      const hasBelow=y+ah+130<v.height-(Number(safeInsets.bottom)||8);
      const top=hasBelow?y+ah+8:Math.max(Number(safeInsets.top)||8,y-134);
      const node=make('div',{
        position:'absolute',left:left+'px',top:top+'px',width:w+'px',
        maxHeight:Math.max(60,v.height-top-8)+'px',overflowY:'auto',boxSizing:'border-box',
        padding:'12px 14px',background:panel,
        border:'1px solid '+edge,borderRadius:corner+'px',
        color:ink,fontSize:'14px',lineHeight:'1.45',textShadow:'0 1px 1px #151515',
        boxShadow:'0 10px 30px rgba(0,0,0,.32)',whiteSpace:'pre-wrap',
        overflowWrap:'anywhere',pointerEvents:'none'
      },String(text).slice(0,2200));
      node.setAttribute('role','tooltip');node.setAttribute('data-kind',String(kind).slice(0,24));
      tooltip=node;
      if(!reducedMotion)animate(node,[{opacity:0},{opacity:1}],160,()=>{});
      return true;
    }
    function notify({id,text='',kind='INFO',durationMs=2400}={}){
      if(destroyed||!id||toasts.some(row=>row.id===id))return false;
      const v=dimensions(),node=make('div',{
        position:'absolute',right:(Number(safeInsets.right)||8)+'px',
        top:'0',width:Math.min(310,v.width-16)+'px',
        maxWidth:'calc(100% - 16px)',boxSizing:'border-box',padding:'10px 12px',
        borderLeft:'3px solid '+colorFor(kind),background:panel,
        color:ink,fontSize:'14px',fontWeight:'600',borderRadius:corner+'px',
        boxShadow:'0 4px 18px rgba(0,0,0,.25)',whiteSpace:'pre-wrap',overflowWrap:'anywhere'
      },String(text).slice(0,500));
      toasts.push({id,node});
      if(!reducedMotion)animate(node,[
        {opacity:0,transform:'translateX(16px)'},
        {opacity:1,transform:'translateX(0)'}
      ],230,()=>{});
      const maximum=Math.max(1,Math.floor(maxToasts));
      while(toasts.length>maximum){const old=toasts.shift();remove(old.node);}
      reflowRichHud();
      timer(()=>{const index=toasts.findIndex(row=>row.id===id);if(index>=0){
        remove(toasts[index].node);toasts.splice(index,1);
        reflowRichHud();
      }},clampTo(durationMs,300,8000));
      return true;
    }
    function animateIcon(element,state='READY'){
      if(destroyed||!element||typeof element.animate!=='function')return false;
      const previous=icons.get(element);if(previous&&previous.cancel)previous.cancel();
      const type=String(state).toUpperCase();
      const frames=type==='ACTIVATE'?[{transform:'scale(.88) rotate(-6deg)'},{transform:'scale(1.18) rotate(5deg)'},{transform:'scale(1) rotate(0)'}]:
        type==='COOLDOWN'?[{opacity:1,filter:'grayscale(0)'},{opacity:.55,filter:'grayscale(.7)'}]:
        type==='READY'?[{transform:'scale(.92)',opacity:.8},{transform:'scale(1)',opacity:1}]:
        type==='ALERT'?[{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}]:null;
      if(!frames)return false;
      const a=element.animate(reducedMotion?[{opacity:1},{opacity:1}]:frames,{
        duration:reducedMotion?1:260,fill:'forwards',easing:'ease-out'});
      icons.set(element,a);return true;
    }
    function updateStatusIcon(element,{remaining=0,total=0,stacks=0}={}){
      if(destroyed||!element||!element.style)return false;
      const ratio=total>0?clampTo(remaining/total,0,1):0,stackCount=Math.max(0,Math.floor(Number(stacks)||0));
      element.style.setProperty('--vibe-status-ratio',String(ratio));
      element.setAttribute('data-vibe-stacks',String(stackCount));
      element.setAttribute('aria-label','Effect '+Math.round(ratio*100)+'% remaining, stacks '+stackCount);
      return true;
    }

    // Read-only commercial HUD: every state comes from confirmed game events.
    // These elements never own hit, quest, skill, save, or network decisions.
    const rich={boss:null,objective:null,status:null,warnings:new Map(),warningSeen:new Map()};
    const topInset=()=>Math.max(0,Number(safeInsets.top)||0)+8;
    const outerInset=side=>Math.max(0,Number(safeInsets[side])||0)+8;
    function reflowRichHud(){
      const v=dimensions(),narrow=v.width<600,top=topInset();
      if(rich.boss)rich.boss.node.style.top=top+'px';
      const objectiveTop=top+(rich.boss?82:0);
      if(rich.objective){
        rich.objective.node.style.top=objectiveTop+'px';
        rich.objective.node.style.left=outerInset('left')+'px';
      }
      const statusTop=objectiveTop+(rich.objective?72:0);
      if(rich.status){
        rich.status.style.top=statusTop+'px';
        rich.status.style.left=outerInset('left')+'px';
      }
      let toastTop=narrow?statusTop+(rich.status?Math.max(54,Number(rich.status.offsetHeight)||54):0)+(rich.objective||rich.boss?8:0)
        :top+(rich.boss?82:0);
      for(const row of toasts){
        row.node.style.top=toastTop+'px';
        toastTop+=Math.max(62,Number(row.node.offsetHeight)||68)+6;
      }
    }
    function clearBossHud(){
      if(destroyed||!rich.boss)return false;
      remove(rich.boss.node);rich.boss=null;reflowRichHud();return true;
    }
    function updateBossHud({
      id,name='',current,max,phase='',telegraph='',confirmed=false,visible=true
    }={}){
      if(destroyed||confirmed!==true||!String(id||'').trim())return false;
      if(visible===false)return clearBossHud();
      const hp=Number(current),limit=Number(max);
      if(!Number.isFinite(hp)||!Number.isFinite(limit)||limit<=0||hp<0)return false;
      if(!rich.boss||rich.boss.id!==id){
        if(rich.boss)remove(rich.boss.node);
        const node=make('div',{
          position:'absolute',left:'50%',transform:'translateX(-50%)',top:topInset()+'px',
          width:'min(440px, calc(100% - 24px))',maxWidth:'calc(100% - 24px)',
          boxSizing:'border-box',padding:'9px 13px 10px',background:panel,
          border:'1px solid '+edge,borderRadius:corner+'px',
          boxShadow:'0 5px 22px rgba(0,0,0,.34)',color:ink,textAlign:'center',
          userSelect:'none',pointerEvents:'none'
        });
        node.setAttribute('role','status');node.setAttribute('data-vibe-boss-hud','true');
        const title=doc.createElement('div');
        Object.assign(title.style,{fontSize:'14px',fontWeight:'800',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'});
        const barTrack=doc.createElement('div');
        Object.assign(barTrack.style,{height:'12px',marginTop:'6px',overflow:'hidden',
          borderRadius:'5px',background:'rgba(0,0,0,.55)',border:'1px solid '+edge});
        const bar=doc.createElement('div');
        Object.assign(bar.style,{height:'100%',width:'0%',background:'linear-gradient(90deg,#b42546,#f46b62)',
          transition:reducedMotion?'none':'width 180ms ease-out'});
        barTrack.appendChild(bar);
        const detail=doc.createElement('div');
        Object.assign(detail.style,{fontSize:'11px',opacity:'.94',marginTop:'5px',
          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'});
        node.appendChild(title);node.appendChild(barTrack);node.appendChild(detail);
        rich.boss={id,node,title,bar,detail,phase:null};reflowRichHud();
      }
      const b=rich.boss,changedPhase=b.phase!==null&&String(phase)!==b.phase;
      b.phase=String(phase);
      b.title.textContent=String(name||id).slice(0,90);
      b.bar.style.width=(Math.max(0,Math.min(1,hp/limit))*100).toFixed(2)+'%';
      b.detail.textContent=(phase!==''?'PHASE '+String(phase).slice(0,18)+'  •  ':'')
        +Math.round(hp).toLocaleString('en-US')+' / '+Math.round(limit).toLocaleString('en-US')
        +(telegraph?'  •  '+String(telegraph).slice(0,46):'');
      b.node.setAttribute('aria-label',b.title.textContent+', '+Math.round(hp/limit*100)+'% HP');
      b.node.setAttribute('data-vibe-boss-phase',String(phase).slice(0,24));
      if(changedPhase&&!reducedMotion)animate(b.node,[
        {opacity:.72,filter:'brightness(1.8)'},{opacity:1,filter:'brightness(1)'}
      ],360,()=>{});
      return true;
    }
    function updateObjectiveHud({
      id,title='',detail='',completed=0,total=0,confirmed=false,visible=true
    }={}){
      if(destroyed||confirmed!==true||!String(id||'').trim())return false;
      if(visible===false){
        if(!rich.objective)return false;
        remove(rich.objective.node);rich.objective=null;reflowRichHud();return true;
      }
      const progress=Number(completed),maximum=Number(total);
      if(!Number.isFinite(progress)||!Number.isFinite(maximum)||progress<0||maximum<0)return false;
      if(!rich.objective){
        const node=make('div',{
          position:'absolute',left:outerInset('left')+'px',top:topInset()+'px',
          width:'min(230px, calc(100% - 24px))',boxSizing:'border-box',
          padding:'9px 11px',background:panel,border:'1px solid '+edge,
          borderRadius:corner+'px',color:ink,
          boxShadow:'0 5px 15px rgba(0,0,0,.25)',pointerEvents:'none'
        });
        node.setAttribute('role','status');node.setAttribute('data-vibe-objective-hud','true');
        const header=doc.createElement('div'),body=doc.createElement('div');
        const track=doc.createElement('div'),fill=doc.createElement('div');
        Object.assign(header.style,{fontSize:'13px',fontWeight:'800',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'});
        Object.assign(body.style,{fontSize:'11px',opacity:'.9',marginTop:'4px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'});
        Object.assign(track.style,{height:'4px',background:'rgba(255,255,255,.2)',borderRadius:'3px',marginTop:'6px',overflow:'hidden'});
        Object.assign(fill.style,{height:'100%',width:'0%',background:'#80cfff',
          transition:reducedMotion?'none':'width 200ms ease-out'});
        track.appendChild(fill);node.appendChild(header);node.appendChild(body);node.appendChild(track);
        rich.objective={node,header,body,fill};reflowRichHud();
      }
      rich.objective.header.textContent=String(title||id).slice(0,90);
      rich.objective.body.textContent=String(detail).slice(0,130)
        +(maximum>0?'  '+Math.min(Math.round(progress),Math.round(maximum))+'/'+Math.round(maximum):'');
      rich.objective.fill.style.width=(maximum>0?Math.min(100,progress/maximum*100):0).toFixed(1)+'%';
      return true;
    }
    function updateStatusTray({effects=[],confirmed=false}={}){
      if(destroyed||confirmed!==true||!Array.isArray(effects))return false;
      const limit=dimensions().width<600?6:10,items=[],ids=new Set();
      for(const effect of effects){
        const id=String(effect?.id||'').trim(),remaining=Number(effect?.remaining),total=Number(effect?.total);
        if(!id||ids.has(id)||!Number.isFinite(remaining)||!Number.isFinite(total)
          ||remaining<=0||total<=0)continue;
        ids.add(id);items.push({id,name:String(effect.name||id).slice(0,32),
          remaining:Math.max(0,remaining),total,stacks:Math.max(0,Math.floor(Number(effect.stacks)||0))});
        if(items.length>=limit)break;
      }
      if(!items.length){
        if(rich.status)remove(rich.status);
        rich.status=null;reflowRichHud();return true;
      }
      if(!rich.status){
        rich.status=make('div',{position:'absolute',left:outerInset('left')+'px',
          display:'flex',flexWrap:'wrap',gap:'4px',maxWidth:'min(310px, calc(100% - 24px))',
          color:ink,pointerEvents:'none'});
        rich.status.setAttribute('data-vibe-status-tray','true');reflowRichHud();
      }
      while(rich.status.firstChild)rich.status.removeChild(rich.status.firstChild);
      for(const item of items){
        const node=doc.createElement('span'),ratio=Math.min(1,item.remaining/item.total);
        Object.assign(node.style,{display:'inline-block',padding:'4px 7px',fontSize:'11px',
          fontWeight:'700',borderRadius:'6px',border:'1px solid '+edge,background:panel,
          boxShadow:'inset 0 -3px 0 '+(ratio<.2?'#f2a562':'#80cfff'),
          maxWidth:'118px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'});
        node.textContent=item.name+' '+Math.ceil(item.remaining)+'s'+(item.stacks>1?' ×'+item.stacks:'');
        node.setAttribute('aria-label',item.name+' '+Math.ceil(item.remaining)+' seconds remaining');
        node.setAttribute('data-vibe-effect-id',item.id.slice(0,80));
        rich.status.appendChild(node);
      }
      return true;
    }
    function showDirectionWarning({
      eventId,angle,kind='DANGER',durationMs=1100,confirmed=false
    }={}){
      if(destroyed||confirmed!==true||!eventId||!Number.isFinite(Number(angle)))return false;
      const now=Date.now();
      for(const [id,expires] of rich.warningSeen)if(expires<=now)rich.warningSeen.delete(id);
      if(rich.warningSeen.has(eventId)||rich.warnings.size>=4)return false;
      const v=dimensions(),radians=Number(angle)*Math.PI/180;
      const px=clampTo(v.width/2+Math.cos(radians)*Math.max(0,v.width/2-34),
        outerInset('left')+17,Math.max(outerInset('left')+17,v.width-outerInset('right')-17));
      const py=clampTo(v.height/2+Math.sin(radians)*Math.max(0,v.height/2-34),
        topInset()+17,Math.max(topInset()+17,v.height-outerInset('bottom')-17));
      const node=make('div',{
        position:'absolute',left:px+'px',top:py+'px',transform:'translate(-50%,-50%) rotate('+(Number(angle)+90)+'deg)',
        fontSize:'29px',fontWeight:'900',lineHeight:'1',color:colorFor(kind),
        textShadow:'0 0 8px #0c0f19, 0 0 13px #9b2e23',
        pointerEvents:'none',userSelect:'none'
      },'▲');
      node.setAttribute('role','img');node.setAttribute('aria-label','Incoming threat direction');
      node.setAttribute('data-vibe-threat-event',String(eventId).slice(0,96));
      rich.warningSeen.set(eventId,now+3500);
      if(rich.warningSeen.size>150)rich.warningSeen.delete(rich.warningSeen.keys().next().value);
      rich.warnings.set(eventId,node);
      if(!reducedMotion)animate(node,[
        {opacity:.35,filter:'brightness(1)'},{opacity:1,offset:.4,filter:'brightness(1.6)'},
        {opacity:0,filter:'brightness(1)'}
      ],clampTo(durationMs,250,2200),()=>{});
      timer(()=>{if(rich.warnings.get(eventId)===node){rich.warnings.delete(eventId);remove(node);}},
        reducedMotion?300:clampTo(durationMs,250,2200));
      return true;
    }
    function destroy(){
      if(destroyed)return;destroyed=true;
      for(const id of timers)clearTimeout(id);timers.clear();
      for(const animation of icons.values())if(animation&&animation.cancel)animation.cancel();
      icons.clear();damage.clear();seen.clear();toasts.length=0;tooltip=null;
      rich.warnings.clear();rich.warningSeen.clear();rich.boss=null;rich.objective=null;rich.status=null;remove(stage);
      if(changedHostPosition&&host.style.position==='relative')host.style.position='';
    }
    return Object.freeze({ready:true,showDamage,showTooltip,hideTooltip,notify,animateIcon,
      updateStatusIcon,updateBossHud,clearBossHud,updateObjectiveHud,updateStatusTray,
      showDirectionWarning,destroy,
      stats:()=>Object.freeze({activeDamage:damage.size,activeNotices:toasts.length,
        activeWarnings:rich.warnings.size,bossVisible:Boolean(rich.boss),
        objectiveVisible:Boolean(rich.objective),activeStatusEffects:rich.status?rich.status.children.length:0,
        tooltipVisible:Boolean(tooltip),destroyed}),
      authority:'WEB_PRESENTATION_ONLY_NO_GAMEPLAY_MUTATION'});
  }

  return Object.freeze({
    version:VERSION,
    STRATEGIES,
    TIERS,
    DNA_LEVELS,
    SCORE_WEIGHTS,
    createGraphicsProfile,
    classifyAsset,
    validateAssetLicense,
    validateVisualCandidate,
    deviceVisualBudget,
    graphicsScore,
    detectVisualAnomalies,
    inferVisualAnomalies,
    visualFileAuthority,
    planGraphicsImplementation,
    graphicsImplementationImpact,
    evaluateGraphicsExperiment,
    graphicsDnaPromotion,
    createStyleDna,
    createWebPresentationController,
  });
});
