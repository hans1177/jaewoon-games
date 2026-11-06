// Chunked world residency, hysteresis, budgets, and cancellable asynchronous loading.
// All persistent world authority must live outside this cache.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const key=(x,z)=>x+','+z;
export function makeChunkIndex({chunkSize=64}={}){
 if(!(chunkSize>0))throw Error('invalid chunk size');
 return{
  at(point){return{x:Math.floor(point.x/chunkSize),z:Math.floor(point.z/chunkSize)};},
  key,
  neighbors(point,radius=1){const c=this.at(point),rows=[];for(let z=c.z-radius;z<=c.z+radius;z++)for(let x=c.x-radius;x<=c.x+radius;x++)rows.push({x,z,key:key(x,z),distance:(x-c.x)**2+(z-c.z)**2});return rows.sort((a,b)=>a.distance-b.distance||a.key.localeCompare(b.key));}
 };
}
export function makeResidencyController({chunkSize=64,loadRadius=2,unloadRadius=3,maxChunks=128,maxLoadsPerTick=4,load,unload}={}){
 if(loadRadius<0||unloadRadius<loadRadius||maxChunks<1||maxLoadsPerTick<1)throw Error('invalid residency budget');
 const index=makeChunkIndex({chunkSize}),active=new Map(),pending=new Map(),failures=new Map();
 let generation=0;
 const nearestDistance=(row,points)=>Math.min(...points.map(p=>{const c=index.at(p);return Math.max(Math.abs(c.x-row.x),Math.abs(c.z-row.z));}));
 return{
  get activeCount(){return active.size;},
  get pendingCount(){return pending.size;},
  get loadedKeys(){return [...active.keys()];},
  get failures(){return [...failures].map(([id,value])=>({id,...value}));},
  async update({players=[],tick=0}={}){
   generation++;
   if(!players.length){return{status:'NO_VIEWERS',active:active.size,pending:pending.size};}
   const wanted=new Map();
   for(const p of players)for(const row of index.neighbors(p,loadRadius)){
    const prior=wanted.get(row.key);
    if(!prior||row.distance<prior.distance)wanted.set(row.key,row);
   }
   const candidates=[...wanted.values()].sort((a,b)=>a.distance-b.distance||a.key.localeCompare(b.key)).slice(0,maxChunks);
   const retain=new Set(candidates.map(row=>row.key));
   for(const [id,row] of active){
    if(retain.has(id)||nearestDistance(row,players)<=unloadRadius)continue;
    await unload?.(row.payload,row);
    active.delete(id);
   }
   let started=0;
   for(const row of candidates){
    if(active.has(row.key)||pending.has(row.key)||started>=maxLoadsPerTick)continue;
    if(active.size+pending.size>=maxChunks)break;
    started++;
    const promise=Promise.resolve().then(()=>load?.(row)).then(payload=>{
      if(!pending.has(row.key))return;
      pending.delete(row.key);
      active.set(row.key,{...row,payload,loadedAt:tick});
      failures.delete(row.key);
    }).catch(error=>{
      pending.delete(row.key);
      failures.set(row.key,{message:String(error?.message||error),tick});
    });
    pending.set(row.key,promise);
   }
   return{status:'RUNNING',active:active.size,pending:pending.size,desired:wanted.size,started,capacity:maxChunks};
  },
  async settle(){await Promise.allSettled([...pending.values()]);},
  async clear(){await this.settle();for(const row of active.values())await unload?.(row.payload,row);active.clear();failures.clear();},
  snapshot(){return{active:[...active.values()].map(({payload,...row})=>row),pending:[...pending.keys()],failed:[...failures.keys()],generation};}
 };
}
export function makeObjectPool({create,reset=()=>{},destroy=()=>{},maxIdle=64}={}){
 if(typeof create!=='function')throw Error('pool create required');
 const idle=[],leased=new Set();
 return{
  acquire(){const object=idle.pop()??create();leased.add(object);return object;},
  release(object){if(!leased.delete(object))return false;reset(object);if(idle.length<maxIdle)idle.push(object);else destroy(object);return true;},
  clear(){for(const object of idle)destroy(object);idle.length=0;},
  stats(){return{idle:idle.length,leased:leased.size,maxIdle};}
 };
}
export function makeFrameBudget({targetMs=16.67,minimumMs=2,maximumMs=24,smoothing=.15}={}){
 let movingAverage=targetMs;
 return{
  observe(frameMs){if(!Number.isFinite(frameMs)||frameMs<0)return movingAverage;movingAverage+=clamp(smoothing,0,1)*(frameMs-movingAverage);return movingAverage;},
  available(){return clamp(targetMs-movingAverage+minimumMs,minimumMs,maximumMs);},
  quality(){const ratio=targetMs/Math.max(1,movingAverage);return ratio<.7?'LOW':ratio<.9?'MEDIUM':'HIGH';},
  snapshot(){return{averageFrameMs:movingAverage,availableWorkMs:this.available(),quality:this.quality()};}
 };
}
export function makeLodController({thresholds=[15,40,80],hysteresis=2}={}){
 const states=new Map();
 return{
  choose(id,distance){
   if(!Number.isFinite(distance)||distance<0)throw Error('invalid lod distance');
   const previous=states.get(id)??0;
   let level=previous;
   while(level<thresholds.length&&distance>thresholds[level]+hysteresis)level++;
   while(level>0&&distance<thresholds[level-1]-hysteresis)level--;
   states.set(id,level);return level;
  },
  forget(id){states.delete(id);},
  clear(){states.clear();}
 };
}
export function makeAssetBudget({maxBytes=256*1024*1024}={}){
 const assets=new Map();let clock=0;
 const used=()=>[...assets.values()].reduce((n,row)=>n+row.bytes,0);
 return{
  register(id,bytes,{pinned=false}={}){
   if(!id||!Number.isFinite(bytes)||bytes<0||bytes>maxBytes)return false;
   const old=assets.get(id);if(old)assets.delete(id);
   while(used()+bytes>maxBytes){
    const evict=[...assets].filter(([,v])=>!v.pinned).sort((a,b)=>a[1].last-b[1].last)[0];
    if(!evict){if(old)assets.set(id,old);return false;}
    assets.delete(evict[0]);
   }
   assets.set(id,{bytes,pinned,last:++clock});return true;
  },
  touch(id){const row=assets.get(id);if(!row)return false;row.last=++clock;return true;},
  pin(id,pinned=true){const row=assets.get(id);if(!row)return false;row.pinned=pinned;return true;},
  remove(id){return assets.delete(id);},
  snapshot(){return{usedBytes:used(),maxBytes,assets:[...assets].map(([id,v])=>({id,...v}))};}
 };
}
export function makeOriginRebaser({threshold=4096}={}){
 let offset={x:0,y:0,z:0};
 return{
  update(camera){
   const distance=Math.hypot(camera.x,camera.y||0,camera.z);
   if(distance<threshold)return null;
   const shift={x:camera.x,y:camera.y||0,z:camera.z};
   offset={x:offset.x+shift.x,y:offset.y+shift.y,z:offset.z+shift.z};
   return{shift,offset:{...offset}};
  },
  global(local){return{x:local.x+offset.x,y:(local.y||0)+offset.y,z:local.z+offset.z};},
  local(global){return{x:global.x-offset.x,y:(global.y||0)-offset.y,z:global.z-offset.z};},
  snapshot(){return{...offset};}
 };
}
export function makePerformanceHistogram({capacity=1200}={}){
 const frames=[],memory=[],stalls=[];
 const percentile=(arr,p)=>{if(!arr.length)return null;const s=[...arr].sort((a,b)=>a-b);return s[Math.ceil((s.length-1)*p)];};
 const push=(arr,n)=>{if(!Number.isFinite(n)||n<0)return false;arr.push(n);if(arr.length>capacity)arr.shift();return true;};
 return{
  frame(ms){return push(frames,ms);},
  heap(bytes){return push(memory,bytes);},
  stall(ms){return push(stalls,ms);},
  report(){return{samples:frames.length,frameP50:percentile(frames,.5),frameP95:percentile(frames,.95),frameP99:percentile(frames,.99),memoryPeak:memory.length?Math.max(...memory):null,stallP95:percentile(stalls,.95)};},
  clear(){frames.length=memory.length=stalls.length=0;}
 };
}
