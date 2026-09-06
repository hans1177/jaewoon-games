// Survival2 2.5D world renderer core + runtime loader.
// Gameplay/collision/save remain in world X/Y; presentation uses isometric projection.
export const SURVIVAL_25D={tileW:96,tileH:48,elevationScale:1,cameraEase:0.12,cullMargin:160};
export function worldToScreen25D(x,y,z=0,camera={x:2300,y:2300},viewport={w:innerWidth,h:innerHeight}){const dx=x-camera.x,dy=y-camera.y;return{x:(dx-dy)*0.5+viewport.w*0.5,y:(dx+dy)*0.25+viewport.h*0.52-z*SURVIVAL_25D.elevationScale};}
export function screenToWorld25D(sx,sy,camera={x:2300,y:2300},viewport={w:innerWidth,h:innerHeight}){const a=sx-viewport.w*0.5,b=(sy-viewport.h*0.52)*2;return{x:camera.x+a+b,y:camera.y-a+b};}
export function depth25D(o){return (Number(o.x)||0)+(Number(o.y)||0)+(Number(o.z)||0)*0.5+(Number(o.depthBias)||0);}
export function sortDepth25D(objects){return objects.sort((a,b)=>depth25D(a)-depth25D(b));}
export function visible25D(p,viewport={w:innerWidth,h:innerHeight},margin=SURVIVAL_25D.cullMargin){return p.x>-margin&&p.y>-margin&&p.x<viewport.w+margin&&p.y<viewport.h+margin;}
export function groundShadow25D(ctx,x,y,w=36,h=14,alpha=.22){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x,y,w*.5,h*.5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
export function makeCamera25D(x=2300,y=2300){return{x,y,targetX:x,targetY:y,follow(wx,wy){this.targetX=wx;this.targetY=wy;this.x+=(this.targetX-this.x)*SURVIVAL_25D.cameraEase;this.y+=(this.targetY-this.y)*SURVIVAL_25D.cameraEase;return this;}};}
export function makeRenderItem25D({kind,x,y,z=0,w=48,h=64,asset=null,frame=null,depthBias=0,label='',hp=null,maxHp=null}={}){return{kind,x,y,z,w,h,asset,frame,depthBias,label,hp,maxHp};}
export function drawSprite25D(ctx,item,camera,viewport){const p=worldToScreen25D(item.x,item.y,item.z||0,camera,viewport);if(!visible25D(p,viewport))return false;groundShadow25D(ctx,p.x,p.y,Math.max(20,item.w*.7),Math.max(8,item.w*.22),item.z?0.14:0.22);if(item.asset?.complete&&item.asset.naturalWidth){ctx.drawImage(item.asset,p.x-item.w/2,p.y-item.h,item.w,item.h);}return p;}
export function drawDiamondTile25D(ctx,x,y,z,camera,viewport,image=null,size=96){const p=worldToScreen25D(x,y,z,camera,viewport);if(!visible25D(p,viewport,size))return false;if(image?.complete&&image.naturalWidth){ctx.drawImage(image,p.x-size/2,p.y-size/4,size,size/2);}return p;}
export function create25DRenderQueue(){const q=[];return{push(item){q.push(item);return item},clear(){q.length=0},draw(drawer){sortDepth25D(q);for(const item of q)drawer(item)},get size(){return q.length}};}
// Runtime is intentionally a classic script so it can attach to the existing single-file game without changing save/gameplay code.
export function loadSurvival25DRuntime(){if(document.querySelector('script[data-survival-25d-runtime]'))return;const script=document.createElement('script');script.src='./survival-25d-runtime.js';script.dataset.survival25dRuntime='1';document.head.appendChild(script);}
