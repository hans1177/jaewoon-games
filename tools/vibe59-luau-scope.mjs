// Conservative Luau scope verifier. Never claims a complete Luau compiler.
// Tracks actual block ownership before the insertion slot rather than counting 'end' strings.
function maskLuau(source){
 let out='',i=0;const blank=c=>c==='\n'||c==='\r'?c:' ';
 while(i<source.length){
  const c=source[i],next=source[i+1];
  if(c==='"'||c==="'"){
   const quote=c;out+=' ';i++;
   let closed=false;
   while(i<source.length){const x=source[i++];out+=blank(x);
    if(x==='\\'&&i<source.length){out+=blank(source[i++]);continue}
    if(x===quote){closed=true;break}
   }
   if(!closed)throw Error('VIBE59_SCOPE_UNTERMINATED_STRING');
  }else if(c==='-'&&next==='-'){
   const m=/^\[(=*)\[/.exec(source.slice(i+2,i+22));
   if(m){
    const closing=']'+m[1]+']',end=source.indexOf(closing,i+2+m[0].length);
    if(end<0)throw Error('VIBE59_SCOPE_UNTERMINATED_LONG_COMMENT');
    const until=end+closing.length;while(i<until)out+=blank(source[i++]);
   }else while(i<source.length&&source[i]!=='\n')out+=blank(source[i++]);
  }else if(c==='['){
   const m=/^\[(=*)\[/.exec(source.slice(i,i+22));
   if(m){
    const closing=']'+m[1]+']',end=source.indexOf(closing,i+m[0].length);
    if(end<0)throw Error('VIBE59_SCOPE_UNTERMINATED_LONG_STRING');
    const until=end+closing.length;while(i<until)out+=blank(source[i++]);
   }else{out+=c;i++}
  }else{out+=c;i++}
 }
 return out;
}
function blocksBeforeSlot(body){
 const stack=[],tokens=body.match(/[A-Za-z_][A-Za-z_0-9]*/g)||[];
 let pending='',rootReturns=0;
 for(const t of tokens){
  if(t==='function'){
   stack.push('function');
  }else if(t==='if'||t==='for'||t==='while'){
   if(pending)throw Error('VIBE59_SCOPE_UNCLOSED_CONTROL_HEADER');
   pending=t;
  }else if(t==='elseif'){
   if(stack.at(-1)!=='if')throw Error('VIBE59_SCOPE_INVALID_ELSEIF');
   pending='elseif';
  }else if(t==='then'){
   if(pending==='if')stack.push('if');
   else if(pending!=='elseif')throw Error('VIBE59_SCOPE_UNMATCHED_THEN');
   pending='';
  }else if(t==='do'){
   if(pending==='while'||pending==='for')pending='';
   else if(pending)throw Error('VIBE59_SCOPE_INVALID_DO');
   stack.push('do');
  }else if(t==='repeat'){
   stack.push('repeat');
  }else if(t==='until'){
   if(stack.pop()!=='repeat')throw Error('VIBE59_SCOPE_UNMATCHED_UNTIL');
  }else if(t==='end'){
   const top=stack.pop();
   if(!top||top==='repeat')throw Error('VIBE59_SCOPE_UNMATCHED_END');
   if(!stack.length)throw Error('VIBE59_SCOPE_OUTSIDE_FUNCTION');
  }else if(t==='return'&&stack.length===1){
   rootReturns++;
  }
 }
 if(pending||stack.length!==1||stack[0]!=='function')
  throw Error('VIBE59_SCOPE_NOT_IN_OWNER_BODY');
 if(rootReturns)throw Error('VIBE59_SCOPE_AFTER_RETURN');
 return {nestedBlocks:stack.length-1,rootReturns,blockTokens:tokens.length};
}
export function inspectVibe59LuauInsertionScope({source='',anchor='',functionName='',signature=''}={}){
 if(typeof source!=='string'||source.length>260000||!anchor||
   typeof anchor!=='string'||source.split(anchor).length!==2)
  throw Error('VIBE59_SCOPE_UNIQUE_ANCHOR');
 if(typeof functionName!=='string'||!/^[A-Za-z_][A-Za-z_0-9]*$/.test(functionName)
   ||typeof signature!=='string'||!/^[A-Za-z_][A-Za-z_0-9]*(?:, [A-Za-z_][A-Za-z_0-9]*)*$/.test(signature))
  throw Error('VIBE59_SCOPE_INVALID_SIGNATURE');
 const prefix=source.slice(0,source.indexOf(anchor));
 const masked=maskLuau(prefix);
 const fn=new RegExp('(?:^|\\n)\\s*(?:local\\s+)?function\\s+'+functionName+'\\s*\\(\\s*'+
    signature.split(', ').join('\\s*,\\s*')+'\\s*\\)','g');
 const occurrences=[...masked.matchAll(fn)];
 if(occurrences.length!==1)throw Error('VIBE59_SCOPE_EXACT_FUNCTION_REQUIRED');
 const offset=occurrences[0].index;
 const ownerBody=masked.slice(offset);
 const detail=blocksBeforeSlot(ownerBody);
 return Object.freeze({ownerBody,masked,ownerFunction:functionName,
  ...detail,analysis:'conservative-lexical-block-scoping',runtimeVerified:false});
}
