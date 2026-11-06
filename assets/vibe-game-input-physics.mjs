// Opt-in browser bindings. Never hijacks keys from focused inputs.
export function bindVibeBrowserControls(controller,{target=window,element=document,keys={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',sprint:'ShiftLeft',jump:'Space',crouch:'ControlLeft',dodge:'KeyQ'}}={}){
 if(!controller?.setInput||!controller?.dodge)throw Error('controller required');
 const held=new Set();let enabled=true;
 const editable=()=>{const e=element.activeElement;return !!e&&(e.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.tagName));};
 const sync=()=>controller.setInput({x:Number(held.has(keys.right))-Number(held.has(keys.left)),z:Number(held.has(keys.forward))-Number(held.has(keys.back)),sprint:held.has(keys.sprint),jump:held.has(keys.jump),crouch:held.has(keys.crouch)});
 const down=e=>{if(!enabled||editable()||e.repeat&&e.code===keys.dodge)return;if(Object.values(keys).includes(e.code)){held.add(e.code);if(e.code===keys.dodge)controller.dodge();sync();}};
 const up=e=>{if(held.delete(e.code))sync();};
 const blur=()=>{held.clear();sync()};
 target.addEventListener('keydown',down);target.addEventListener('keyup',up);target.addEventListener('blur',blur);
 return {setEnabled(value){enabled=!!value;if(!enabled)blur()},dispose(){blur();target.removeEventListener('keydown',down);target.removeEventListener('keyup',up);target.removeEventListener('blur',blur)}};
}
export function createHeightfieldPhysics({heightAt=()=>0,onMove}={}){
 return {resolve(previous,next,velocity){
  const height=heightAt(next.x,next.z);
  if(!Number.isFinite(height))throw Error('Invalid terrain height');
  const grounded=next.y<=height&&velocity.y<=0;
  return {position:{...next,y:grounded?height:next.y},grounded};
 },onMove};
}
