// Enforce source-to-publication UI provenance for every hosted WEB game.
// Only the game's canonical HTML is allowed to authorize UI buttons/scripts.
// Do NOT confuse this with 3D model selection or successful browser playability.
import fs from 'node:fs';
import path from 'node:path';

const inlineScripts = html => [...String(html).matchAll(/<script\b[^>]*>/gi)].map(m=>m[0]);
const buttons = html => [...String(html).matchAll(/<button\b[^>]*>/gi)].length;
const scriptSource = tag => {
  const match=/\bsrc\s*=\s*(['"])(.*?)\1/i.exec(tag);
  if(!match)return '';
  const raw=match[2].trim();
  return raw.replace(/^\/jaewoon-games(?=\/)/i,'').replace(/[?#].*$/,'');
};
const suspicious = /vibe-runtime-panel\.js|vibe-assets-launcher|vibe-assets-panel|data-vibe-owner-inspector\s*=|data-dev-(?:asset|inspector|overlay)/i;

export function inspectPublicGameUi({sourceHtml='',publishedHtml='',gameId=''}={}){
  const original=String(sourceHtml),published=String(publishedHtml);
  const errorCodes=[];
  if(!original.trim()||!published.trim())errorCodes.push('MISSING_CANONICAL_OR_PUBLISHED_HTML');
  if(suspicious.test(published))errorCodes.push('UNAUTHORIZED_DEV_INSPECTOR_ON_PUBLIC_GAME');
  const oldTags=inlineScripts(original),newTags=inlineScripts(published);
  if(newTags.length>oldTags.length)errorCodes.push('UNAUTHORIZED_SCRIPT_TAG_IN_PUBLISHED_GAME');
  const approved=oldTags.map(scriptSource).sort(),generated=newTags.map(scriptSource).sort();
  // Compare script multiset, including inline scripts. Rewrites of the Pages
  // project URL prefix are allowed; introducing another script is not.
  const remaining=[...approved],injected=[];
  for(const entry of generated){
    const index=remaining.indexOf(entry);
    if(index<0)injected.push(entry||'(inline)');
    else remaining.splice(index,1);
  }
  if(injected.length)errorCodes.push('UNAPPROVED_GAME_SCRIPT_DEPENDENCY');
  const addedButtons=buttons(published)-buttons(original);
  if(addedButtons>0)errorCodes.push('UNAUTHORIZED_PUBLIC_GAME_BUTTON_GENERATION');
  return {
    gameId:String(gameId),
    passed:errorCodes.length===0,
    errorCodes:[...new Set(errorCodes)],
    stage:'PUBLICATION_HTML_ASSEMBLY',
    causeClass:errorCodes.length?'DEPLOYMENT_TEMPLATE_OR_ARTIFACT_INJECTION':'CANONICAL_UI_PRESERVED',
    source:{buttonCount:buttons(original),scriptCount:oldTags.length},
    published:{buttonCount:buttons(published),scriptCount:newTags.length},
    unexpectedScripts:injected,
    ownerGameInputUnchanged:true
  };
}

export function verifyPublicGameUiRoutes({sourceRoot='web-games',publishedRoot='_site/web-games',manifest}={}){
  if(!manifest||!Array.isArray(manifest.routes)||!manifest.routes.length)
    throw Error('PUBLIC_GAME_UI_MANIFEST_MISSING');
  const results=[];
  for(const route of manifest.routes){
    if(!/^web-games\/[a-z0-9-]+\/$/.test(route))
      throw Error('PUBLIC_GAME_UI_ROUTE_INVALID:'+String(route));
    const id=route.split('/')[1];
    const original=path.join(sourceRoot,id,'index.html');
    const generated=path.join(publishedRoot,id,'index.html');
    const inspect=inspectPublicGameUi({
      sourceHtml:fs.readFileSync(original,'utf8'),
      publishedHtml:fs.readFileSync(generated,'utf8'),gameId:id
    });
    results.push(inspect);
    if(!inspect.passed){
      const codes=inspect.errorCodes.join(',');
      throw Error('PUBLIC_GAME_UI_PROVENANCE_FAIL:'+id+':'+codes+
        ' (stage=PUBLICATION_HTML_ASSEMBLY; not a model-selection failure)');
    }
  }
  return{passed:true,checkedGames:results.length,checks:results,
    guarantee:'NO_UNAUTHORIZED_DEPLOYMENT_ADDED_SCRIPT_OR_BUTTON'};
}

if(process.argv[1]&&/vibe2-public-game-ui-provenance\.mjs$/.test(process.argv[1])){
  const args=Object.fromEntries(process.argv.slice(2).map(s=>s.split('=',2))
    .filter(pair=>pair.length===2&&pair[0].startsWith('--')));
  const manifest=JSON.parse(fs.readFileSync(args['--manifest']||'_site/web-games/publish-manifest.json','utf8'));
  const result=verifyPublicGameUiRoutes({
    sourceRoot:args['--source']||'web-games',
    publishedRoot:args['--published']||'_site/web-games',
    manifest
  });
  process.stdout.write('PUBLIC_GAME_UI_PROVENANCE=PASS games='+result.checkedGames+'\n');
}
