-- RobloxCommonSkillSignature: 스킬마다 모양이 다른 시그니처 VFX·궤적·잔상·화면 반응·막기/패리 연출을 한 번에 설치하는 공용 모듈.
-- 마력숲에서 검증한 24종 스타일(slam/sweep/dash/strike/fury/multi/backstab/ultimate/stun/kick/rush 등)을 모든 게임이 재사용한다.
-- 순수 시각 효과: 피해·판정·쿨다운은 건드리지 않고 서버가 승인한 이벤트에서만 호출한다.
-- 새 모델/외부 에셋 없이 Roblox 기본 파티클·네온 효과 파트·빔으로만 만들며, 이펙트 파트는 Debris로 즉시 정리된다.
-- 사용: require(Shared.RobloxCommonSkillSignature).Install({
--   player=Players.LocalPlayer, gui=ScreenGui, Config=GameConfig, actionsById={[id]=action}, remote=RemoteEvent,
--   meadowArt=table(sfx 함수 포함), combatVFX=RobloxCommonVFX 또는 nil, reducedEffects=function() return bool end })
-- 설치 후 meadowArt.signature/styleOf/colorOf/flair/guardShield/guardHit/motionTrail/impactDetail 이 채워진다.
local Signature = {}

function Signature.Install(ctx)
  local Config, actionsById, combatVFX = ctx.Config, ctx.actionsById, ctx.combatVFX
  local gui, meadowArt, player, remote = ctx.gui, ctx.meadowArt, ctx.player, ctx.remote
  local function reducedEffects() return ctx.reducedEffects() == true end
  local TS=game:GetService("TweenService")
  local DB=game:GetService("Debris")
  local RS=game:GetService("RunService")
  local white=Color3.fromRGB(255,255,245)
  local function anchorPart(cf,size,color,shape,transp)
    local p=Instance.new("Part")
    p.Anchored=true;p.CanCollide=false;p.CanTouch=false;p.CanQuery=false;p.CastShadow=false
    p.Material=Enum.Material.Neon;p.Color=color;p.Transparency=transp or 0
    if shape then p.Shape=shape end
    p.Size=size;p.CFrame=cf;p.Parent=workspace
    return p
  end
  local function fade(p,goal,t,style)
    TS:Create(p,TweenInfo.new(t,style or Enum.EasingStyle.Quad,Enum.EasingDirection.Out),goal):Play()
    DB:AddItem(p,t+.15)
  end
  local function ring(pos,color,r0,r1,t,thick)
    local p=anchorPart(CFrame.new(pos+Vector3.new(0,.35,0))*CFrame.Angles(0,0,math.pi/2),Vector3.new(thick or .22,r0*2,r0*2),color,Enum.PartType.Cylinder,.1)
    fade(p,{Size=Vector3.new(thick or .22,r1*2,r1*2),Transparency=1},t)
  end
  local function burst(pos,color,count,s0,s1,size,life,spread,tex)
    local p=anchorPart(CFrame.new(pos),Vector3.new(.2,.2,.2),color,nil,1)
    local a=Instance.new("Attachment");a.Parent=p
    local e=Instance.new("ParticleEmitter")
    e.Texture=tex or "rbxasset://textures/particles/sparkles_main.dds"
    e.Color=ColorSequence.new(color,white:Lerp(color,.4));e.LightEmission=1;e.Rate=0
    e.Lifetime=NumberRange.new(life*.6,life);e.Speed=NumberRange.new(s0,s1)
    e.SpreadAngle=Vector2.new(spread,spread);e.Drag=3
    e.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,size),NumberSequenceKeypoint.new(1,0)})
    e.Parent=a
    e:Emit(reducedEffects() and math.ceil(count*.4) or count)
    DB:AddItem(p,life+.5)
  end
  local function streak(a,b,color,width,t)
    local d=b-a
    if d.Magnitude<.1 then return end
    local p=anchorPart(CFrame.lookAt(a+d/2,b),Vector3.new(width,width,d.Magnitude),color,nil,.05)
    fade(p,{Size=Vector3.new(width*.2,width*.2,d.Magnitude),Transparency=1},t)
  end
  local function light(pos,color,bright,range,t)
    local p=anchorPart(CFrame.new(pos),Vector3.new(.2,.2,.2),color,nil,1)
    local l=Instance.new("PointLight");l.Color=color;l.Brightness=bright;l.Range=range;l.Parent=p
    TS:Create(l,TweenInfo.new(t),{Brightness=0}):Play()
    DB:AddItem(p,t+.1)
  end
  local shakeToken=0
  local suppress=false
  local odyMotionSerial=0
  local function shake(mag,t)
    if reducedEffects() or suppress then return end
    local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
    if not human then return end
    shakeToken+=1
    local mine=shakeToken
    task.spawn(function()
      local began=os.clock()
      while os.clock()-began<t and shakeToken==mine and human.Parent do
        local k=1-(os.clock()-began)/t
        human.CameraOffset=Vector3.new((math.random()-.5)*mag*k,(math.random()-.5)*mag*k,0)
        RS.Heartbeat:Wait()
      end
      if shakeToken==mine and human.Parent then human.CameraOffset=Vector3.zero end
    end)
  end
  local function screen(color,alpha,t)
    if reducedEffects() or suppress then return end
    local f=Instance.new("Frame");f.Size=UDim2.fromScale(1,1);f.BackgroundColor3=color;f.BackgroundTransparency=alpha
    f.BorderSizePixel=0;f.ZIndex=2;f.Parent=gui
    TS:Create(f,TweenInfo.new(t),{BackgroundTransparency=1}):Play()
    DB:AddItem(f,t+.1)
  end
  local function pillar(pos,color,h,r,t)
    local p=anchorPart(CFrame.new(pos+Vector3.new(0,h/2,0))*CFrame.Angles(0,0,math.pi/2),Vector3.new(h,r*2,r*2),color,Enum.PartType.Cylinder,.35)
    fade(p,{Size=Vector3.new(h,r*.3,r*.3),Transparency=1},t)
  end
  local function orb(pos,color,r0,r1,t)
    local p=anchorPart(CFrame.new(pos),Vector3.new(r0*2,r0*2,r0*2),color,Enum.PartType.Ball,.55)
    fade(p,{Size=Vector3.new(r1*2,r1*2,r1*2),Transparency=1},t)
  end
  local function after(t,fn) task.delay(t,function() pcall(fn) end) end
  local function up(v,y) return v+Vector3.new(0,y,0) end

  local styles={}
  styles.slam=function(c)
    ring(c.pos,c.color,2,16,.42);ring(c.pos,white,1,9,.26,.35)
    burst(c.pos,c.color,26,14,34,1.1,.7,70)
    burst(up(c.pos,.5),Color3.fromRGB(150,125,95),14,6,16,2.2,.9,80,"rbxasset://textures/particles/smoke_main.dds")
    pillar(c.pos,c.color,12,1.6,.3);light(up(c.pos,2),c.color,4,22,.3);shake(.7,.3)
  end
  styles.strike=function(c)
    local p=up(c.pos,2.2)
    streak(p+Vector3.new(-3,3.2,0),p+Vector3.new(3,-2.4,0),white,.45,.2)
    streak(p+Vector3.new(-3,3.2,0),p+Vector3.new(3,-2.4,0),c.color,1.0,.28)
    burst(p,c.color,14,10,26,.8,.4,50);ring(c.pos,c.color,1,6,.25);shake(.25,.15)
  end
  styles.sweep=function(c)
    local center=up(c.root.Position,2.4)
    ring(c.root.Position,c.color,3,12,.4)
    task.spawn(function()
      for i=0,9 do
        local ang=math.rad(i*36)
        local dir=Vector3.new(math.sin(ang),0,math.cos(ang))
        local a,b=center+dir*3,center+dir*11
        streak(a,b,i%2==0 and white or c.color,.55,.16)
        task.wait(.02)
      end
    end)
    burst(center,c.color,18,18,32,.8,.5,180);shake(.4,.22)
  end
  styles.dash=function(c)
    local back=-(c.dir)
    for i=-1,1 do
      local off=Vector3.new(-c.dir.Z,0,c.dir.X)*i*1.1
      streak(up(c.root.Position,2)+off,up(c.root.Position,2)+off+back*9,i==0 and white or c.color,.28,.3)
    end
    ring(c.root.Position,c.color,1.5,7,.3);burst(c.root.Position,Color3.fromRGB(190,170,140),10,4,12,1.6,.6,90,"rbxasset://textures/particles/smoke_main.dds")
  end
  styles.stun=function(c)
    ring(c.pos,c.color,1,9,.3);ring(c.pos,white,.5,5,.2,.35)
    burst(up(c.pos,4),Color3.fromRGB(255,235,120),12,4,12,1.2,.8,120)
    streak(up(c.pos,.5),up(c.pos,9),c.color,.9,.28);screen(white,.9,.1);shake(.5,.2)
  end
  styles.fury=function(c)
    local p=c.root.Position
    pillar(p,Color3.fromRGB(255,70,50),14,2.6,.7);ring(p,Color3.fromRGB(255,110,60),2,12,.5)
    burst(up(p,1),Color3.fromRGB(255,90,50),30,8,24,1.2,.9,40);screen(Color3.fromRGB(255,60,40),.9,.35)
    light(up(p,3),Color3.fromRGB(255,90,50),4,26,.6);shake(.5,.3)
  end
  styles.multi=function(c)
    for i=1,5 do
      after((i-1)*.07,function()
        local p=up(c.pos,2)
        local a=math.random()*math.pi
        local d=Vector3.new(math.cos(a),math.random()-.3,math.sin(a)).Unit*3.5
        streak(p-d,p+d,i%2==0 and white or c.color,.35,.15)
        burst(p,c.color,6,8,18,.6,.3,60)
      end)
    end
    shake(.3,.4)
  end
  styles.bolt=function(c)
    local from=up(c.root.Position,2.2)
    local to=up(c.pos,2)
    local o=anchorPart(CFrame.new(from),Vector3.new(1.2,1.2,1.2),c.color,Enum.PartType.Ball,0)
    local t=.17
    TS:Create(o,TweenInfo.new(t,Enum.EasingStyle.Linear),{Position=to}):Play()
    DB:AddItem(o,t+.1)
    task.spawn(function()
      local steps=5
      for i=1,steps do
        task.wait(t/steps)
        local a=from:Lerp(to,(i-1)/steps);local b=from:Lerp(to,i/steps)
        streak(a,b,c.color,.5,.25)
      end
      ring(c.pos,c.color,.8,5,.3);orb(to,c.color,.6,4,.3)
      burst(to,white,14,8,22,.7,.45,180);light(to,c.color,3,16,.3)
    end)
  end
  styles.pierce=function(c)
    local from=up(c.root.Position,2.2)
    local to=up(c.pos,2)
    local ext=to+((to-from).Magnitude>1 and (to-from).Unit or Vector3.zAxis)*8
    streak(from,ext,white,.35,.2);streak(from,ext,c.color,.9,.3)
    ring(c.pos,c.color,.6,4,.25);burst(to,c.color,12,8,20,.7,.4,60)
  end
  styles.burst=function(c)
    orb(up(c.pos,2),c.color,1,8,.4);ring(c.pos,c.color,1.5,11,.4);ring(c.pos,white,1,6,.25)
    burst(up(c.pos,2),c.color,26,10,28,.9,.7,180);light(up(c.pos,2),c.color,4,24,.4);shake(.35,.2)
  end
  styles.rain=function(c)
    for i=1,8 do
      after((i-1)*.06,function()
        local a=math.random()*math.pi*2
        local r=math.random()*7
        local g=c.pos+Vector3.new(math.cos(a)*r,0,math.sin(a)*r)
        streak(up(g,16),up(g,.5),c.color,.3,.18)
        after(.12,function() ring(g,c.color,.4,2.4,.2,.15);burst(up(g,.4),white,4,4,10,.5,.3,90) end)
      end)
    end
  end
  styles.root=function(c)
    ring(c.pos,c.color,5,.8,.5,.3);ring(c.pos,c.color,8,1.6,.55,.2)
    for i=1,6 do
      local a=i*math.pi/3
      local g=c.pos+Vector3.new(math.cos(a)*3,0,math.sin(a)*3)
      after(i*.03,function() streak(g,up(g,4+math.random()*2),c.color,.5,.5) end)
    end
    burst(c.pos,c.color,14,3,10,1,.8,120)
  end
  styles.mark=function(c)
    ring(c.pos,c.color,5,1.2,.4,.2)
    streak(up(c.pos,1),up(c.pos,9),c.color,.25,.5)
    streak(c.pos+Vector3.new(-3,5,0),c.pos+Vector3.new(3,5,0),c.color,.25,.5)
    burst(up(c.pos,5),c.color,8,2,8,.9,.6,180)
  end
  styles.guard=function(c)
    local p=c.root.Position
    orb(up(p,3),Color3.fromRGB(150,200,255),3,6.5,.5);ring(p,Color3.fromRGB(150,200,255),2,8,.35)
    burst(up(p,3),Color3.fromRGB(190,225,255),12,3,10,.8,.6,180)
  end
  styles.parry=function(c)
    local p=up(c.pos,2.2)
    streak(p+Vector3.new(-3,3,0),p+Vector3.new(3,-3,0),white,.5,.22)
    streak(p+Vector3.new(3,3,0),p+Vector3.new(-3,-3,0),Color3.fromRGB(255,220,120),.5,.22)
    ring(c.pos,Color3.fromRGB(255,225,130),1,8,.3);burst(p,Color3.fromRGB(255,225,130),24,12,30,.8,.4,180)
    screen(white,.86,.12);shake(.35,.18);light(p,Color3.fromRGB(255,225,130),4,18,.25)
  end
  styles.heal=function(c)
    local p=c.root.Position
    local col=Color3.fromRGB(120,255,160)
    ring(p,col,2,7,.6);pillar(p,col,9,1.6,.7)
    burst(p,col,24,3,9,.9,1.2,25);light(up(p,2),col,3,18,.7)
  end
  styles.healaoe=function(c)
    local p=c.root.Position
    local col=Color3.fromRGB(120,255,160)
    ring(p,col,3,16,.7);ring(p,white,2,10,.5,.3);pillar(p,col,12,2.4,.8)
    burst(p,col,34,4,12,1,1.3,30);light(up(p,2),col,4,26,.8)
  end
  styles.buff=function(c)
    local p=c.root.Position
    ring(p,c.color,10,1,.55,.25);orb(up(p,3),c.color,6,1,.5)
    burst(up(p,3),c.color,20,-9,-4,.9,.7,180);after(.4,function() pillar(p,c.color,8,1.4,.5) end)
  end
  styles.oath=function(c)
    local p=c.root.Position
    local gold=Color3.fromRGB(255,215,110)
    pillar(p,gold,40,3,1);ring(p,gold,3,18,.8);ring(p,white,2,11,.5,.3)
    burst(p,gold,36,6,22,1.2,1.4,40);light(up(p,3),gold,5,34,.9);screen(gold,.92,.4);shake(.3,.3)
  end
  styles.smoke=function(c)
    local dark=Color3.fromRGB(70,60,90)
    local sm="rbxasset://textures/particles/smoke_main.dds"
    burst(up(c.root.Position,2),dark,20,3,10,3.4,1.2,180,sm)
    if (c.pos-c.root.Position).Magnitude>3 then
      streak(up(c.root.Position,2),up(c.pos,2),c.color,.4,.25)
      after(.12,function() burst(up(c.pos,2),dark,16,3,9,3,1,180,sm) end)
    end
  end
  styles.backstab=function(c)
    local p=up(c.pos,2.2)
    local red=Color3.fromRGB(255,60,70)
    streak(p+Vector3.new(-2.5,2.5,0),p+Vector3.new(2.5,-2.5,0),white,.4,.18)
    streak(p+Vector3.new(2.5,2.5,0),p+Vector3.new(-2.5,-2.5,0),red,.7,.25)
    burst(p,red,20,10,26,.8,.5,120);ring(c.pos,red,1,5,.22);shake(.35,.18)
  end
  styles.chain=function(c)
    local a=up(c.root.Position,2.2)
    local b=up(c.pos,2)
    local prev=a
    for i=1,5 do
      local t=i/5
      local pt=a:Lerp(b,t)+(i<5 and Vector3.new((math.random()-.5)*3,(math.random()-.5)*3,(math.random()-.5)*3) or Vector3.zero)
      streak(prev,pt,i%2==0 and white or c.color,.3,.22)
      prev=pt
    end
    burst(b,c.color,14,8,22,.7,.4,180);light(b,c.color,3,14,.25)
  end
  styles.ultimate=function(c)
    local p=c.root.Position
    ring(p,c.color,2,22,.6);after(.12,function() ring(p,white,2,16,.5,.4) end);after(.25,function() ring(p,c.color,2,28,.7) end)
    pillar(p,c.color,60,4,1);orb(up(p,3),c.color,2,16,.6)
    burst(up(p,2),c.color,44,10,40,1.4,1.1,180);light(up(p,3),c.color,6,40,.9)
    screen(white,.78,.45);shake(1,.5)
  end
  styles.dodge=function(c)
    local side=c.side or 1
    local right=Vector3.new(c.dir.Z,0,-c.dir.X)
    local p=up(c.root.Position,2)
    streak(p-right*side*5,p,Color3.fromRGB(150,255,235),.5,.3)
    streak(p-right*side*4+Vector3.new(0,.8,0),p+Vector3.new(0,.8,0),white,.2,.25)
    ring(c.root.Position,Color3.fromRGB(150,255,235),1,5,.3)
    burst(c.root.Position,Color3.fromRGB(190,170,140),8,3,9,1.4,.5,90,"rbxasset://textures/particles/smoke_main.dds")
  end
  styles.kick=function(c)
    ring(c.pos,white,1,10,.3,.35);ring(c.pos,Color3.fromRGB(255,170,90),.5,6,.22)
    for i=1,8 do
      local a=i*math.pi/4
      local d=Vector3.new(math.cos(a),0,math.sin(a))
      streak(up(c.pos,.8)+d*1.5,up(c.pos,.8)+d*7,white,.22,.2)
    end
    burst(up(c.pos,2),Color3.fromRGB(255,190,110),18,12,30,.9,.4,120);screen(white,.9,.1);shake(.6,.22)
  end
  styles.rush=function(c)
    local p=up(c.root.Position,2)
    for i=-1,1 do
      local off=Vector3.new(-c.dir.Z,0,c.dir.X)*i*1.3
      streak(p+off,p+off-c.dir*10,i==0 and white or Color3.fromRGB(255,170,90),.32,.35)
    end
    burst(c.root.Position,Color3.fromRGB(190,170,140),16,4,14,2,.8,90,"rbxasset://textures/particles/smoke_main.dds")
    ring(c.root.Position,Color3.fromRGB(255,170,90),1.5,8,.35);shake(.4,.25)
  end

  local coreStyle={["skill-meadow-heavy"]="slam",["skill-meadow-sweep"]="sweep",["skill-meadow-bolt"]="bolt",
    ["skill-meadow-guard"]="guard",["skill-meadow-parry"]="parry",["skill-meadow-dodge-left"]="dodge",["skill-meadow-dodge-right"]="dodge",
    ["skill-meadow-sprint"]="dash",["skill-meadow-heal"]="heal",["skill-meadow-focus"]="buff",["skill-meadow-oath"]="oath",
    ["skill-meadow-ultimate"]="ultimate"}
  local modeStyle={DASH="dash",STUN="stun",SWEEP="sweep",STRIKE="strike",FOCUS_STRIKE="strike",FURY="fury",MULTI="multi",
    BULWARK="guard",GUARD="guard",SHIELD="guard",HEAL="heal",HEAL_AOE="healaoe",OATH="oath",RALLY="buff",LAST_STAND="fury",
    PARRY="parry",CHAIN="chain",FAN="multi",SPLIT="multi",SHOT="bolt",SNIPE="pierce",PIERCE="pierce",HUNT="mark",MARK="mark",
    RAIN="rain",ROOT="root",TRAP="root",BOLT="bolt",BURST="burst",OVERLOAD="burst",RESONATE="burst",
    BACKSTAB="backstab",EXECUTE="backstab",BLINK="smoke",VANISH="smoke",NIGHT="smoke",SMOKE="smoke",SMOKE_ADV="smoke"}
  local schoolColor={Warrior=Color3.fromRGB(255,150,80),Guardian=Color3.fromRGB(120,190,255),Hunter=Color3.fromRGB(150,230,120),
    Shadow=Color3.fromRGB(175,115,255),Magic=Color3.fromRGB(120,225,255)}
  local coreColor={["skill-meadow-heavy"]=Color3.fromRGB(255,150,80),["skill-meadow-sweep"]=Color3.fromRGB(255,200,110),
    ["skill-meadow-bolt"]=Color3.fromRGB(130,200,255),["skill-meadow-focus"]=Color3.fromRGB(180,150,255),
    ["skill-meadow-ultimate"]=Color3.fromRGB(255,230,150),["skill-meadow-sprint"]=Color3.fromRGB(255,235,170)}
  -- ───── 막기 전용 연출: 기력 방패·룬 링·타격 파문 ─────
  local shields={}
  meadowArt.guardPulse={}
  meadowArt.guardShield=function(character,root,life)
    if reducedEffects() and false then return end
    local old=shields[character]
    if old then old.stop=true end
    local blue=Color3.fromRGB(110,185,255)
    local state={stop=false}
    shields[character]=state
    local disc=anchorPart(root.CFrame,Vector3.new(.3,7.4,6),blue,Enum.PartType.Cylinder,1)
    disc.Material=Enum.Material.ForceField
    local rune=anchorPart(root.CFrame,Vector3.new(.15,10,10),blue,Enum.PartType.Cylinder,1)
    local rune2=anchorPart(root.CFrame,Vector3.new(.15,6.4,6.4),Color3.fromRGB(210,235,255),Enum.PartType.Cylinder,1)
    local lightPart=anchorPart(root.CFrame,Vector3.new(.2,.2,.2),blue,nil,1)
    local pl=Instance.new("PointLight");pl.Color=blue;pl.Range=14;pl.Brightness=0;pl.Parent=lightPart
    local began=os.clock()
    local conn
    conn=RS.Heartbeat:Connect(function()
      local now=os.clock()
      local age=now-began
      if state.stop or age>life or not root.Parent or not character.Parent then
        conn:Disconnect()
        for _,p in ipairs({disc,rune,rune2,lightPart}) do p:Destroy() end
        if shields[character]==state then shields[character]=nil end
        return
      end
      local fadeIn=math.clamp(age/.1,0,1)
      local fadeOut=math.clamp((life-age)/.35,0,1)
      local a=fadeIn*fadeOut
      local pulseAt=meadowArt.guardPulse[character] or -10
      local perfect=meadowArt.guardPerfect and meadowArt.guardPerfect[character]
      local pulse=math.clamp(1-(now-pulseAt)/.26,0,1)
      local col=(perfect and Color3.fromRGB(255,226,140) or blue):Lerp(white,pulse*.7)
      local cf=root.CFrame
      local sway=math.sin(age*3.2)*.06
      disc.CFrame=cf*CFrame.new(0,.8+sway,-3.1-pulse*.5)*CFrame.Angles(0,math.pi/2,0)
      disc.Size=Vector3.new(.3+pulse*.7,7.4+pulse*1.2,6+pulse*1)
      disc.Color=col
      disc.Transparency=1-a*(.55+pulse*.4)
      local floor=cf.Position-Vector3.new(0,2.9,0)
      rune.CFrame=CFrame.new(floor)*CFrame.Angles(0,age*1.6,math.pi/2)
      rune2.CFrame=CFrame.new(floor+Vector3.new(0,.05,0))*CFrame.Angles(0,-age*2.4,math.pi/2)
      rune.Color=col;rune2.Color=col
      rune.Transparency=1-a*.55;rune2.Transparency=1-a*.4
      lightPart.CFrame=cf*CFrame.new(0,.8,-3)
      pl.Brightness=a*(1.2+pulse*3);pl.Color=col
    end)
    -- 시작 순간 룬 링이 펼쳐지며 방패가 솟는다.
    ring(root.Position-Vector3.new(0,2.5,0),blue,2,10,.35)
    burst(root.Position+root.CFrame.LookVector*3+Vector3.new(0,.8,0),Color3.fromRGB(210,235,255),14,6,16,.8,.5,180)
  end
  meadowArt.guardHit=function(character,root,perfect)
    meadowArt.guardPerfect=meadowArt.guardPerfect or {}
    meadowArt.guardPerfect[character]=perfect
    meadowArt.guardPulse[character]=os.clock()
    local look=root.CFrame.LookVector
    local right=root.CFrame.RightVector
    local hitPos=root.Position+look*3.3+Vector3.new(0,.8,0)
    local col=perfect and Color3.fromRGB(255,226,140) or Color3.fromRGB(150,210,255)
    -- 방패 면을 따라 퍼지는 파문
    local ripple=anchorPart(CFrame.new(hitPos)*CFrame.fromMatrix(Vector3.zero,right,Vector3.yAxis,-look)*CFrame.Angles(0,math.pi/2,0),
      Vector3.new(.2,1.2,1.2),col,Enum.PartType.Cylinder,.1)
    fade(ripple,{Size=Vector3.new(.2,perfect and 11 or 7.5,perfect and 11 or 7.5),Transparency=1},perfect and .4 or .3)
    burst(hitPos,white,perfect and 30 or 18,12,perfect and 34 or 24,.8,.45,70)
    burst(hitPos,col,perfect and 22 or 12,6,16,1.2,.5,160)
    -- 방패에 막힌 충격이 발밑 흙먼지로 밀려난다
    burst(root.Position-Vector3.new(0,2.6,0)-look*1.5,Color3.fromRGB(190,170,140),10,5,14,2,.7,100,"rbxasset://textures/particles/smoke_main.dds")
    ring(root.Position-Vector3.new(0,2.7,0),col,3,perfect and 16 or 9,.3,.25)
    light(hitPos,col,perfect and 5 or 3,perfect and 22 or 14,.25)
    if perfect then
      streak(hitPos+right*4+Vector3.new(0,3,0),hitPos-right*4-Vector3.new(0,3,0),white,.5,.22)
      streak(hitPos-right*4+Vector3.new(0,3,0),hitPos+right*4-Vector3.new(0,3,0),col,.5,.22)
      orb(hitPos,col,1,6,.35)
    end
  end
  -- ───── 오디세이식 화려함: 잔상·화면 줌·피격 정지·림라이트·무기 궤적 ─────
  local function afterimage(character,color,life)
    if reducedEffects() then return end
    local ok,clone=pcall(function() character.Archivable=true;return character:Clone() end)
    if not ok or not clone then return end
    clone.Name="MeadowAfterimage"
    for _,d in ipairs(clone:GetDescendants()) do
      if d:IsA("LuaSourceContainer") or d:IsA("Humanoid") or d:IsA("Sound") or d:IsA("Tool") or d:IsA("Decal")
        or d:IsA("SurfaceAppearance") or d:IsA("BillboardGui") or d:IsA("ParticleEmitter") or d:IsA("Highlight") then
        d:Destroy()
      end
    end
    local parts={}
    for _,d in ipairs(clone:GetDescendants()) do
      if d:IsA("BasePart") then
        d.Anchored=true;d.CanCollide=false;d.CanQuery=false;d.CanTouch=false;d.CastShadow=false
        d.Material=Enum.Material.Neon;d.Color=color;d.Transparency=d.Name=="HumanoidRootPart" and 1 or .5
        if d:IsA("MeshPart") then d.TextureID="" end
        parts[#parts+1]=d
      end
    end
    clone.Parent=workspace
    for _,d in ipairs(parts) do
      TS:Create(d,TweenInfo.new(life,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{Transparency=1}):Play()
    end
    DB:AddItem(clone,life+.1)
  end
  local function fovPunch(amount,t)
    if reducedEffects() or suppress then return end
    local cam=workspace.CurrentCamera
    if not cam then return end
    local base=cam.FieldOfView
    TS:Create(cam,TweenInfo.new(.07,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{FieldOfView=base+amount}):Play()
    task.delay(.07,function()
      TS:Create(cam,TweenInfo.new(t or .3,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{FieldOfView=base}):Play()
    end)
  end
  local function rim(character,color,t)
    if reducedEffects() then return end
    local h=Instance.new("Highlight")
    h.Adornee=character;h.FillColor=color;h.OutlineColor=white
    h.FillTransparency=.35;h.OutlineTransparency=0;h.DepthMode=Enum.HighlightDepthMode.Occluded;h.Parent=character
    TS:Create(h,TweenInfo.new(t),{FillTransparency=1,OutlineTransparency=1}):Play()
    DB:AddItem(h,t+.1)
  end
  local flairSpec={
    slam={fov=9,rim=.35,sfx={"hit",.9,.7}},sweep={fov=4,ghost=3,gap=.09,sfx={"swing",.6,.9}},dash={fov=10,ghost=3,gap=.07,sfx={"whoosh",.5,1.2}},
    strike={fov=3,ghost=1,sfx={"swing",.5,1.1}},fury={fov=8,rim=.6,sfx={"lunge",.7,.8}},multi={fov=3,ghost=2,gap=.1,sfx={"swing",.5,1.2}},
    backstab={fov=5,ghost=2,gap=.08,sfx={"lunge",.5,1.3}},ultimate={fov=14,ghost=4,gap=.12,rim=.7,sfx={"lunge",.9,.6}},
    stun={fov=5,sfx={"hit",.7,.9}},kick={fov=6,ghost=1,rim=.25,sfx={"hit",.8,.85}},rush={fov=8,ghost=2,gap=.08,sfx={"whoosh",.6,.9}},
    bolt={fov=2},burst={fov=3,rim=.3},pierce={fov=3,sfx={"lunge",.5,1.1}},chain={fov=3},parry={fov=4,rim=.3},
  }
  meadowArt.flair=function(style,color,mine)
    local spec=flairSpec[style]
    if not spec or not mine then return end
    local character=player.Character
    if not character then return end
    if spec.fov then fovPunch(spec.fov) end
    if spec.rim then rim(character,color,spec.rim) end
    if spec.sfx and meadowArt.sfx then pcall(meadowArt.sfx,spec.sfx[1],spec.sfx[2],spec.sfx[3]) end
    if spec.ghost then
      for i=1,spec.ghost do task.delay((i-1)*(spec.gap or .08),function() afterimage(character,color,.45) end) end
    end
  end
  -- 무기(맨손은 발/주먹)에 접촉 직전부터 굵은 궤적을 단다.
  local trailStyles={slam=1,strike=1,sweep=1,dash=1,stun=1,fury=1,multi=1,pierce=1,backstab=1,ultimate=1,chain=1,kick=1,rush=1,parry=1}
  meadowArt.motionTrail=function(actionId,track)
    if not combatVFX or reducedEffects() then return end
    local style=meadowArt.styleOf(actionId)
    if not style or not trailStyles[style] then return end
    local family=meadowArt.motion.family()
    if family=="bow" then return end
    local character=player.Character
    if not character then return end
    local tool=character:FindFirstChildOfClass("Tool")
    local handle=tool and tool:FindFirstChild("Handle")
    local legStyle=style=="kick" or (family=="fist" and (style=="sweep" or style=="dash" or style=="stun" or style=="slam"))
    local host=legStyle and (character:FindFirstChild("RightFoot") or character:FindFirstChild("Right Leg"))
      or (handle and handle:IsA("BasePart") and handle) or character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
    if not host then return end
    local contact,last=0,track.dur
    for _,k in ipairs(track.keys) do if k.c then contact=k.t;break end end
    if style=="multi" then contact=track.keys[#track.keys-1].t end
    local color=meadowArt.colorOf(actionId)
    local ok,_,ctl=pcall(combatVFX.AttachShortTrail,host,{color=color,lifetime=.4,width=family=="h2" and 2 or 1.4,length=family=="h2" and 5 or 3.6})
    if not ok or not ctl then return end
    ctl.SetEnabled(false)
    local from=style=="multi" and 0 or math.max(0,contact-.24)
    task.delay(from,function() pcall(ctl.SetEnabled,true) end)
    task.delay(math.min(last,contact+.32),function() pcall(ctl.SetEnabled,false);task.delay(.5,function() pcall(ctl.Destroy) end) end)
  end
  meadowArt.lastSkill={color=Color3.fromRGB(128,250,201),at=-100}

  -- actionId: 승인된 스킬 ID 또는 'odyssey-kick'/'odyssey-rush'. root: 시전자 루트, pos: 목표 위치.
  meadowArt.signature=function(actionId,root,pos,isMine)
    local style=coreStyle[actionId] or styles[actionId:gsub("^odyssey%-","")] and actionId:gsub("^odyssey%-","")
    local color=coreColor[actionId] or Color3.fromRGB(255,235,170)
    local node=Config.MeadowSkillNodeById and Config.MeadowSkillNodeById[actionId]
    if node then
      style=modeStyle[node.Mode] or "strike"
      color=schoolColor[node.School] or color
    end
    if actionId=="skill-meadow-guard" then color=Color3.fromRGB(150,200,255) end
    if not style or not styles[style] then return end
    local flatDir=Vector3.new(pos.X-root.Position.X,0,pos.Z-root.Position.Z)
    if flatDir.Magnitude<.2 then flatDir=Vector3.new(root.CFrame.LookVector.X,0,root.CFrame.LookVector.Z) end
    flatDir=flatDir.Magnitude>.01 and flatDir.Unit or Vector3.zAxis
    local ctx={root=root,pos=pos,color=color,dir=flatDir,side=actionId=="skill-meadow-dodge-left" and -1 or 1}
    if isMine then meadowArt.lastSkill={color=color,at=os.clock(),style=style} end
    -- 본인 화면이 아닌 연출은 흔들림을 쓰지 않도록 shake/screen을 무력화한 복사본이 아니라, 거리로 걸러낸다.
    if not isMine and (root.Position-(player.Character and player.Character:GetPivot().Position or root.Position)).Magnitude>70 then return end
    -- 직접 만든 관절 모션이 있으면 접촉 키프레임 시점에 맞춰 충격 연출을 낸다(본인 화면만. 타인은 즉시).
    local delay=0
    if isMine and meadowArt.motion and actionId~="skill-meadow-guard" and actionId~="skill-meadow-parry"
      and not actionId:find("dodge",1,true) then
      local tr=meadowArt.motion.track(actionId)
      if tr then
        for _,k in ipairs(tr.keys) do if k.c then delay=math.min(k.t,1.5);break end end
      end
    end
    local mine=isMine
    local function run()
      suppress=not mine
      pcall(styles[style],ctx)
      pcall(meadowArt.flair,style,color,mine)
      suppress=false
    end
    if delay>.05 then task.delay(delay,run) else run() end
  end
  meadowArt.colorOf=function(actionId)
    local node=Config.MeadowSkillNodeById and Config.MeadowSkillNodeById[actionId]
    if node then return schoolColor[node.School] or Color3.fromRGB(255,235,170) end
    return coreColor[actionId] or Color3.fromRGB(255,235,170)
  end
  meadowArt.styleOf=function(actionId)
    if actionId=="odyssey-kick" then return "kick" elseif actionId=="odyssey-rush" then return "rush" end
    local node=Config.MeadowSkillNodeById and Config.MeadowSkillNodeById[actionId]
    local style=node and modeStyle[node.Mode] or coreStyle[actionId]
    if style=="dodge" or style=="healaoe" and false then return nil end
    return style
  end
  remote.OnClientEvent:Connect(function(kind,name,position)
    if kind~="ODY_FX" or typeof(position)~="Vector3" then return end
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if root then
      local id="odyssey-"..tostring(name)
      -- 서버 승인 스킬이 아닌 고유 기술도 같은 관절 모션 경로를 쓰도록 클라이언트 전용 액션을 등록한다.
      actionsById[id]=actionsById[id] or {Id=id,Kind="ODY",MotionAtom="HEAVY_ATTACK_1",Label=name}
      odyMotionSerial=(odyMotionSerial or 0)+1
      player:SetAttribute("ApprovedActionMotion",id..":"..odyMotionSerial)
      meadowArt.signature(id,root,position,true)
    end
  end)
  -- 타격 반응: 직전 스킬의 색과 상태이상·치명타 색을 반영한 추가 충격.
  meadowArt.impactDetail=function(payload)
    local pos=payload.position
    local recent=meadowArt.lastSkill and os.clock()-meadowArt.lastSkill.at<.9
    local base=recent and meadowArt.lastSkill.color or Color3.fromRGB(235,250,230)
    if recent then
      streak(up(pos,3),up(pos,.8),base,.5,.18)
      burst(up(pos,2),base,payload.boss and 14 or 8,8,22,.7,.35,160)
    end
    local sc=({["화염"]=Color3.fromRGB(255,120,50),["독"]=Color3.fromRGB(130,230,90),["빙결"]=Color3.fromRGB(160,225,255),["출혈"]=Color3.fromRGB(235,40,60)})[payload.status]
    if sc then
      burst(up(pos,2.5),sc,10,3,12,1,.8,180);orb(up(pos,2),sc,.6,3.2,.3)
    end
    if payload.crit then
      ring(pos,Color3.fromRGB(255,225,120),.8,5.5,.25,.3);screen(Color3.fromRGB(255,225,120),.92,.15);shake(.4,.15)
    end
    if payload.finisher then ring(pos,white,1,9,.35,.3);shake(.5,.25) end
    if recent and meadowArt.motionHold then meadowArt.motionHold(payload.finisher and .12 or .06) end
  end
end

return Signature
