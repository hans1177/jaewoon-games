-- 파일명: assets/roblox/common-presentation-v1/RobloxCommonPresentation.luau
-- 역할: 회사 공용 브랜드 로딩/인트로 그래픽 프레젠테이션
-- 원칙: 화면 표현만 소유한다. 카메라, 게임 시작, 저장, 네트워크, 진행도 계산 권한은 게임 코드가 소유한다.

local Presentation = {}

local MODES=table.freeze({"SIMPLE_FADE","LOGO_REVEAL","PARTICLE_LIGHT","WORLD_PAN","MINIMAL_CINEMATIC"})
local GENRES=table.freeze({
  SURVIVAL={a=Color3.fromRGB(31,45,37),b=Color3.fromRGB(67,91,68),motif="FOREST_DEPTH"},
  RPG={a=Color3.fromRGB(38,39,55),b=Color3.fromRGB(83,70,106),motif="RUINED_HORIZON"},
  DEFENSE={a=Color3.fromRGB(35,43,55),b=Color3.fromRGB(69,91,118),motif="FORTRESS_LINES"},
  CASUAL={a=Color3.fromRGB(63,87,104),b=Color3.fromRGB(112,141,153),motif="SOFT_ISLAND"},
  PUZZLE={a=Color3.fromRGB(45,48,72),b=Color3.fromRGB(96,90,142),motif="GEOMETRIC_GLOW"},
  HORROR={a=Color3.fromRGB(22,24,28),b=Color3.fromRGB(54,46,50),motif="DARK_CORRIDOR"},
  STRATEGY={a=Color3.fromRGB(42,48,47),b=Color3.fromRGB(86,91,78),motif="TACTICAL_MAP"}
})

local function corner(parent,r)
  local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,r or 12);c.Parent=parent;return c
end

local function label(parent,name,textValue,size,pos,textSize,bold,color)
  local t=Instance.new("TextLabel");t.Name=name;t.Size=size;t.Position=pos or UDim2.new();t.BackgroundTransparency=1;t.Text=tostring(textValue or "");t.TextColor3=color or Color3.new(1,1,1);t.TextSize=textSize or 14;t.TextWrapped=true;t.Font=bold and Enum.Font.GothamBold or Enum.Font.Gotham;t.Parent=parent;return t
end

local function tag(root,role)
  root:SetAttribute("StudioAssetPack","roblox-common-presentation-v1")
  root:SetAttribute("StudioAssetFamily","UI")
  root:SetAttribute("PresentationRole",role)
  root:SetAttribute("CompanyCommonBase",true)
  root:SetAttribute("GameSpecificBrandingRequired",true)
  root:SetAttribute("GameplayAuthority",false)
  root:SetAttribute("CameraAuthority",false)
  root:SetAttribute("SaveAuthority",false)
  root:SetAttribute("NetworkAuthority",false)
  root:SetAttribute("ProductionVerified",false)
  root:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
end

function Presentation.CreateLoadingScreen(options)
  options=options or {}
  local genre=string.upper(tostring(options.genre or "SURVIVAL"))
  local palette=GENRES[genre] or GENRES.SURVIVAL
  local root=Instance.new("Frame")
  root.Name=options.name or "BrandLoadingScreen";root.Size=UDim2.fromScale(1,1);root.BackgroundColor3=palette.a;root.BorderSizePixel=0;tag(root,"BRAND_LOADING_SCREEN")
  local grad=Instance.new("UIGradient");grad.Color=ColorSequence.new(palette.a,palette.b);grad.Rotation=25;grad.Parent=root

  local logo=label(root,"Logo",options.logoText or "JAEWOON GAMES",UDim2.new(1,-48,0,70),UDim2.new(0,24,0.24,0),34,true)
  logo.TextXAlignment=Enum.TextXAlignment.Center
  local status=label(root,"Status",options.statusText or "게임을 준비하는 중",UDim2.new(1,-48,0,28),UDim2.new(0,24,0.62,0),14,false,Color3.fromRGB(218,225,230));status.TextXAlignment=Enum.TextXAlignment.Center
  local tip=label(root,"Tip",options.tipText or "팁: 탐색 중에는 주변 지형과 목표 표시를 확인해.",UDim2.new(1,-64,0,48),UDim2.new(0,32,0.76,0),13,false,Color3.fromRGB(197,207,214));tip.TextXAlignment=Enum.TextXAlignment.Center

  local track=Instance.new("Frame");track.Name="ProgressTrack";track.AnchorPoint=Vector2.new(0.5,0);track.Position=UDim2.new(0.5,0,0.70,0);track.Size=UDim2.new(0.62,0,0,12);track.BackgroundColor3=Color3.fromRGB(21,26,31);track.BorderSizePixel=0;track.Parent=root;corner(track,6)
  local fill=Instance.new("Frame");fill.Name="ProgressFill";fill.Size=UDim2.fromScale(math.clamp(tonumber(options.progress) or 0,0,1),1);fill.BackgroundColor3=options.accentColor or Color3.fromRGB(123,181,225);fill.BorderSizePixel=0;fill.Parent=track;corner(fill,6)

  local spinner=Instance.new("Frame");spinner.Name="Spinner";spinner.AnchorPoint=Vector2.new(0.5,0.5);spinner.Position=UDim2.new(0.5,0,0.55,0);spinner.Size=UDim2.fromOffset(36,36);spinner.BackgroundTransparency=1;spinner.Parent=root
  for i=1,8 do local dot=Instance.new("Frame");dot.Name="Dot"..i;dot.AnchorPoint=Vector2.new(0.5,0.5);dot.Size=UDim2.fromOffset(6,6);dot.Position=UDim2.new(0.5,math.cos(math.rad(i*45))*14,0.5,math.sin(math.rad(i*45))*14);dot.BackgroundColor3=Color3.fromRGB(225,232,238);dot.BackgroundTransparency=(i-1)/10;dot.BorderSizePixel=0;dot.Parent=spinner;corner(dot,3) end

  root:SetAttribute("GenreBackground",genre)
  root:SetAttribute("BackgroundMotif",palette.motif)
  root:SetAttribute("ProgressOwnedByGameCode",true)
  return root,{logo=logo,status=status,tip=tip,track=track,fill=fill,spinner=spinner}
end

function Presentation.ApplyProgress(parts,progress,statusText)
  if not parts then return end
  local value=math.clamp(tonumber(progress) or 0,0,1)
  if parts.fill then parts.fill.Size=UDim2.fromScale(value,1) end
  if parts.status and statusText~=nil then parts.status.Text=tostring(statusText) end
end

function Presentation.CreateIntro(options)
  options=options or {}
  local mode=string.upper(tostring(options.mode or "SIMPLE_FADE"))
  local valid=false
  for _,id in ipairs(MODES) do if id==mode then valid=true break end end
  assert(valid,"UNKNOWN_INTRO_MODE:"..mode)
  local root,parts=Presentation.CreateLoadingScreen({
    name=options.name or "BrandIntro",
    genre=options.genre,
    logoText=options.logoText,
    statusText=options.statusText or "",
    tipText=options.subtitle or "",
    progress=1,
    accentColor=options.accentColor
  })
  root.Name=options.name or "BrandIntro"
  tag(root,"INTRO_"..mode)
  parts.track.Visible=false
  parts.spinner.Visible=mode=="PARTICLE_LIGHT"
  root:SetAttribute("IntroMode",mode)
  root:SetAttribute("Intensity",math.clamp(tonumber(options.intensity) or 0.55,0,1))
  root:SetAttribute("DurationSeconds",math.clamp(tonumber(options.duration) or 2.2,0.6,6))
  root:SetAttribute("WorldPanIsVisualRequestOnly",mode=="WORLD_PAN")
  root:SetAttribute("MinimalCinematicNoGameplayControl",mode=="MINIMAL_CINEMATIC")
  return root,parts
end


function Presentation.CreateInputSkipHint(options)
  options=options or {}
  local root=Instance.new("Frame")
  root.Name=options.name or "InputSkipHint"
  root.Size=options.size or UDim2.fromOffset(280,42)
  root.BackgroundColor3=options.backgroundColor or Color3.fromRGB(26,31,37)
  root.BackgroundTransparency=0.12
  root.BorderSizePixel=0
  tag(root,"INPUT_SKIP_HINT")
  corner(root,10)
  local textValue=tostring(options.text or "길게 눌러 건너뛰기")
  local hint=label(root,"Hint",textValue,UDim2.new(1,-24,1,0),UDim2.fromOffset(12,0),13,true,Color3.fromRGB(232,238,243))
  hint.TextXAlignment=Enum.TextXAlignment.Center
  root:SetAttribute("OwnsSkipAuthority",false)
  root:SetAttribute("InputMode",tostring(options.inputMode or "AUTO"))
  root:SetAttribute("TouchKeyboardGamepadHintOnly",true)
  return root,hint
end

function Presentation.CreateReducedMotionIntro(options)
  options=options or {}
  local root,parts=Presentation.CreateIntro({
    name=options.name or "ReducedMotionIntro",
    genre=options.genre,
    logoText=options.logoText,
    statusText=options.statusText or "",
    subtitle=options.subtitle or "",
    mode="SIMPLE_FADE",
    intensity=math.min(0.18,math.clamp(tonumber(options.intensity) or 0.12,0,1)),
    duration=math.clamp(tonumber(options.duration) or 1.0,0.6,2.0),
    accentColor=options.accentColor
  })
  tag(root,"ACCESSIBILITY_REDUCED_MOTION")
  root:SetAttribute("ReducedMotion",true)
  root:SetAttribute("CameraMotionRequested",false)
  root:SetAttribute("ParticleMotionRequested",false)
  return root,parts
end

function Presentation.CreateFailureRecoveryState(options)
  options=options or {}
  local root,parts=Presentation.CreateLoadingScreen({
    name=options.name or "FailureRecoveryState",
    genre=options.genre,
    logoText=options.logoText,
    statusText=options.statusText or "복구 가능한 상태",
    tipText=options.tipText or "다시 시도하거나 안전한 화면으로 돌아갈 수 있어.",
    progress=0,
    accentColor=options.accentColor or Color3.fromRGB(218,126,92)
  })
  tag(root,"FAILURE_RECOVERY_STATE")
  parts.track.Visible=false
  parts.spinner.Visible=false
  root:SetAttribute("OwnsRetryAuthority",false)
  root:SetAttribute("OwnsRecoveryAuthority",false)
  root:SetAttribute("FailureCauseOwnedByGameCode",true)
  return root,parts
end

function Presentation.Audit()
  return table.freeze({
    version=2,packId="roblox-common-presentation-v1",
    loadingElements=table.freeze({"BRAND_BACKGROUND","LOGO","SPINNER","PROGRESS_BAR","TIP","STATUS_TEXT"}),
    introModes=MODES,
    genreBackgrounds=table.freeze({"SURVIVAL","RPG","DEFENSE","CASUAL","PUZZLE","HORROR","STRATEGY"}),
    gameSpecificVariationFields=table.freeze({"LOGO","COLOR","BACKGROUND","COPY","INTENSITY","DURATION"}),
    accessibilityElements=table.freeze({"INPUT_SKIP_HINT","ACCESSIBILITY_REDUCED_MOTION","FAILURE_RECOVERY_STATE"}),
    presentationComponentCount=14,
    cameraAuthority=false,gameplayAuthority=false,productionVerified=false
  })
end

return table.freeze(Presentation)
