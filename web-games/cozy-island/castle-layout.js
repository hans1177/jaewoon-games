// RTS 성벽 배치: 90 단위 격자·연속 벽·성문 자동 방향·일꾼 보급로 검사.
export const FORT_CELL=90;
export const snapFort=p=>({x:Math.round(Number(p?.x||0)/FORT_CELL)*FORT_CELL,
                            y:Math.round(Number(p?.y||0)/FORT_CELL)*FORT_CELL});
export function wallLine(start,end,max=35){
 const a=snapFort(start),b=snapFort(end),cells=[],seen=new Set();
 let x=a.x,y=a.y;
 const dx=Math.sign(b.x-a.x)*FORT_CELL,dy=Math.sign(b.y-a.y)*FORT_CELL;
 // 직각 건설: 시작점부터 가로, 그 다음 세로. 대각 건설에서도 틈이 생기지 않음.
 const add=()=>{const key=x+','+y;if(!seen.has(key)){cells.push({x,y});seen.add(key)}};
 add();
 while(x!==b.x&&cells.length<max){x+=dx;add()}
 while(y!==b.y&&cells.length<max){y+=dy;add()}
 return cells;
}
export function neighborGateAxis(gate,structures){
 const x=gate.x,y=gate.y,exists=(dx,dy)=>structures.some(t=>
  t!==gate&&t.hp>0&&t.kind==='wall'&&t.x===x+dx*FORT_CELL&&t.y===y+dy*FORT_CELL);
 const horizontal=Number(exists(-1,0))+Number(exists(1,0));
 const vertical=Number(exists(0,-1))+Number(exists(0,1));
 // 가로로 뻗은 성벽의 성문은 남북방향 통행, 세로 벽의 성문은 동서방향 통행.
 return horizontal>vertical?'horizontal':vertical>horizontal?'vertical':
        (gate.axis==='vertical'?'vertical':'horizontal');
}
export function applyGateAxes(structures){
 for(const gate of structures)if(gate.hp>0&&gate.kind==='gate'&&gate.axis!=='manual-horizontal'&&gate.axis!=='manual-vertical')
  gate.axis=neighborGateAxis(gate,structures);
}
export const FORT_AREA={minX:130,maxX:2240,minY:80,maxY:1510};
export const FORT_ROUTES=[
  // 창고에서 벌목·광산·농장·성채까지 인부가 이동할 수 있어야 한다.
  {x:390,y:820},{x:245,y:850},{x:785,y:965},{x:950,y:420},{x:1010,y:1090}
];
export function validateWallLayout(existing,adding,buildingSites=[]){
 const occupied=new Map();
 const structures=[...(existing||[]),...(adding||[])];
 for(const t of structures)if(t?.hp>0&&['wall','gate','tower'].includes(t.kind)){
   const p=snapFort(t),key=p.x+','+p.y;
   if(occupied.has(key))return {ok:false,reason:'같은 곳에 성벽·성문·망루 중복'};
   occupied.set(key,t);
 }
 for(const t of adding||[]){
   if(!Number.isFinite(t.x)||!Number.isFinite(t.y)||
      t.x<FORT_AREA.minX||t.x>FORT_AREA.maxX||t.y<FORT_AREA.minY||t.y>FORT_AREA.maxY)
      return {ok:false,reason:'내 영지 밖에는 성벽을 지을 수 없어'};
   if(Math.hypot(t.x-1010,t.y-1090)<135)return {ok:false,reason:'마을회관 출입구는 비워둬야 해'};
   if(buildingSites.some(p=>Math.hypot(p.x-t.x,p.y-t.y)<68))return {ok:false,reason:'일꾼 작업장·창고와 겹치는 자리야'};
 }
 const start=snapFort(FORT_ROUTES[0]);
 const limitX=[0,2430],limitY=[-90,1710];
 const visited=new Set(),queue=[start],key=p=>p.x+','+p.y;
 const isWalkable=p=>{
   if(p.x<limitX[0]||p.x>limitX[1]||p.y<limitY[0]||p.y>limitY[1])return false;
   const t=occupied.get(key(p));
   return !t||t.kind==='gate'&&t.open!==false;
 };
 if(!isWalkable(start))return {ok:false,reason:'창고 출입구가 막혀 있어'};
 visited.add(key(start));
 for(let i=0;i<queue.length;i++){
   const p=queue[i];
   for(const [x,y] of [[90,0],[-90,0],[0,90],[0,-90]]){
     const q={x:p.x+x,y:p.y+y},k=key(q);
     if(!visited.has(k)&&isWalkable(q)){visited.add(k);queue.push(q)}
   }
 }
 for(const route of FORT_ROUTES){
   if(!visited.has(key(snapFort(route))))
     return {ok:false,reason:'인부 이동로가 막혀 있어. 성문을 추가하거나 다른 곳에 성벽을 지어 줘'};
 }
 return {ok:true,reason:'일꾼 통행 정상',cells:queue.length};
}

// 실제 인부 수레가 성문을 통과해 생산시설까지 이동하는 최단 경로.
// 막힌 성벽/망루는 회피하고 'open' 성문을 우선 통과시킨다.
export function findWorkerRoute(from,to,structures=[]){
 const begin=snapFort(from),end=snapFort(to),label=p=>p.x+','+p.y;
 const blocked=new Set();
 for(const t of structures)if(t?.hp>0&&['wall','tower','gate'].includes(t.kind)&&
      (t.kind!=='gate'||t.open===false))blocked.add(label(snapFort(t)));
 if(blocked.has(label(begin))||blocked.has(label(end)))return [];
 const queue=[begin],visited=new Set([label(begin)]),parents=new Map();
 const [loX,hiX,loY,hiY]=[0,2430,-90,1710];
 let found=false;
 for(let i=0;i<queue.length&&i<1100;i++){
   const p=queue[i],k=label(p);
   if(k===label(end)){found=true;break}
   for(const [x,y] of [[FORT_CELL,0],[-FORT_CELL,0],[0,FORT_CELL],[0,-FORT_CELL]]){
     const q={x:p.x+x,y:p.y+y},key=label(q);
     if(q.x<loX||q.x>hiX||q.y<loY||q.y>hiY||blocked.has(key)||visited.has(key))continue;
     visited.add(key);parents.set(key,p);queue.push(q);
   }
 }
 if(!found)return [];
 const path=[end];let key=label(end);
 while(key!==label(begin)){
   const parent=parents.get(key);if(!parent)return [];
   path.push(parent);key=label(parent);
 }
 return path.reverse();
}
