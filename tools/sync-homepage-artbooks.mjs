import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const root='artbook-submissions';
const registryPath='game-artbooks.json';
const registry=readJson(registryPath,{version:1,updatedAt:null,artbooks:[]});
const legacy=Array.isArray(registry.artbooks)?registry.artbooks:[];
const current=[];

if(fs.existsSync(root)){
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const file=path.join(root,entry.name,'current.json');
    const book=readJson(file,null);
    if(!book||book.published!==true||book.homepageVisible!==true||book.format!=='core-strategy'||!book.content)continue;
    const date=String(book.createdAt||book.date||'').slice(0,10);
    current.push({
      ...book,
      id:book.id||`${book.gameId}-${date||'current'}-core`,
      gameId:book.gameId||entry.name,
      createdAt:date||book.createdAt||null,
      status:'completed-artbook',
      published:true,
      homepageVisible:true,
      format:'core-strategy',
      sourceFile:file.replaceAll('\\','/')
    });
  }
}

const currentIds=new Set(current.map(x=>x.id));
const currentGameDates=new Set(current.map(x=>`${x.gameId}|${x.createdAt}|core-strategy`));
const preserved=legacy.filter(x=>!currentIds.has(x.id)&&!currentGameDates.has(`${x.gameId}|${String(x.createdAt||x.date||'').slice(0,10)}|${x.format||''}`));
const next={...registry,version:Math.max(15,Number(registry.version||0)+1),updatedAt:new Date().toISOString(),artbooks:[...preserved,...current]};
writeJson(registryPath,next);
console.log(`HOMEPAGE_ARTBOOK_SYNC=${current.length}`);
console.log('SOURCE=artbook-submissions/*/current.json');
