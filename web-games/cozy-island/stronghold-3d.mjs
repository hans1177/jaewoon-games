import * as THREE from 'three';

// Actual WebGL 3D scene. The original 2D renderer remains alive off-screen so
// existing economy/quests/panels and legacy drawing hooks retain their behavior.
export class StrongholdView3D {
  constructor(game, legacy) {
    this.game=game;
    this.legacy=legacy;
    this.canvas=document.createElement('canvas');
    this.canvas.id='cozy3d';
    this.canvas.setAttribute('aria-hidden','true');
    document.querySelector('#app').prepend(this.canvas);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(1.35,devicePixelRatio||1));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x94c9de);
    this.scene.fog=new THREE.Fog(0x94c9de,1250,4100);
    this.scene.add(new THREE.HemisphereLight(0xe5f6ff,0x738b66,2.0));
    const sun=new THREE.DirectionalLight(0xffe7bb,2.15);
    sun.position.set(-600,1050,-750);
    this.scene.add(sun);
    this.camera=new THREE.OrthographicCamera(-500,500,350,-350,1,6000);
    this.raycaster=new THREE.Raycaster();
    this.floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-16);
    this.pointer=new THREE.Vector2();
    this.ground=new THREE.Group();this.scene.add(this.ground);
    this.fort=new THREE.Group();this.scene.add(this.fort);
    this.actors=new Map();
    this.occupants=new THREE.Group();this.scene.add(this.occupants);
    this.tmp=new THREE.Vector3();
    this.fortKey='';
    this.groundKey='';
    this.palette={
      wood:this.material(0x805c38),stone:this.material(0xaaa89d),stoneDark:this.material(0x858c8b),
      slate:this.material(0x3e5055),roof:this.material(0x9c5747),thatch:this.material(0xc1a376),
      sand:this.material(0xe9d19f),grass:this.material(0x81b46c),grassDark:this.material(0x507f51),
      trunk:this.material(0x705137),leaves:this.material(0x367c50),leaves2:this.material(0x50a96a),
      water:new THREE.MeshStandardMaterial({color:0x5da9cc,roughness:0.23,metalness:0.05,transparent:true,opacity:0.9}),
      iron:this.material(0x4c565b),farm:this.material(0x77523d),gold:this.material(0xe6b854),
      ally:this.material(0x4785b0),enemy:this.material(0xb14d43),skin:this.material(0xe4be92),
      white:this.material(0xefdfc5),dark:this.material(0x29373a),plot:this.material(0x675044),
      flower:this.material(0xeb9fac),villager:this.material(0xb7a369)
    };
    this.common={
      unitBody:new THREE.CylinderGeometry(13,16,31,8),
      unitHead:new THREE.SphereGeometry(13,9,7),
      unitLeg:new THREE.BoxGeometry(9,19,10),
      sphere:new THREE.SphereGeometry(1,10,8),
      cylinder:new THREE.CylinderGeometry(1,1,1,9),
      cone:new THREE.ConeGeometry(1,1,8),
      box:new THREE.BoxGeometry(1,1,1),
      rock:new THREE.DodecahedronGeometry(1,0)
    };
    this.makeEnvironment(game);
    this.resize();
    this.renderer.render(this.scene,this.camera);
    this.canvas.style.display='block';
    legacy.canvas.style.opacity='0';
    this.onContextLost=e=>{e.preventDefault();legacy.canvas.style.opacity='1';this.canvas.style.display='none';};
    this.canvas.addEventListener('webglcontextlost',this.onContextLost,false);
  }
  material(color){return new THREE.MeshStandardMaterial({color,roughness:.88,metalness:0});}
  mesh(geometry,material,parent=this.ground){
    const m=new THREE.Mesh(geometry,material);parent.add(m);return m;
  }
  cube(parent,mat,x,y,z,w,h,d){
    const m=this.mesh(this.common.box,mat,parent);
    m.position.set(x,y,z);m.scale.set(w,h,d);return m;
  }
  cylinder(parent,mat,x,y,z,r,h,segments=9){
    const m=this.mesh(this.common.cylinder,mat,parent);
    m.position.set(x,y,z);m.scale.set(r,h,r);return m;
  }
  sphere(parent,mat,x,y,z,r){
    const m=this.mesh(this.common.sphere,mat,parent);
    m.position.set(x,y,z);m.scale.setScalar(r);return m;
  }
  roof(parent,x,y,z,w,d,color=this.palette.roof){
    const m=this.mesh(new THREE.ConeGeometry(1,1.25,4),color,parent);
    m.position.set(x,y,z);m.rotation.y=Math.PI/4;m.scale.set(w*.68,90,d*.68);
  }
  building(parent,x,z,w,d,h,mat=this.palette.wood){
    this.cube(parent,mat,x,16+h/2,z,w,h,d);
    this.roof(parent,x,16+h+19,z,w+24,d+24);
    this.cube(parent,this.palette.dark,x,16+21,z+d/2+.5,22,42,3);
  }
  makeEnvironment(g){
    this.ground.clear();
    const p=this.palette,expanded=g.state.expanded,w=expanded?2810:1260;
    this.cube(this.ground,p.water,1530,0,600,3500,12,1640);
    this.cube(this.ground,p.sand,100+w/2,6,595,w,16,1010);
    this.cube(this.ground,p.grass,145+(w-90)/2,14,595,w-90,8,920);
    const pond=this.cylinder(this.ground,p.water,390,19,370,1,3);
    pond.scale.set(148,3,109);
    this.cube(this.ground,this.material(0xb5a37e),660,18,615,660,2,160);
    this.building(this.ground,765,322,210,145,123);
    this.building(this.ground,g.workerShop.x,g.workerShop.y,106,74,73);
    if(g.state.barracksBuilt) this.building(this.ground,g.barracks.x,g.barracks.y,116,90,83,this.palette.stone);
    else{
      const pad=this.cube(this.ground,p.stoneDark.clone(),g.barracks.x,18,g.barracks.y,116,8,90);
      pad.material.transparent=true;pad.material.opacity=.55;
    }
    // Garden plots keep their world coordinates and original six planting cells.
    this.cube(this.ground,p.farm,1040,19,445,260,8,190);
    g.state.plots.forEach((plot,i)=>{
      const x=959+(i%3)*78,z=404+Math.floor(i/3)*78;
      this.cube(this.ground,p.plot,x,25,z,58,7,58);
      if(plot.state==='growing'){
        for(let j=0;j<3;j++){
          this.cylinder(this.ground,p.leaves2,x-16+j*15,31,z,4,17);
          if(plot.ready)this.sphere(this.ground,this.material(0xe48442),x-16+j*15,40,z,6);
        }
      }
    });
    for(const n of g.nodes){
      if(n.lockedByExpansion&&!expanded)continue;
      if(n.kind==='tree'){
        this.cylinder(this.ground,p.trunk,n.x,45,n.y,9,54);
        for(let level=0;level<3;level++){
          const m=this.mesh(this.common.cone,level%2?p.leaves2:p.leaves,this.ground);
          m.position.set(n.x,72+level*25,n.y);m.scale.set(49-level*10,70-level*7,49-level*10);
        }
      }else if(n.kind==='rock'){
        const m=this.mesh(this.common.rock,p.stoneDark,this.ground);
        m.position.set(n.x,28,n.y);m.scale.set(24,16,20);
      }else{
        this.cylinder(this.ground,p.leaves,n.x,27,n.y,2,20);
        this.sphere(this.ground,p.flower,n.x,39,n.y,8);
      }
    }
    this.cube(this.ground,p.wood,770,25,755,30,30,30);
    this.cube(this.ground,p.wood,520,25,425,30,24,30);
    if(expanded){
      for(let x=1510;x<2790;x+=230) for(let z=240;z<950;z+=220){
        const a=Math.sin(x*.019+z*.017);
        if(a<-.15){
          this.cylinder(this.ground,p.trunk,x,35,z,9,39);
          const cone=this.mesh(this.common.cone,p.grassDark,this.ground);
          cone.position.set(x,78,z);cone.scale.set(42,97,42);
        }
      }
    }else{
      this.cube(this.ground,p.stoneDark,1358,46,600,20,80,245);
    }
    this.groundKey=expanded+':'+g.state.barracksBuilt+':'+g.state.plots.map(q=>q.state+q.ready).join('');
  }
  createPerson(id,x,z,type='ally',large=false){
    const p=this.palette,mat=p[type]||p.ally,group=new THREE.Group();
    this.occupants.add(group);
    const head=this.mesh(this.common.unitHead,p.skin,group);head.position.y=68;
    const body=this.mesh(this.common.unitBody,mat,group);body.position.y=44;
    const left=this.mesh(this.common.unitLeg,p.dark,group);left.position.set(-8,19,0);
    const right=this.mesh(this.common.unitLeg,p.dark,group);right.position.set(8,19,0);
    const helm=this.sphere(group,type==='enemy'?p.iron:p.slate,0,79,0,14);
    helm.scale.y=.34;
    this.cube(group,p.wood,-22,40,0,5,42,5);
    group.position.set(x,16,z);
    if(large)group.scale.setScalar(1.65);
    this.actors.set(id,{group,left,right,oldX:x,oldZ:z,lastMove:0,type});
    return group;
  }
  makeFort(g){
    this.fort.clear();
    const p=this.palette;
    for(const part of g.state.fortress.parts){
      if(part.hp<=0)continue;
      const grp=new THREE.Group();
      grp.position.set(part.x,16,part.y);
      if(part.axis==='z'&&(part.kind==='wall'||part.kind==='gate'))grp.rotation.y=Math.PI/2;
      this.fort.add(grp);
      const health=(part.hp/({wall:180,gate:220,tower:160}[part.kind]||1));
      const mat=health<.4?p.stoneDark:p.stone;
      if(part.kind==='wall'){
        this.cube(grp,mat,0,39,0,59,76,26);
        for(let x=-24;x<=24;x+=16)this.cube(grp,p.stoneDark,x,84,0,10,16,29);
        this.cube(grp,p.stoneDark,0,75,0,58,9,34);
      }else if(part.kind==='gate'){
        this.cube(grp,mat,-23,53,0,17,107,36);
        this.cube(grp,mat,23,53,0,17,107,36);
        this.cube(grp,mat,0,101,0,72,16,36);
        for(let i=0;i<4;i++)this.cube(grp,p.slate,-27+i*18,112,0,11,15,39);
        if(!g.state.fortress.gateOpen){
          this.cube(grp,p.wood,0,44,0,39,77,10);
          this.cube(grp,p.iron,0,44,6,5,77,3);
          this.cube(grp,p.iron,0,44,6,39,6,3);
        }
      }else if(part.kind==='keep'){
        this.cube(grp,p.stoneDark,0,73,0,116,144,113);
        this.cube(grp,mat,0,151,0,125,18,122);
        this.cube(grp,p.wood,0,34,58,32,68,5);
        for(const xx of [-55,55])for(const zz of [-55,55]){
          this.cylinder(grp,p.stone,xx,98,zz,20,195);
          this.cylinder(grp,p.slate,xx,199,zz,25,16);
        }
        for(let a=-48;a<=48;a+=24){
          this.cube(grp,p.stone,a,170,-59,13,24,12);
          this.cube(grp,p.stone,a,170,59,13,24,12);
        }
      }else if(part.kind==='tower'){
        this.cylinder(grp,mat,0,62,0,36,125);
        this.cylinder(grp,p.slate,0,128,0,43,16);
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          this.cube(grp,p.stoneDark,Math.cos(a)*32,142,Math.sin(a)*32,15,26,15);
        }
      }
    }
    this.fortKey=this.fortSignature(g);
  }
  fortSignature(g){return g.state.fortress.gateOpen+'|'+g.state.fortress.parts.map(p=>p.id+':'+p.hp+':'+p.kind+':'+p.axis).join('|');}
  moveActor(key,x,z,type,boss=false,elevation=0,seconds=0){
    let data=this.actors.get(key);
    if(!data){this.createPerson(key,x,z,type,boss);data=this.actors.get(key);}
    const dx=x-data.oldX,dz=z-data.oldZ,moving=dx*dx+dz*dz>.5;
    if(moving)data.lastMove=seconds;
    const motion=moving?Math.sin(seconds*13)*6:0;
    data.group.position.set(x,16+elevation+(moving?Math.abs(motion)*.4:0),z);
    if(moving)data.group.rotation.y=Math.atan2(dx,dz);
    data.left.rotation.x=moving?motion*.035:0;
    data.right.rotation.x=moving?-motion*.035:0;
    data.oldX=x;data.oldZ=z;
  }
  syncActors(g,t){
    const current=new Set();
    const a=(id,x,z,type,boss=false,elevation=0)=>{
      current.add(id);this.moveActor(id,x,z,type,boss,elevation,t);
    };
    a('player',g.player.x,g.player.y,'ally');
    for(const npc of g.npcs)a('npc:'+npc.id,npc.x,npc.y,'villager');
    for(const u of g.allies||[]){
      if(u.hp<=0)continue;
      const tower=u.towerId?g.state.fortress.parts.find(p=>p.id===u.towerId&&p.hp>0):null;
      a('ally:'+u.id,u.x,u.y,'ally',false,tower?125:0);
    }
    for(const u of g.enemies||[])if(u.hp>0)a('enemy:'+u.id,u.x,u.y,'enemy',u.boss);
    for(const w of g.wolves||[]){
      if(!w.alive||!g.state.expanded)continue;
      a('wolf:'+w.id,w.x,w.y,'enemy');
    }
    for(let i=0;i<g.state.workers;i++){
      a('worker:'+i,1020+Math.cos(t*.85+i*3)*48+i*10,510+Math.sin(t*.7+i)*35,'villager');
    }
    for(const [id,actor] of this.actors)if(!current.has(id)){
      this.occupants.remove(actor.group);this.actors.delete(id);
    }
  }
  resize(){
    const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
    this.renderer.setSize(width,height,false);
    const widthWorld=Math.max(600,Math.min(1050,width*1.15));
    const heightWorld=widthWorld*height/width;
    this.camera.left=-widthWorld/2;
    this.camera.right=widthWorld/2;
    this.camera.top=heightWorld/2;
    this.camera.bottom=-heightWorld/2;
    this.camera.updateProjectionMatrix();
  }
  updateCamera(g){
    const cx=g.player.x,cz=g.player.y;
    this.camera.position.set(cx-310,1000,cz+930);
    this.camera.lookAt(cx,0,cz);
    this.camera.updateMatrixWorld();
  }
  screenToWorld(sx,sy){
    const bounds=this.canvas.getBoundingClientRect();
    if(bounds.width<=0||bounds.height<=0)return null;
    this.pointer.set((sx-bounds.left)/bounds.width*2-1,-(sy-bounds.top)/bounds.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    if(this.raycaster.ray.intersectPlane(this.floorPlane,this.tmp))return {x:this.tmp.x,y:this.tmp.z};
    return null;
  }
  draw(g){
    const groundKey=g.state.expanded+':'+g.state.barracksBuilt+':'+g.state.plots.map(q=>q.state+q.ready).join('');
    if(groundKey!==this.groundKey)this.makeEnvironment(g);
    const fortressKey=this.fortSignature(g);
    if(fortressKey!==this.fortKey)this.makeFort(g);
    this.updateCamera(g);
    const t=performance.now()*.001;
    this.syncActors(g,t);
    const hour=g.state.minutes/60;
    const night=hour<6||hour>19;
    this.scene.background.setHex(night?0x24394e:0x94c9de);
    this.scene.fog.color.copy(this.scene.background);
    this.renderer.render(this.scene,this.camera);
    const count=g.state.fortress.parts.filter(part=>part.hp>0).length;
    const indicator=document.querySelector('#fortText');
    if(indicator)indicator.textContent='🏰 성채 '+count+'곳 · '+(g.state.fortress.gateOpen?'성문 열림':'성문 닫힘')+(g.raidActive?' · 공성전 중':'');
  }
}
