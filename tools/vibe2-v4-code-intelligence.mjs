// Vibe4: bounded, read-only source-flow hints for autonomous coding.
const name=/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
const fnRegex=/\b(?:local\s+)?function\s+([A-Za-z_$][\w$]*(?:[.:][A-Za-z_$][\w$]*)*)\s*\(/g;
const assignment=/\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(\+=|-=|\*=|\/=|=(?!=|>))/g;
const jsEvent=/\b([A-Za-z_$][\w$]*)\.addEventListener\s*\(\s*(['"])([^'"]+)\2\s*,\s*([A-Za-z_$][\w$]*)/g;
const luaEvent=/\b([A-Za-z_$][\w$.]*)\s*:\s*Connect\s*\(\s*([A-Za-z_$][\w$.]*)\s*\)/g;
export function analyzeVibe4CodeFlow({files=[],responsiblePaths=[],target=''}={}){
  if(!Array.isArray(files))throw Error('VIBE4_SOURCE_FILES_REQUIRED');
  const owners=new Set(responsiblePaths),result=[],maxSources=12;
  for(const file of files.slice(0,maxSources)){
    const filePath=String(file.path||''),source=String(file.source||'');
    if(!filePath||source.length>260000)continue;
    const functions=[...source.matchAll(fnRegex)].slice(0,64)
      .map(m=>m[1].replaceAll(':','.')).filter(x=>name.test(x));
    const known=new Set(functions.map(x=>x.split('.').at(-1)));
    const stateWrites=[],events=[];
    const lines=source.split(/\r?\n/).slice(0,4000);
    for(let i=0;i<lines.length;i++){
      const line=lines[i],trimmed=line.trim();
      if(!trimmed||/^(?:\/\/|--|\/\*|\*|#)/.test(trimmed))continue;
      if(stateWrites.length<48)for(const m of line.matchAll(assignment)){
        if(stateWrites.length>=48)break;
        if(name.test(m[1]))stateWrites.push({symbol:m[1],operator:m[2],line:i+1});
      }
      if(events.length<24)for(const m of line.matchAll(target==='roblox'?luaEvent:jsEvent)){
        if(events.length>=24)break;
        const handler=target==='roblox'?m[2]:m[4];
        events.push({source:m[1],event:target==='roblox'?'Connect':m[3],
          handler,line:i+1,handlerDeclared:known.has(handler.split('.').at(-1))});
      }
    }
    result.push({path:filePath,responsible:owners.has(filePath),
      functions:[...new Set(functions)].slice(0,48),stateWrites,events});
  }
  return Object.freeze({version:1,target,authority:'advisory-code-flow-only',
    runtimeVerified:false,sourceWrite:false,dynamicAnalysis:false,
    sourceLimitReached:files.length>maxSources,sources:Object.freeze(result)});
}
