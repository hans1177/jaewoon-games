// Publish one GitHub Pages site from verified main, without changing original games.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT_PATHS=['game-catalog.json','manifest.webmanifest','company-status.json','game-artbooks.json',
  'homepage-portfolio-status.json','homepage-platform-exposure.json','test-game-candidates.json',
  'public-release-baselines.json','install.html','offline.html','company.html','command.html'];
const WEB_ASSET_SUBTREES=new Set(['shared','homepage-covers','homepage-media']);
const TEXT_FILE=/\.(?:html?|css|js|mjs|json|webmanifest|svg)$/i;
const ROOT_ASSET_PATH=/^(?:assets|web-games|multiplayer)\//;
const ROOT_DOCUMENT_PATH=/^(?:game-catalog\.json|manifest\.webmanifest|company-status\.json|game-artbooks\.json|homepage-portfolio-status\.json|homepage-platform-exposure\.json|test-game-candidates\.json|public-release-baselines\.json|install\.html|offline\.html|company\.html|command\.html)$/;
function isRegularFile(file){
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink())throw new Error('GITHUB_PAGES_SYMLINK_FORBIDDEN:'+file);
  return stat.isFile();
}
function copyTree(from,to){
  if(!fs.existsSync(from))throw new Error('GITHUB_PAGES_SOURCE_MISSING:'+from);
  const stat=fs.lstatSync(from);
  if(stat.isSymbolicLink())throw new Error('GITHUB_PAGES_SYMLINK_FORBIDDEN:'+from);
  if(stat.isDirectory()){
    fs.mkdirSync(to,{recursive:true});
    for(const entry of fs.readdirSync(from,{withFileTypes:true}))copyTree(path.join(from,entry.name),path.join(to,entry.name));
  }else if(stat.isFile()){
    fs.mkdirSync(path.dirname(to),{recursive:true});
    fs.copyFileSync(from,to);
  }
}
function rewriteRootReferences(content,prefix){
  // Only rewrite known root-relative static URL references; never storage keys or API addresses.
  return String(content).replace(/(["'\x60(])\/(assets\/[^"'\x60\s)<]*|web-games\/[^"'\x60\s)<]*|multiplayer\/[^"'\x60\s)<]*|[A-Za-z][A-Za-z0-9._-]*\.(?:json|webmanifest|html))(?=["'\x60)\s])/g,
    (whole,opening,value)=>{
      if(!ROOT_ASSET_PATH.test(value)&&!ROOT_DOCUMENT_PATH.test(value))return whole;
      return opening+prefix+'/'+value;
    });
}
export function buildGithubPagesWeb({root='.',out='_site',sourceSha='',repository='hans1177/jaewoon-games'}={}){
  const src=path.resolve(root),dst=path.resolve(out),games=path.join(src,'web-games');
  const sha=String(sourceSha||'').trim();
  if(!/^[a-f0-9]{40}$/i.test(sha))throw new Error('GITHUB_PAGES_EXACT_SOURCE_SHA_REQUIRED');
  const repo=String(repository||'').trim();
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('GITHUB_PAGES_REPOSITORY_INVALID');
  if(dst===src||dst.startsWith(src+path.sep)&&games.startsWith(dst+path.sep))throw new Error('GITHUB_PAGES_OUTPUT_OVERLAPS_SOURCE');
  if(!fs.existsSync(games)||!fs.existsSync(path.join(games,'fantasy-survival','index.html')))
    throw new Error('GITHUB_PAGES_EXISTING_FOREST_SOURCE_REQUIRED');
  fs.rmSync(dst,{recursive:true,force:true});
  copyTree(games,path.join(dst,'web-games'));
  const assetRoot=path.join(src,'assets');
  if(fs.existsSync(assetRoot)){
    for(const name of fs.readdirSync(assetRoot)){
      const source=path.join(assetRoot,name);
      if(isRegularFile(source)||WEB_ASSET_SUBTREES.has(name))
        copyTree(source,path.join(dst,'assets',name));
    }
  }
  for(const name of ROOT_PATHS){
    const file=path.join(src,name);
    if(fs.existsSync(file)&&isRegularFile(file))copyTree(file,path.join(dst,name));
  }
  // Keep the current forest root URL, and publish every other game under web-games/<id>/.
  copyTree(path.join(games,'fantasy-survival','index.html'),path.join(dst,'index.html'));
  copyTree(path.join(games,'fantasy-survival','tier.html'),path.join(dst,'tier.html'));
  fs.writeFileSync(path.join(dst,'.nojekyll'),'');
  const prefix='/'+repo.split('/')[1];
  const rewrite=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())rewrite(full);
      else if(entry.isFile()&&TEXT_FILE.test(entry.name)){
        const old=fs.readFileSync(full,'utf8');
        const updated=rewriteRootReferences(old,prefix);
        if(updated!==old)fs.writeFileSync(full,updated,'utf8');
      }
    }
  };
  rewrite(dst);
  const gameIds=fs.readdirSync(path.join(dst,'web-games'),{withFileTypes:true})
    .filter(x=>x.isDirectory()&&x.name!=='_shared'&&fs.existsSync(path.join(dst,'web-games',x.name,'index.html')))
    .map(x=>x.name).sort();
  if(!gameIds.includes('fantasy-survival')||gameIds.length===0)throw new Error('GITHUB_PAGES_NO_GAMES');
  const manifest={
    version:1,source:'EXACT_VERIFIED_MAIN',sourceSha:sha,repository:repo,
    target:'GITHUB_PAGES',routePrefix:prefix,gameCount:gameIds.length,gameIds,
    releaseQaBypassed:false,gameSourceChanged:false,cloudflareDeploymentRequired:false
  };
  fs.writeFileSync(path.join(dst,'.github-pages-build.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
function parseArgs(args){
  const obj={};
  for(const raw of args){const match=/^--([a-z-]+)=(.*)$/.exec(raw);if(match)obj[match[1]]=match[2];}
  return obj;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=parseArgs(process.argv.slice(2));
  const result=buildGithubPagesWeb({
    root:args.root||'.',out:args.out||'_site',sourceSha:args['source-sha']||process.env.GITHUB_SHA||'',
    repository:args.repository||process.env.GITHUB_REPOSITORY||'hans1177/jaewoon-games'
  });
  console.log('GITHUB_PAGES_GAME_COUNT='+result.gameCount);
  console.log('GITHUB_PAGES_SOURCE_SHA='+result.sourceSha);
  console.log('GITHUB_PAGES_DEPLOYMENT_VERIFIED=NO_UNTIL_REMOTE_HTTP_AND_SHA');
}
