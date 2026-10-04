-- 파일명: assets/roblox/common-presentation-v1/RobloxCommonPresentation.luau
-- 역할: 회사 공용 로딩/브랜드/인트로/전환 그래픽 연출
-- 원칙: 순수 프레젠테이션 자산. 게임 진행, 저장, 스폰, 네트워크, 카메라 권한을 소유하지 않는다.

local TweenService = game:GetService("TweenService")
local RobloxCommonPresentation = {}

local function c(r,g,b) return Color3.fromRGB(r,g,b) end

local DEFAULT_THEME = table.freeze({
  Background=c(12,16,22),Background2=c(25,32,42),Panel=c(26,32,40),
  Text=c(244,246,249),Muted=c(158,170,184),Accent=c(102,168,226),Accent2=c(201,159,79),
  Track=c(48,57,68),Shadow=c(0,0,0),Corner=14,
})

local function themeOf(overrides)
  local out={};for k,v in pairs(DEFAULT_THEME) do out[k]=v end
  for k,v in pairs(overrides or {}) do if out[k]~=nil then out[k]=v end end
  return out
end
local function corner(parent,r) local x=Instance.new("UICorner");x.CornerRadius=UDim.new(0,r);x.Parent=parent;return x end
local function stroke(parent,color,w,t) local x=Instance.new("UIStroke");x.Color=color;x.Thickness=w or 1;x.Transparency=t or 0;x.Parent=parent;return x end
local function text(parent,name,value,pos,size,color,fontSize,bold)
  local t=Instance.new("TextLabel");t.Name=name;t.Position=pos or UDim2.new();t.Size=size or UDim2.fromScale(1,1);t.BackgroundTransparency=1
  t.Text=tostring(value or "");t.TextColor3=color;t.TextSize=fontSize or 14;t.TextWrapped=true;t.Font=bold and Enum.Font.GothamBold or Enum.Font.Gotham;t.Parent=parent
  return t
end
local function tag(root,id,role)
  root:SetAttribute("StudioAssetId",id);root:SetAttribute("StudioAssetPack","roblox-common-presentation-v1")
  root:SetAttribute("StudioAssetFamily","UI");root:SetAttribute("PresentationRole",role or id)
  root:SetAttribute("CompanyCommonBase",true);root:SetAttribute("InternalAuditStudioRequired",false)
  root:SetAttribute("ProductionVerified",false);root:SetAttribute("GameplayAuthority",false)
end
local function tween(obj,duration,props,easingStyle,easingDirection)
  return TweenService:Create(obj,TweenInfo.new(duration or .35,easingStyle or Enum.EasingStyle.Quad,easingDirection or Enum.EasingDirection.Out),props)
end

function RobloxCommonPresentation.CreateBrandMark(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "BrandMark";root.Size=options.size or UDim2.fromOffset(86,86);root.BackgroundTransparency=1;tag(root,"BRAND_MARK","BRAND")
  local ring=Instance.new("Frame");ring.Name="Ring";ring.AnchorPoint=Vector2.new(.5,.5);ring.Position=UDim2.fromScale(.5,.5);ring.Size=UDim2.fromScale(.84,.84);ring.BackgroundTransparency=1;ring.Parent=root;corner(ring,999);stroke(ring,th.Accent,4,.05)
  local core=Instance.new("Frame");core.Name="Core";core.AnchorPoint=Vector2.new(.5,.5);core.Position=UDim2.fromScale(.5,.5);core.Size=UDim2.fromScale(.42,.42);core.BackgroundColor3=th.Accent2;core.BorderSizePixel=0;core.Rotation=45;core.Parent=root;corner(core,7)
  local dot=Instance.new("Frame");dot.Name="Dot";dot.AnchorPoint=Vector2.new(.5,.5);dot.Position=UDim2.fromScale(.5,.5);dot.Size=UDim2.fromScale(.13,.13);dot.BackgroundColor3=th.Text;dot.BorderSizePixel=0;dot.Parent=root;corner(dot,999)
  root:SetAttribute("ImageAssetDependency",false);return root,ring,core,dot
end

function RobloxCommonPresentation.CreateLoadingSpinner(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "LoadingSpinner";root.Size=options.size or UDim2.fromOffset(42,42);root.BackgroundTransparency=1;tag(root,"LOADING_SPINNER","LOADING_FEEDBACK")
  local segments={}
  for i=1,8 do
    local seg=Instance.new("Frame");seg.Name="Segment"..i;seg.AnchorPoint=Vector2.new(.5,.5);seg.Position=UDim2.fromScale(.5,.5);seg.Size=UDim2.fromOffset(4,12);seg.BackgroundColor3=th.Accent;seg.BackgroundTransparency=(i-1)/10;seg.BorderSizePixel=0;seg.Rotation=(i-1)*45;seg.Parent=root;corner(seg,3)
    local offset=Instance.new("Frame");offset.Name="Visual";offset.AnchorPoint=Vector2.new(.5,1);offset.Position=UDim2.fromScale(.5,0);offset.Size=UDim2.fromScale(1,1);offset.BackgroundColor3=th.Accent;offset.BorderSizePixel=0;offset.Parent=seg;corner(offset,3)
    segments[i]=seg
  end
  local controller={_angle=0}
  function controller.Step()
    controller._angle=(controller._angle+45)%360;root.Rotation=controller._angle
  end
  return root,controller,segments
end

function RobloxCommonPresentation.CreateLoadingProgress(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "LoadingProgress";root.Size=options.size or UDim2.fromOffset(420,20);root.BackgroundColor3=th.Track;root.BorderSizePixel=0;tag(root,"LOADING_PROGRESS","LOADING_PROGRESS");corner(root,10)
  local fill=Instance.new("Frame");fill.Name="Fill";fill.Size=UDim2.fromScale(0,1);fill.BackgroundColor3=th.Accent;fill.BorderSizePixel=0;fill.Parent=root;corner(fill,10)
  local controller={}
  function controller.SetRatio(v) local n=math.clamp(tonumber(v) or 0,0,1);fill.Size=UDim2.fromScale(n,1);root:SetAttribute("DisplayedRatio",n) end
  controller.SetRatio(options.ratio or 0)
  root:SetAttribute("OwnsLoadProgress",false);return root,fill,controller
end

function RobloxCommonPresentation.CreateLoadingTip(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "LoadingTip";root.Size=options.size or UDim2.fromOffset(520,72);root.BackgroundColor3=th.Panel;root.BackgroundTransparency=.16;root.BorderSizePixel=0;tag(root,"LOADING_TIP","LOADING_TIP");corner(root,12);stroke(root,th.Accent,1,.45)
  local title=text(root,"Title",options.title or "TIP",UDim2.fromOffset(16,8),UDim2.new(1,-32,0,18),th.Accent,10,true)
  local body=text(root,"Body",options.text or "",UDim2.fromOffset(16,28),UDim2.new(1,-32,1,-36),th.Text,12,false);body.TextXAlignment=Enum.TextXAlignment.Left;body.TextYAlignment=Enum.TextYAlignment.Top
  return root,title,body
end

function RobloxCommonPresentation.CreateLoadingScreen(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "LoadingScreen";root.Size=UDim2.fromScale(1,1);root.BackgroundColor3=th.Background;root.BorderSizePixel=0;tag(root,"LOADING_SCREEN","LOADING_SCREEN")
  local grad=Instance.new("UIGradient");grad.Color=ColorSequence.new({ColorSequenceKeypoint.new(0,th.Background2),ColorSequenceKeypoint.new(1,th.Background)});grad.Rotation=115;grad.Parent=root
  local brand=RobloxCommonPresentation.CreateBrandMark({theme=th,size=UDim2.fromOffset(92,92)});brand.AnchorPoint=Vector2.new(.5,.5);brand.Position=UDim2.fromScale(.5,.37);brand.Parent=root
  local title=text(root,"Title",options.title or "LOADING",UDim2.new(.15,0,.49,0),UDim2.new(.7,0,0,38),th.Text,22,true);title.TextXAlignment=Enum.TextXAlignment.Center
  local status=text(root,"Status",options.statusText or "준비 중",UDim2.new(.15,0,.55,0),UDim2.new(.7,0,0,24),th.Muted,11,false);status.TextXAlignment=Enum.TextXAlignment.Center
  local progress,fill,progressController=RobloxCommonPresentation.CreateLoadingProgress({theme=th,size=UDim2.new(.48,0,0,16),ratio=options.ratio or 0});progress.AnchorPoint=Vector2.new(.5,.5);progress.Position=UDim2.fromScale(.5,.63);progress.Parent=root
  local tip,tipTitle,tipBody=RobloxCommonPresentation.CreateLoadingTip({theme=th,size=UDim2.new(.62,0,0,68),title=options.tipTitle or "TIP",text=options.tipText or ""});tip.AnchorPoint=Vector2.new(.5,1);tip.Position=UDim2.new(.5,0,1,-30);tip.Parent=root
  local spinner,spinnerController=RobloxCommonPresentation.CreateLoadingSpinner({theme=th,size=UDim2.fromOffset(36,36)});spinner.AnchorPoint=Vector2.new(.5,.5);spinner.Position=UDim2.new(.5,0,.70,0);spinner.Parent=root
  local controller={}
  function controller.SetProgress(v,statusText)
    progressController.SetRatio(v);if statusText~=nil then status.Text=tostring(statusText) end;spinnerController.Step()
  end
  function controller.SetTip(titleValue,bodyValue) if titleValue~=nil then tipTitle.Text=tostring(titleValue) end;if bodyValue~=nil then tipBody.Text=tostring(bodyValue) end end
  root:SetAttribute("OwnsLoadCompletion",false);root:SetAttribute("OwnsSpawnAuthority",false);return root,controller
end

function RobloxCommonPresentation.CreateIntroCanvas(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "IntroCanvas";root.Size=UDim2.fromScale(1,1);root.BackgroundColor3=th.Background;root.BorderSizePixel=0;tag(root,"INTRO_CANVAS","INTRO")
  local content=Instance.new("Frame");content.Name="Content";content.Size=UDim2.fromScale(1,1);content.BackgroundTransparency=1;content.Parent=root
  local fade=Instance.new("Frame");fade.Name="Fade";fade.Size=UDim2.fromScale(1,1);fade.BackgroundColor3=th.Background;fade.BorderSizePixel=0;fade.BackgroundTransparency=0;fade.Parent=root
  return root,content,fade
end

function RobloxCommonPresentation.CreateIntroTitleCard(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "IntroTitleCard";root.Size=options.size or UDim2.fromOffset(560,160);root.BackgroundTransparency=1;tag(root,"INTRO_TITLE_CARD","INTRO_TITLE")
  local title=text(root,"Title",options.title or "",UDim2.new(0,0,.16,0),UDim2.new(1,0,0,52),th.Text,30,true);title.TextXAlignment=Enum.TextXAlignment.Center
  local sub=text(root,"Subtitle",options.subtitle or "",UDim2.new(0,0,.54,0),UDim2.new(1,0,0,30),th.Muted,13,false);sub.TextXAlignment=Enum.TextXAlignment.Center
  local line=Instance.new("Frame");line.Name="Accent";line.AnchorPoint=Vector2.new(.5,.5);line.Position=UDim2.fromScale(.5,.83);line.Size=UDim2.new(.22,0,0,3);line.BackgroundColor3=th.Accent;line.BorderSizePixel=0;line.Parent=root;corner(line,2)
  return root,title,sub,line
end

function RobloxCommonPresentation.CreateTransitionCurtain(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "TransitionCurtain";root.Size=UDim2.fromScale(1,1);root.BackgroundColor3=options.color or th.Background;root.BackgroundTransparency=1;root.BorderSizePixel=0;tag(root,"TRANSITION_CURTAIN","SCREEN_TRANSITION")
  local controller={}
  function controller.Cover(duration) local tw=tween(root,duration or .25,{BackgroundTransparency=0});tw:Play();return tw end
  function controller.Reveal(duration) local tw=tween(root,duration or .35,{BackgroundTransparency=1});tw:Play();return tw end
  return root,controller
end

function RobloxCommonPresentation.CreateVignette(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "Vignette";root.Size=UDim2.fromScale(1,1);root.BackgroundColor3=th.Shadow;root.BackgroundTransparency=tonumber(options.transparency) or .78;root.BorderSizePixel=0;tag(root,"VIGNETTE_OVERLAY","ATMOSPHERE")
  return root
end

function RobloxCommonPresentation.CreateLetterbox(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "Letterbox";root.Size=UDim2.fromScale(1,1);root.BackgroundTransparency=1;tag(root,"LETTERBOX","INTRO_FRAMING")
  local h=math.clamp(tonumber(options.heightScale) or .10,.04,.22)
  local top=Instance.new("Frame");top.Name="Top";top.Size=UDim2.new(1,0,h,0);top.BackgroundColor3=th.Shadow;top.BorderSizePixel=0;top.Parent=root
  local bottom=Instance.new("Frame");bottom.Name="Bottom";bottom.AnchorPoint=Vector2.new(0,1);bottom.Position=UDim2.fromScale(0,1);bottom.Size=UDim2.new(1,0,h,0);bottom.BackgroundColor3=th.Shadow;bottom.BorderSizePixel=0;bottom.Parent=root
  return root,top,bottom
end

function RobloxCommonPresentation.CreateLayeredParallax(options)
  options=options or {};local th=themeOf(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "LayeredParallax";root.Size=options.size or UDim2.fromScale(1,1);root.BackgroundColor3=th.Background;root.BorderSizePixel=0;root.ClipsDescendants=true;tag(root,"LAYERED_PARALLAX","BACKGROUND_MOTION")
  local layers={}
  local colors=options.colors or {th.Background2,th.Panel,th.Accent}
  for i=1,3 do
    local f=Instance.new("Frame");f.Name="Layer"..i;f.Size=UDim2.new(1.2,0,.26+i*.08,0);f.AnchorPoint=Vector2.new(.5,1);f.Position=UDim2.new(.5,0,1-(i-1)*.08,0);f.BackgroundColor3=colors[i] or th.Panel;f.BackgroundTransparency=.16+(i-1)*.15;f.BorderSizePixel=0;f.Rotation=(i-2)*-2;f.Parent=root;corner(f,30);layers[i]=f
  end
  local controller={}
  function controller.Play(duration,amount)
    local d=duration or 3;local a=tonumber(amount) or .035
    for i,f in ipairs(layers) do tween(f,d,{Position=UDim2.new(.5+(i-2)*a,0,f.Position.Y.Scale,0)},Enum.EasingStyle.Sine,Enum.EasingDirection.InOut):Play() end
  end
  return root,layers,controller
end

function RobloxCommonPresentation.PlaySimpleFade(canvas, options)
  options=options or {};local fade=canvas:FindFirstChild("Fade");assert(fade,"INTRO_FADE_LAYER_REQUIRED")
  fade.BackgroundTransparency=0
  local tw=tween(fade,options.duration or .7,{BackgroundTransparency=1},Enum.EasingStyle.Quad,Enum.EasingDirection.Out);tw:Play();return tw
end

function RobloxCommonPresentation.PlayLogoReveal(canvas, options)
  options=options or {};local th=themeOf(options.theme);local content=canvas:FindFirstChild("Content") or canvas
  local holder=Instance.new("Frame");holder.Name="LogoReveal";holder.AnchorPoint=Vector2.new(.5,.5);holder.Position=UDim2.fromScale(.5,.5);holder.Size=UDim2.fromOffset(260,180);holder.BackgroundTransparency=1;holder.Parent=content
  local mark=RobloxCommonPresentation.CreateBrandMark({theme=th,size=UDim2.fromOffset(86,86)});mark.AnchorPoint=Vector2.new(.5,.5);mark.Position=UDim2.fromScale(.5,.38);mark.Parent=holder
  local title=text(holder,"BrandName",options.title or "STUDIO",UDim2.new(0,0,.68,0),UDim2.new(1,0,0,36),th.Text,20,true);title.TextXAlignment=Enum.TextXAlignment.Center
  local scale=Instance.new("UIScale");scale.Scale=.78;scale.Parent=holder;holder.BackgroundTransparency=1
  for _,d in ipairs(holder:GetDescendants()) do if d:IsA("GuiObject") and d~=holder then d.Visible=true end end
  tween(scale,options.duration or .55,{Scale=1},Enum.EasingStyle.Back,Enum.EasingDirection.Out):Play()
  return holder
end

function RobloxCommonPresentation.PlayIntroPreset(canvas, preset, options)
  local id=string.upper(tostring(preset or "SIMPLE_FADE"))
  if id=="SIMPLE_FADE" then return RobloxCommonPresentation.PlaySimpleFade(canvas,options)
  elseif id=="LOGO_REVEAL" then return RobloxCommonPresentation.PlayLogoReveal(canvas,options)
  elseif id=="TITLE_CARD" then
    local card=RobloxCommonPresentation.CreateIntroTitleCard(options);card.AnchorPoint=Vector2.new(.5,.5);card.Position=UDim2.fromScale(.5,.52);card.Parent=canvas:FindFirstChild("Content") or canvas;return card
  end
  error("UNKNOWN_INTRO_PRESET: "..id)
end

function RobloxCommonPresentation.Audit()
  return table.freeze({
    version=1,packId="roblox-common-presentation-v1",
    atoms=table.freeze({"BRAND_MARK","LOADING_SCREEN","LOADING_SPINNER","LOADING_PROGRESS","LOADING_TIP","INTRO_CANVAS","INTRO_TITLE_CARD","TRANSITION_CURTAIN","VIGNETTE_OVERLAY","LETTERBOX","LAYERED_PARALLAX"}),
    introPresets=table.freeze({"SIMPLE_FADE","LOGO_REVEAL","TITLE_CARD"}),
    studioRequiredForInternalUse=false,gameplayAuthority=false,ownsCamera=false,ownsSpawn=false,ownsSave=false,productionVerified=false
  })
end

return table.freeze(RobloxCommonPresentation)
