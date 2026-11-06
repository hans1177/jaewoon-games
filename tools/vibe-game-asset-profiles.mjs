// Vibe engine: deterministic per-game asset candidates. Never mutate gameplay or claim a renderer supports an asset.
export function buildGameAssetProfiles({routes,assets,catalog}){
  if(!Array.isArray(routes)||!Array.isArray(assets)||!Array.isArray(catalog?.games))throw Error('VIBE_ASSET_INPUT_INVALID');
  const gameById=new Map(catalog.games.map(g=>[String(g?.canonical?.identity?.gameId||g?.id||''),g]));
  const cleanAssets=[...new Set(assets.filter(p=>typeof p==='string'&&/^assets\/[a-zA-Z0-9._/-]+$/.test(p)&&!p.includes('..')))].sort();
  const role=p=>/\.(?:glb|gltf|fbx|obj)$/i.test(p)?'model':/\.(?:woff2?|ttf|otf)$/i.test(p)?'font':/\.(?:png|jpe?g|webp|svg|ktx2?)$/i.test(p)?'texture':/\.(?:mp3|ogg|wav)$/i.test(p)?'audio':/\.(?:mp4|webm)$/i.test(p)?'video':/\.(?:css)$/i.test(p)?'ui':/\.(?:json)$/i.test(p)?'data':'other';
  const keywords=game=>[game.id,game.name,...(Array.isArray(game.genre)?game.genre:[])].map(s=>String(s||'').toLowerCase()).flatMap(s=>s.split(/[^\p{L}\p{N}]+/u)).filter(s=>s.length>=3);
  return Object.fromEntries(routes.map(route=>{
    const match=/^web-games\/([a-z0-9-]+)\/$/.exec(route);
    if(!match||!gameById.has(match[1]))throw Error('VIBE_ASSET_UNKNOWN_GAME:'+route);
    const game=gameById.get(match[1]);const tokens=keywords(game);
    const candidates=cleanAssets.map(path=>{
      const lower=path.toLowerCase();const kind=role(path);
      const matched=tokens.filter(token=>lower.includes(token));
      const shared=/\/(?:common|shared|ui|fonts|interface|environment|materials)\//i.test(path);
      return {path,role:kind,score:matched.length*10+(shared?2:0),matched};
    }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
    return [match[1],{route,assetCandidates:candidates,availableAssetCount:cleanAssets.length,applicationStatus:'CANDIDATES_ONLY_REQUIRES_RUNTIME_QA'}];
  }));
}
