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

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
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
  });
});
