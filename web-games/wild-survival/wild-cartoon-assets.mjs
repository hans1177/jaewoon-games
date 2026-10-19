// Canonical Vibe cartoon style + repository-owned native 3D assets for Wild Forest.
// No new game models are authored here. Model meshes are loaded from company-asset-library.json.
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { createVisualStyleProfile } from '../../assets/visual-style.js';

// Registered, project-original sources. OBJ geometry is Z-up, unlike Three.js (Y-up).
export const WILD_CARTOON_NATIVE_ASSETS=Object.freeze({
  treeTrunk:'../../assets/roblox/survival-core-world-v1/tree_trunk_thick.obj',
  treeCrown:'../../assets/roblox/survival-core-world-v1/tree_crown_round.obj',
  rock:'../../assets/roblox/survival-core-world-v1/rock_medium.obj',
  shelterRoof:'../../assets/roblox/survival-core-world-v1/roof_gable.obj',
  boar:'../../assets/roblox/monster-adventure-v1/boar.obj'
});
export const WILD_CARTOON_PROFILE=createVisualStyleProfile({
  style:'cartoon',mood:'cozy',
  overrides:{shading:'cel',outline:'medium',texture:'clean',motion:'bouncy'}
});
const look=Object.freeze({
  bark:'#80533c',leaves:'#64aa6b',stone:'#a2a8a1',roof:'#c88c55',boar:'#8b6a51'
});
function toonMaterial(color) {
  // Quantized diffuse response: Three's built-in toon shader, not a CSS/poster overlay.
  return new THREE.MeshToonMaterial({color,transparent:false,side:THREE.FrontSide});
}
const sharedToon=new Map();
function sharedMaterial(color){
  if(!sharedToon.has(color))sharedToon.set(color,toonMaterial(color));
  return sharedToon.get(color);
}
export function applyVibeCartoonSurface(object,{tint=null,includeSkinned=false}={}){
  if(!object?.traverse)return 0;
  let count=0;
  object.traverse(child=>{
    if(!child.isMesh||(!includeSkinned&&child.isSkinnedMesh))return;
    const old=Array.isArray(child.material)?child.material:[child.material];
    const converted=old.map(m=>{
      if(tint)return sharedMaterial(tint);
      const originalColor=m?.color?.clone?.()||new THREE.Color('#d7cbb3');
      return new THREE.MeshToonMaterial({
        color:originalColor,map:m?.map||null,alphaMap:m?.alphaMap||null,
        transparent:!!m?.transparent,opacity:m?.opacity??1,
        side:m?.side===THREE.DoubleSide?THREE.DoubleSide:THREE.FrontSide
      });
    });
    child.material=Array.isArray(child.material)?converted:converted[0];
    count++;
  });
  return count;
}
function normalizeNativeZUp(model,targetHeight) {
  const group=new THREE.Group();
  model.rotation.x=-Math.PI/2;
  model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model);
  const size=box.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=.00001)throw new Error('INVALID_NATIVE_ASSET_BOUNDS');
  const center=box.getCenter(new THREE.Vector3());
  const scale=targetHeight/size.y;
  model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
  model.scale.setScalar(scale);
  group.add(model);
  return group;
}
const nativeObjLoader=new OBJLoader();
function loadNative(relativePath,color,height){
  const url=new URL(relativePath,import.meta.url).href;
  return new Promise((resolve,reject)=>{
    nativeObjLoader.load(url,loaded=>{
      try{
        if(!loaded.children?.length)throw new Error('EMPTY_NATIVE_ASSET');
        const renderedMeshes=applyVibeCartoonSurface(loaded,{tint:color});
        if(!renderedMeshes)throw new Error('NATIVE_ASSET_HAS_NO_MESH');
        resolve(normalizeNativeZUp(loaded,height));
      }catch(e){reject(e)}
    },undefined,reject);
  });
}
function replaceVisibleGeometry(parent,nativeObject){
  if(!parent||!nativeObject)return false;
  // Preserve simulation-owned world transforms and visibility.
  parent.clear();
  parent.add(nativeObject);
  return true;
}
export function bindWildCartoonNativeAssets({resources,animals,props,wildlife,tent,scene,renderer,sun,hemi}){
  if(!Array.isArray(resources)||!Array.isArray(props)||!Array.isArray(animals)||!Array.isArray(wildlife))
    throw new Error('WILD_CARTOON_LIVE_SOURCE_REQUIRED');
  if(WILD_CARTOON_PROFILE.style!=='cartoon'||!WILD_CARTOON_PROFILE.rules.reuseExistingAssetsFirst)
    throw new Error('VIBE_CARTOON_PROFILE_INVALID');

  document.body.dataset.vibeVisualStyle='cartoon';
  document.body.dataset.vibeCartoonProfile='assets/visual-style.js';
  document.body.dataset.vibeAssetBinding='loading';
  // Renderer configuration changes real 3D shading, light and geometric surfaces.
  if(scene){scene.fog.density=Math.min(scene.fog.density,.011);}
  if(renderer){renderer.toneMappingExposure=1.42;}
  if(sun){sun.color.set('#fff2d8');}
  if(hemi){hemi.color.set('#effdff');hemi.groundColor.set('#5b7553');}

  const counts={tree:0,rock:0,boar:0,roof:0};
  const availability={};
  const jobs=[
    Promise.all([
      loadNative(WILD_CARTOON_NATIVE_ASSETS.treeTrunk,look.bark,4.7),
      loadNative(WILD_CARTOON_NATIVE_ASSETS.treeCrown,look.leaves,3.6)
    ]).then(([trunk,crown])=>{
      // One registered trunk and one registered crown per existing live tree.
      for(let i=0;i<resources.length;i++){
        if(resources[i].type!=='tree')continue;
        const root=props[i];
        if(!root)continue;
        const native=new THREE.Group();
        native.add(trunk.clone(true));
        const head=crown.clone(true);
        head.position.y=3.0;
        native.add(head);
        if(replaceVisibleGeometry(root,native))counts.tree++;
      }
      availability.tree='loaded';
    }).catch(err=>{availability.tree='unavailable';console.warn('[Vibe cartoon tree] native load failed',err)}),
    loadNative(WILD_CARTOON_NATIVE_ASSETS.rock,look.stone,1.35)
      .then(model=>{
        for(let i=0;i<resources.length;i++){
          if(resources[i].type!=='stone')continue;
          if(replaceVisibleGeometry(props[i],model.clone(true)))counts.rock++;
        }
        availability.rock='loaded';
      }).catch(err=>{availability.rock='unavailable';console.warn('[Vibe cartoon rock] native load failed',err)}),
    loadNative(WILD_CARTOON_NATIVE_ASSETS.boar,look.boar,2.2)
      .then(model=>{
        for(let i=0;i<animals.length;i++){
          if(animals[i].type!=='boar')continue;
          const animal=wildlife[i];
          if(!animal?.root)continue;
          const native=model.clone(true);
          if(!replaceVisibleGeometry(animal.root,native))continue;
          // Main loop's harmless alive-bob continues to animate the imported asset.
          animal.body=native;
          counts.boar++;
        }
        availability.boar='loaded';
      }).catch(err=>{availability.boar='unavailable';console.warn('[Vibe cartoon boar] native load failed',err)}),
    loadNative(WILD_CARTOON_NATIVE_ASSETS.shelterRoof,look.roof,1.6)
      .then(model=>{
        if(!tent)return;
        const oldRoof=tent.children.find(c=>c.isMesh&&c.geometry?.type==='ConeGeometry');
        if(oldRoof){oldRoof.visible=false;}
        const roof=model.clone(true);
        roof.position.y=2.03;
        tent.add(roof);
        counts.roof=1;availability.roof='loaded';
      }).catch(err=>{availability.roof='unavailable';console.warn('[Vibe cartoon roof] native load failed',err)})
  ];
  // Stats reflect source geometry that was truly installed in live scene nodes.
  const done=Promise.all(jobs).then(()=>{
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    document.body.dataset.vibeAssetBinding=total>0?'native-bound':'asset-load-failed';
    document.body.dataset.vibeNativeAssetCount=String(total);
    document.body.dataset.vibeNativeAssetFamilies=Object.entries(availability).filter(([,v])=>v==='loaded').map(([k])=>k).join(',');
    return {counts,availability,total,profile:WILD_CARTOON_PROFILE};
  });
  return{done,profile:WILD_CARTOON_PROFILE};
}
