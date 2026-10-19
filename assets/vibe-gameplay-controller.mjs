// Renderer-independent movement and action gameplay runtime.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class VibeGameplayController {
 constructor({motion,physics={},config={}}={}){
  if(!motion)throw Error('motion engine required');
  this.motion=motion;this.physics=physics;
  this.config={walkSpeed:3,sprintSpeed:6,acceleration:18,deceleration:24,gravity:22,jumpSpeed:7,coyoteSeconds:.12,jumpBufferSeconds:.14,staminaMax:100,staminaRegen:18,sprintCost:12,dodgeCost:22,...config};
  this.position={x:0,y:0,z:0};this.velocity={x:0,y:0,z:0};
  this.grounded=true;this.coyote=0;this.jumpBuffer=0;this.stamina=this.config.staminaMax;
  this.input={x:0,z:0,sprint:false,jump:false,crouch:false};
 }
 setInput(input={}){
  const x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0;
  const length=Math.hypot(x,z)||1;
  this.input={x:clamp(x/Math.max(1,length),-1,1),z:clamp(z/Math.max(1,length),-1,1),sprint:!!input.sprint,jump:!!input.jump,crouch:!!input.crouch};
  if(this.input.jump)this.jumpBuffer=this.config.jumpBufferSeconds;
 }
 dodge(){
  if(this.stamina<this.config.dodgeCost)return false;
  if(!this.motion.queueAction('dodge',{priority:10,cooldown:.6}))return false;
  this.stamina-=this.config.dodgeCost;return true;
 }
 update(dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  dt=clamp(dt,0,.05);
  const c=this.config;
  this.coyote=this.grounded?c.coyoteSeconds:Math.max(0,this.coyote-dt);
  this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  if(this.jumpBuffer>0&&this.coyote>0){
   this.velocity.y=c.jumpSpeed;this.grounded=false;this.coyote=0;this.jumpBuffer=0;
   this.motion.enter('jump-start');
  }
  const canSprint=this.input.sprint&&this.stamina>0&&!this.input.crouch;
  const speed=canSprint?c.sprintSpeed:c.walkSpeed;
  const targetX=this.input.x*speed,targetZ=this.input.z*speed;
  const approach=(current,target,rate)=>current+clamp(target-current,-rate*dt,rate*dt);
  this.velocity.x=approach(this.velocity.x,targetX,(targetX?c.acceleration:c.deceleration));
  this.velocity.z=approach(this.velocity.z,targetZ,(targetZ?c.acceleration:c.deceleration));
  if(!this.grounded)this.velocity.y-=c.gravity*dt;
  const next={x:this.position.x+this.velocity.x*dt,y:this.position.y+this.velocity.y*dt,z:this.position.z+this.velocity.z*dt};
  const resolved=this.physics.resolve?.(this.position,next,this.velocity)??{position:next,grounded:next.y<=0};
  const p=resolved.position??next;
  this.position={x:p.x,y:resolved.grounded?Math.max(0,p.y):p.y,z:p.z};
  this.grounded=!!resolved.grounded;
  if(this.grounded&&this.velocity.y<0)this.velocity.y=0;
  const horizontal=Math.hypot(this.velocity.x,this.velocity.z);
  const normalized=clamp(horizontal/c.sprintSpeed,0,1);
  this.motion.setMovement({speed:normalized,direction:Math.atan2(this.velocity.x,this.velocity.z),grounded:this.grounded,crouching:this.input.crouch});
  this.stamina=clamp(this.stamina+(canSprint&&horizontal>.1?-c.sprintCost:c.staminaRegen)*dt,0,c.staminaMax);
  this.physics.onMove?.(this.position,this.velocity);
 }
 snapshot(){return {position:{...this.position},velocity:{...this.velocity},grounded:this.grounded,stamina:this.stamina};}
}
