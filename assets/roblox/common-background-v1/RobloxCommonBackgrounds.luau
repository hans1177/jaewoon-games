-- 회사 공용 Roblox 배경/환경 표현 자산
-- UI/로딩/메뉴 배경과 3D 월드의 시각 프로필을 제공한다. 지형 충돌/게임플레이 권한은 소유하지 않는다.

local M={}

local THEMES=table.freeze({
  FOREST={sky={35,52,64},far={47,74,72},mid={38,68,58},near={24,47,39},accent={108,156,102},weather="MIST_LIGHT"},
  SNOW={sky={126,153,177},far={154,176,192},mid={112,139,158},near={74,97,116},accent={210,231,244},weather="SNOW_LIGHT"},
  DESERT={sky={157,114,83},far={173,120,72},mid={139,88,55},near={91,61,43},accent={232,188,112},weather="DUST_LIGHT"},
  SWAMP={sky={58,70,65},far={62,83,67},mid={47,72,55},near={30,49,40},accent={126,146,78},weather="FOG_LOW"},
  CAVE={sky={21,27,35},far={31,39,49},mid={38,47,57},near={18,24,31},accent={83,138,176},weather="DUST_MOTES"},
  COAST={sky={71,126,160},far={67,115,143},mid={54,92,111},near={38,63,73},accent={134,202,215},weather="SEA_HAZE"},
  VILLAGE={sky={89,116,133},far={89,101,96},mid={79,78,67},near={53,49,42},accent={189,145,85},weather="CALM"},
  CITY={sky={46,61,78},far={51,61,75},mid={43,49,62},near={28,32,40},accent={87,148,210},weather="URBAN_HAZE"},
  RUINS={sky={75,83,82},far={89,92,82},mid={72,74,65},near={47,49,44},accent={151,131,88},weather="DUST_MOTES"},
  DUNGEON={sky={24,28,34},far={34,39,47},mid={44,44,42},near={22,23,25},accent={176,106,58},weather="DUST_MOTES"},
  MAGICAL_FOREST={sky={52,53,92},far={63,72,99},mid={45,73,78},near={29,48,54},accent={114,190,184},weather="MAGIC_MOTES"},
  HORROR_INTERIOR={sky={28,31,34},far={34,37,40},mid={40,40,39},near={22,22,23},accent={145,64,58},weather="DUST_LOW"},
})

local function c(rgb)return Color3.fromRGB(rgb[1],rgb[2],rgb[3])end
local function corner(parent,px)local x=Instance.new("UICorner");x.CornerRadius=UDim.new(0,px or 10);x.Parent=parent;return x end
local function tag(root,id)
  root:SetAttribute("StudioAssetId",id)
  root:SetAttribute("StudioAssetPack","roblox-common-background-v1")
  root:SetAttribute("StudioAssetFamily","ENVIRONMENT")
  root:SetAttribute("CompanyCommonBase",true)
  root:SetAttribute("GameplayAuthority",false)
  root:SetAttribute("CollisionAuthority",false)
  root:SetAttribute("ProductionVerified",false)
  root:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
end

local function silhouette(parent,name,y,height,color,offset,seed)
  local layer=Instance.new("Frame")
  layer.Name=name
  layer.Position=UDim2.new(offset or 0,0,y,0)
  layer.Size=UDim2.new(1.08,0,height,0)
  layer.BackgroundColor3=color
  layer.BackgroundTransparency=0
  layer.BorderSizePixel=0
  layer.Parent=parent
  local grad=Instance.new("UIGradient")
  grad.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,0.08),
    NumberSequenceKeypoint.new(0.72,0),
    NumberSequenceKeypoint.new(1,0.18),
  })
  grad.Rotation=((seed or 0)%2==0) and 0 or 180
  grad.Parent=layer
  return layer
end

function M.CreateLayeredBackdrop(options)
  options=options or {}
  local themeId=string.upper(tostring(options.theme or "FOREST"))
  local t=THEMES[themeId] or THEMES.FOREST

  local root=Instance.new("Frame")
  root.Name=options.name or ("Backdrop_"..themeId)
  root.Size=options.size or UDim2.fromScale(1,1)
  root.BackgroundColor3=c(t.sky)
  root.BorderSizePixel=0
  root.ClipsDescendants=true
  tag(root,"BACKGROUND_"..themeId)

  local skyGrad=Instance.new("UIGradient")
  skyGrad.Color=ColorSequence.new({
    ColorSequenceKeypoint.new(0,c(t.sky)),
    ColorSequenceKeypoint.new(1,c(t.far)),
  })
  skyGrad.Rotation=90
  skyGrad.Parent=root

  local far=silhouette(root,"FarLayer",0.52,0.48,c(t.far),-0.03,1)
  local mid=silhouette(root,"MidLayer",0.64,0.40,c(t.mid),0.01,2)
  local near=silhouette(root,"NearLayer",0.76,0.32,c(t.near),-0.02,3)

  for i=1,6 do
    local mark=Instance.new("Frame")
    mark.Name="Detail"..i
    mark.AnchorPoint=Vector2.new(0.5,1)
    mark.Position=UDim2.fromScale(0.10+i*0.13,0.84-(i%2)*0.03)
    mark.Size=UDim2.fromScale(0.035+(i%3)*0.012,0.10+(i%2)*0.05)
    mark.BackgroundColor3=c(t.accent)
    mark.BackgroundTransparency=0.48+(i%3)*0.10
    mark.BorderSizePixel=0
    mark.Parent=near
    corner(mark,8)
  end

  root:SetAttribute("BackdropTheme",themeId)
  root:SetAttribute("DepthLayerCount",3)
  root:SetAttribute("WeatherRole",t.weather)
  root:SetAttribute("ThemeAdaptationRequiredPerGame",true)

  local controller={}
  function controller.SetParallax(x,y)
    local px=math.clamp(tonumber(x) or 0,-1,1)
    local py=math.clamp(tonumber(y) or 0,-1,1)
    far.Position=UDim2.new(-0.03+px*0.004,0,0.52+py*0.004,0)
    mid.Position=UDim2.new(0.01+px*0.008,0,0.64+py*0.006,0)
    near.Position=UDim2.new(-0.02+px*0.014,0,0.76+py*0.008,0)
  end
  return root,controller
end

function M.CreateWorldProfile(options)
  options=options or {}
  local themeId=string.upper(tostring(options.theme or "FOREST"))
  local t=THEMES[themeId] or THEMES.FOREST
  return table.freeze({
    version=1,
    theme=themeId,
    palette=table.freeze({
      sky=c(t.sky),far=c(t.far),mid=c(t.mid),near=c(t.near),accent=c(t.accent)
    }),
    depth=table.freeze({
      foreground="INTERACTIVE_AND_CONTACT_DETAIL",
      midground="ROUTES_BUILDINGS_LARGE_PROPS",
      background="LANDMARK_SKYLINE_AND_MASSING",
      atmosphericSeparation=true,
      silhouetteSeparation=true,
    }),
    density=table.freeze({
      foreground="CONTROLLED_HIGH",
      midground="FUNCTION_DRIVEN_MEDIUM",
      background="MASSING_NOT_CLUTTER",
      randomScatterForbidden=true,
    }),
    detailPasses=table.freeze({
      "MACRO_TERRAIN_AND_SKYLINE",
      "ROUTE_AND_LANDMARK",
      "STRUCTURAL_MIDGROUND",
      "VEGETATION_OR_ARCHITECTURE_CLUSTER",
      "FUNCTIONAL_PROP",
      "SURFACE_BREAKUP",
      "WEATHERING_AND_CONTACT",
      "AMBIENT_MOTION",
      "LIGHTING_FOCUS",
    }),
    weatherRole=t.weather,
    lighting=table.freeze({
      subjectBackgroundSeparation=true,
      landmarkFocus=true,
      localLightMotivation=true,
      flatUniformLightingForbidden=true,
    }),
    gameplayAuthority=false,
    collisionAuthority=false,
    navigationAuthority=false,
  })
end

function M.CreateMenuBackdrop(options)
  options=options or {}
  local root,controller=M.CreateLayeredBackdrop(options)
  tag(root,"MENU_BACKGROUND_"..string.upper(tostring(options.theme or "FOREST")))
  local shade=Instance.new("Frame")
  shade.Name="MenuReadabilityShade"
  shade.Size=UDim2.fromScale(1,1)
  shade.BackgroundColor3=Color3.fromRGB(4,7,11)
  shade.BackgroundTransparency=tonumber(options.shadeTransparency) or 0.42
  shade.BorderSizePixel=0
  shade.Parent=root
  local grad=Instance.new("UIGradient")
  grad.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,0.05),
    NumberSequenceKeypoint.new(0.45,0.45),
    NumberSequenceKeypoint.new(1,0.70),
  })
  grad.Rotation=0
  grad.Parent=shade
  return root,controller
end

function M.CreateLoadingBackdrop(options)
  options=options or {}
  local root,controller=M.CreateLayeredBackdrop(options)
  tag(root,"LOADING_BACKGROUND_"..string.upper(tostring(options.theme or "FOREST")))
  root:SetAttribute("SlowParallaxRecommended",true)
  return root,controller
end

function M.CreateIntroBackdrop(options)
  options=options or {}
  local root,controller=M.CreateLayeredBackdrop(options)
  tag(root,"INTRO_BACKGROUND_"..string.upper(tostring(options.theme or "FOREST")))
  root:SetAttribute("IntroRevealCompatible",true)
  return root,controller
end

function M.Audit()
  local ids={}
  for id in pairs(THEMES) do table.insert(ids,id) end
  table.sort(ids)
  return table.freeze({
    version=1,
    packId="roblox-common-background-v1",
    themeCount=#ids,
    themes=table.freeze(ids),
    depthLayerMinimum=3,
    gameplayAuthority=false,
    collisionAuthority=false,
    studioRequiredForInternalUse=false,
  })
end

return table.freeze(M)
