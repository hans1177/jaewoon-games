// 파일명: tools/horror-manor-studio-review.mjs
// 이 작업에서 연 저택 파일만 공식 Studio MCP로 확인한다.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
const output=process.env.MANOR_REVIEW_OUT;fs.mkdirSync(output,{recursive:true});
const child=spawn(process.env.MANOR_MCP_EXE,[],{stdio:['pipe','pipe','pipe'],windowsHide:true});
const pending=new Map();let serial=0;
child.stderr.on('data',()=>{});
const send=x=>child.stdin.write(JSON.stringify(x)+'\n');
readline.createInterface({input:child.stdout}).on('line',line=>{let m;try{m=JSON.parse(line);}catch{return;}
 if(m.method==='ping'&&m.id!==undefined){send({jsonrpc:'2.0',id:m.id,result:{}});return;}
 const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
});
function request(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error('MCP_TIMEOUT:'+method));},45000);pending.set(id,{resolve,reject,timer});send({jsonrpc:'2.0',id,method,params});});}
try{
 await request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'midnight-manor-review',version:'1.0'}});
 send({jsonrpc:'2.0',method:'notifications/initialized',params:{}});
 let catalog;
 for(let attempt=0;attempt<8;attempt++){
  catalog=await request('tools/list');
  if(catalog.tools?.some(t=>t.name==='list_roblox_studios'))break;
  await new Promise(r=>setTimeout(r,1500));
 }
 fs.writeFileSync(path.join(output,'mcp-tools.json'),JSON.stringify(catalog,null,2));
 console.log('MANOR_MCP_TOOLS='+catalog.tools?.map(x=>x.name).join(','));
 if(!catalog.tools?.some(t=>t.name==='list_roblox_studios'))throw Error('STUDIO_MCP_NOT_CONNECTED');
 const studios=await request('tools/call',{name:'list_roblox_studios',arguments:{}});
 fs.writeFileSync(path.join(output,'mcp-studios.json'),JSON.stringify(studios,null,2));
 console.log('MANOR_STUDIOS='+JSON.stringify(studios));
}finally{child.stdin.end();child.kill();}
