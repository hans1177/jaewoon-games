import {createSurvivalSimulation} from './vibe-advanced-genre-systems.mjs';
export function mountSurvivalDisplay(doc=document){
 const simulation=createSurvivalSimulation(),root=doc.createElement('section');root.setAttribute('aria-label','생존 상태');root.style.cssText='position:fixed;bottom:12px;left:12px;z-index:10000;background:#152236;color:white;padding:12px;border-radius:9px;font:13px sans-serif';
 const meters={};
 for(const [id,label] of [['hunger','배고픔'],['thirst','갈증'],['energy','에너지'],['health','체력']]){const row=doc.createElement('div'),meter=doc.createElement('progress');meter.max=100;meter.setAttribute('aria-label',label);row.append(label+' ',meter);root.append(row);meters[id]=meter}
 function render(){const state=simulation.state();for(const [id,meter] of Object.entries(meters))meter.value=state[id];root.style.outline=state.thirst<15||state.hunger<15?'2px solid orange':'none';return state}
 for(const [label,type] of [['음식','food'],['물','water']]){const button=doc.createElement('button');button.textContent=label;button.addEventListener('click',()=>{simulation.consume(type);render()});root.append(button)}
 doc.body.append(root);render();
 return {simulation,tick(dt,environment={}){simulation.tick(dt,environment);return render()},dispose(){root.remove()}}
}
