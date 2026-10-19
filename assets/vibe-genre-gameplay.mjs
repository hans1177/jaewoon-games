export const recipes={plank:{wood:2},sword:{plank:2,iron:3},potion:{herb:3}};
export const structures={campfire:{cost:{wood:5,stone:3},size:[1,1]},workbench:{cost:{wood:8,stone:4},size:[2,1]},shelter:{cost:{plank:12,stone:8},size:[3,3]}};
export const arts={swordArt:{max:10,points:2},swiftStep:{max:5,points:3},innerBreath:{max:8,points:2}};
const valid=n=>Number.isSafeInteger(n)&&n>=0;
export function createGenreGameplay(){
 const state={items:{wood:30,stone:25,iron:10,herb:6,plank:0,sword:1,potion:0},points:20,gold:400,arts:{},upgrades:{sword:0},buildings:[]};
 const copy=()=>JSON.parse(JSON.stringify(state));
 const enough=cost=>Object.entries(cost).every(([k,v])=>(state.items[k]||0)>=v);
 const spend=cost=>{if(!enough(cost))throw Error('재료 부족');for(const [k,v] of Object.entries(cost))state.items[k]-=v};
 return {
  snapshot:copy,
  craft(id,count=1){const cost=recipes[id];if(!cost||!valid(count)||count<1||count>99)throw Error('잘못된 제작');const total=Object.fromEntries(Object.entries(cost).map(([k,v])=>[k,v*count]));spend(total);state.items[id]=(state.items[id]||0)+count;return copy()},
  train(id){const art=arts[id];if(!art)throw Error('알 수 없는 무공');const level=state.arts[id]||0;if(level>=art.max)throw Error('최대 수련');const price=art.points*(level+1);if(state.points<price)throw Error('수련 점수 부족');state.points-=price;state.arts[id]=level+1;return copy()},
  build(id,x,z){const spec=structures[id];if(!spec||!valid(x)||!valid(z)||x+spec.size[0]>16||z+spec.size[1]>16)throw Error('잘못된 건설 위치');for(const item of state.buildings){const other=structures[item.id];if(x<item.x+other.size[0]&&x+spec.size[0]>item.x&&z<item.z+other.size[1]&&z+spec.size[1]>item.z)throw Error('건설 공간 중복')}spend(spec.cost);state.buildings.push({id,x,z});return copy()},
  upgrade(id='sword'){if(id!=='sword'||state.items.sword<1)throw Error('장비 없음');const level=state.upgrades.sword;if(level>=10)throw Error('최대 강화');const price=(level+1)*40,iron=(level+1)*2;if(state.gold<price||state.items.iron<iron)throw Error('강화 재료 부족');state.gold-=price;state.items.iron-=iron;state.upgrades.sword++;return copy()},
  restore(raw){let data;try{data=typeof raw==='string'?JSON.parse(raw):raw}catch{return false}if(!data||!valid(data.gold)||!valid(data.points)||!data.items||!data.arts||!data.upgrades||!Array.isArray(data.buildings))return false;
   if(Object.values(data.items).some(v=>!valid(v))||Object.entries(data.arts).some(([k,v])=>!arts[k]||!valid(v)||v>arts[k].max)||!valid(data.upgrades.sword)||data.upgrades.sword>10)return false;
   const seen=new Set();for(const entry of data.buildings){const spec=structures[entry.id];if(!spec||!valid(entry.x)||!valid(entry.z)||entry.x+spec.size[0]>16||entry.z+spec.size[1]>16)return false;for(let x=entry.x;x<entry.x+spec.size[0];x++)for(let z=entry.z;z<entry.z+spec.size[1];z++){const k=x+','+z;if(seen.has(k))return false;seen.add(k)}}
   Object.assign(state,JSON.parse(JSON.stringify(data)));return true},
  serialize(){return JSON.stringify(state)}
 };
}
