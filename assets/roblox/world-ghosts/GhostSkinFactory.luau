-- Original, deterministic cosmetic model construction. No AI, damage, save or publishing authority.
local Catalog=require(script.Parent:WaitForChild("GhostSkinCatalog"))
local Factory={}
local byId={}
for _,row in ipairs(Catalog)do byId[row.id]=row end
local groups={
 hair="LONG_HAIR,WET_HAIR,MANE,FLAME_HAIR,HAIR_ARMS",
 ears="FOX_EARS,CAT_EARS,DOG_EARS,BIG_EARS,ANTENNAE",
 horns="ONE_HORN,TWO_HORNS,ANTLERS,SHADOW_SPIKES,SHOULDER_SPIKES,DORSAL_SPINES,LIGHTNING_SPIKES,FROST_SHARDS,CREST",
 crown="CROWN,ICE_CROWN,FLAME_CROWN,FLOWER_CROWN,WOOD_CROWN,SKULL_CROWN,WEB_CROWN",
 hat="GAT,CAP,TALL_HAT,STRAW_HAT,RED_CAP,POINTED_HAT,HELMET,TURBAN,HEADSCARF,TOPKNOT,HEAD_KNOT,TRIANGLE_HEADBAND,HEADBAND,HEAD_DISH",
 wings="BAT_WINGS,FEATHER_WINGS,INSECT_WINGS,BASKET_WINGS",
 tails="ONE_TAIL,TWO_TAILS,THREE_TAILS,NINE_TAILS,WISP_TAIL,BROOM_TAIL",
 cloth="VEIL,CAPE,STRAW_CAPE,RIBBON,BLACK_RIBBON,SASH,TORN_HEM,FACE_CLOTH",
 face="SMOOTH_MASK,WHITE_MASK,HALF_MASK,PEEL_MASK,UPSIDE_MASK,LONG_NOSE,TINY_MOUTH,TONGUE,FANGS,TUSKS,IRON_TEETH,BELLY_MOUTH,ARM_EYES",
 hands="LONG_FINGERS,LONG_CLAWS,WEBBED,HOOK_FEET,HOOVES,IRON_BOOTS,REVERSED_FEET",
 anatomy="LONG_ARMS,SHORT_ARMS,STIFF_ARMS,FOUR_ARMS,ONE_ARM,ONE_LEG,LONG_LEGS,SPIDER_LEGS,BELLY",
 ribs="RIBS,IRON_PLATES,SCALES,TIGER_STRIPES,STONE_BLOCKS,LANTERN_RIBS,PAPER_RIBS,WHEEL_SPOKES",
 chain="CHAINS,CHAIN_HANDLE,NECK_RINGS,BEADS,BINDINGS,MEDALLION,LEAF_COLLAR,WAVE_COLLAR",
 props="LANTERN,KEYS,CLUB,SCROLL,FAN,SCISSORS,BELL,JADE_ORB,WRAPPED_BUNDLE,COIN_BAG,PIPE,CARRIED_HEAD,COMB,HOOK,CANDLE,BROOM,AXE,PUMPKIN,SWORD,BONE_BAG,HAIR_PIN,TALISMAN,UMBRELLA",
 aura="SMOKE,GLOW_ORB,FLOATING_BOOKS,MOSS,SHELL",
}
local featureGroup={}
for group,names in pairs(groups)do for name in string.gmatch(names,"[^,]+")do featureGroup[name]=group end end

local forms={
 SHROUD={.78,1.06},TALL={.78,1.42},SLENDER={.7,1.16},GIANT={1.55,1.62},STOCKY={1.35,.84},BEAST={1.12,.78},
 SERPENT={1.1,.8},LONG_NECK={.82,1.1},FLOATING_HEAD={1.1,1},WINGED={.94,1.1},ARACHNID={1.15,.8},
 UMBRELLA={1,1},LANTERN={1,1},RIBBON={1,1},WALL={1.5,1},SKELETON={.75,1.35},WHEEL={1,1},
 CRAWLER={1,.65},BOUND={.8,1.03},HUNCHED={1.2,.88},LONG_ARM={.84,1.15},SMALL={.8,.64},THIN_NECK={1,1},
 HALF_BODY={.75,1.1},HEADLESS={1.15,1.15},CENTAUR={1.08,1.12},OBJECT_SWARM={1,1},
}

function Factory.List()
 local result={}
 for _,row in ipairs(Catalog)do table.insert(result,{id=row.id,name=row.name,region=row.region,form=row.form,role=row.role})end
 return result
end

function Factory.Describe(id,quality)
 local row=assert(byId[id],"UNKNOWN_GHOST_SKIN: "..tostring(id))
 local level=({far=1,mid=2,near=3})[quality or "mid"]
 assert(level,"INVALID_SKIN_QUALITY")
 local profile=assert(forms[row.form],"UNSUPPORTED_BODY_FORM")
 local features={};for _,feature in ipairs(row.features)do assert(featureGroup[feature],"UNSUPPORTED_FEATURE: "..feature);features[feature]=true end
 local w=profile[1];local h=profile[2]
 local headY=row.form=="LONG_NECK" and 8 or row.form=="CRAWLER" and 2.3 or row.form=="BEAST" and 3.7 or row.form=="FLOATING_HEAD" and 4.8 or 5.4
 local headZ=(row.form=="BEAST" or row.form=="CRAWLER") and -1.6 or 0
 local out={id=id,name=row.name,region=row.region,form=row.form,parts={},bones={},features=table.clone(row.features),quality=quality or "mid"}
 local palette={skin={142,151,148},cloth={53,61,71},dark={24,27,32},trim={164,136,92},eye={164,213,193},bone={194,184,151}}
 if row.outfit=="HANBOK" or row.outfit=="KIMONO" or row.outfit=="DRESS" then palette.cloth={184,180,162};palette.trim={112,47,53}end
 if row.outfit=="FUR" then palette.skin={91,83,74};palette.cloth={70,66,61}end
 if row.outfit=="WOOD" then palette.skin={102,78,55};palette.cloth={62,75,49}end
 if row.outfit=="OIL" then palette.skin={31,35,39};palette.cloth={22,25,30}end
 if features.FROST_SHARDS then palette.skin={170,204,209};palette.eye={160,234,255}end
 if features.FLAME_CROWN or features.FLAME_HAIR then palette.eye={235,130,57}end
 if features.WHITE_MASK then palette.skin={214,209,194}end
 out.palette=palette
 local function add(name,size,pos,shape,color,bone,rotation,minLevel)
  if level<(minLevel or 1)then return end
  rotation=rotation or {0,0,0}
  if shape=="Cylinder" and size[2]>size[1] and size[2]>size[3] then
   size={size[2],size[1],size[3]};rotation={rotation[1],rotation[2],rotation[3]+90}
  end
  table.insert(out.parts,{name=name,size={size[1]*w,size[2]*h,size[3]*w},position={pos[1]*w,pos[2]*h,pos[3]*w},shape=shape or "Block",color=color or "skin",bone=bone or "Torso",rotation=rotation or {0,0,0}})
 end
 local function bone(name,parent,x,y,z)
  out.bones[name]={parent=parent,position={x*w,y*h,z*w}}
 end
 bone("Root",nil,0,0,0);bone("Torso","Root",0,3,0);bone("Head","Torso",0,headY,headZ)
 bone("LeftArm","Torso",-1.4,4,0);bone("RightArm","Torso",1.4,4,0)
 bone("LeftLeg","Root",-.55,2,0);bone("RightLeg","Root",.55,2,0);bone("Tail","Torso",0,2,1)
 local function eye(name,x,y,z,scale,boneName)
  add(name.."Socket",{scale*1.4,scale,.12},{x,y,z},"Ball","dark",boneName)
  add(name.."Pupil",{scale*.4,scale*.7,.08},{x,y,z-.08},"Ball","eye",boneName)
  add(name.."Glint",{scale*.16,scale*.16,.05},{x-scale*.08,y+scale*.15,z-.13},"Ball","bone",boneName,nil,3)
 end
 local function limb(name,x,y,z,length,rotation)
  add(name,{.45,length,.55},{x,y,z},"Ball","skin",name:find("Leg") and (x<0 and "LeftLeg" or "RightLeg") or (x<0 and "LeftArm" or "RightArm"),rotation)
 end
 local noBody=row.form=="FLOATING_HEAD" or row.form=="RIBBON" or row.form=="UMBRELLA" or row.form=="LANTERN" or row.form=="WALL" or row.form=="WHEEL" or row.form=="OBJECT_SWARM"
 local noLegs=row.form=="SHROUD" or row.form=="SERPENT" or row.form=="ARACHNID" or row.form=="BOUND" or row.form=="BEAST" or row.form=="CENTAUR" or noBody
 if not noBody then
  local torsoSize=row.form=="SKELETON" and {.35,2,.5} or row.form=="BEAST" and {1.8,1.6,3.1} or {1.8,2.2,.95}
  add("TorsoCore",torsoSize,{0,3.4,0},"Ball",row.form=="SKELETON" and "bone" or "skin")
  if row.form=="HUNCHED" then add("BentBack",{2,1.5,1.6},{0,4,.6},"Ball","skin")end
  if not noLegs then
   for _,side in ipairs({-1,1})do
    if not(features.ONE_LEG and side==1)then
     limb(side<0 and "LeftLeg" or "RightLeg",side*.57,1.35,.05,features.LONG_LEGS and 3.1 or 2.3)
     add("Foot"..side,{.65,.35,1.1},{side*.57,.24,features.REVERSED_FEET and .32 or -.3},"Block","dark",side<0 and "LeftLeg" or "RightLeg")
    end
   end
  end
  if row.form~="BEAST" and row.form~="SERPENT" and row.form~="ARACHNID" then
   for _,side in ipairs({-1,1})do
    if not(features.ONE_ARM and side==1)then
     local length=(features.LONG_ARMS or row.form=="LONG_ARM")and 3.5 or features.SHORT_ARMS and 1.1 or 2.3
     local angle=features.STIFF_ARMS and 75 or row.form=="CRAWLER" and 58 or -side*12
     limb(side<0 and "LeftArm" or "RightArm",side*1.3,3,features.STIFF_ARMS and -.8 or 0,length,{angle,0,side*8})
    end
   end
  end
 end
 if row.form=="BEAST" or row.form=="CENTAUR" then
  if row.form=="CENTAUR" then add("HorseBody",{2.2,1.6,3.8},{0,2.8,1.3},"Ball","skin")end
  for _,x in ipairs({-1,1})do for _,z in ipairs({-.9,1.2})do limb("HindLeg"..x..z,x*.8,1.6,z,2.2,{12,0,x*6})end end
 end
 if row.form=="SERPENT" or row.form=="RIBBON" then
  for i=0,6 do local size=1.5-i*.16;add("Coil"..i,{size,row.form=="RIBBON" and .13 or size,1.2},{math.sin(i*.72)*1.25,1+i*.56,math.cos(i*.72)*1.2},"Ball","skin","Tail",{0,i*34,i*8})end
 end
 if row.form=="SHROUD" or row.form=="BOUND" then
  for i=0,4 do add("FloatingHem"..i,{.55,2.6-i*.12,.35},{(i-2)*.43,1.4,.2},"Wedge","cloth","Torso",{8,0,(i-2)*9})end
 end
 if row.form=="ARACHNID" then
  add("Abdomen",{2.8,1.8,3.2},{0,2,1.2},"Ball","cloth")
  for _,side in ipairs({-1,1})do for i=1,4 do
   add("SpiderUpper"..side..i,{2,.22,.22},{side*1.8,2.1,(i-2.5)*.7},"Cylinder","dark","Torso",{0,(i-2.5)*22,side*20})
   add("SpiderLower"..side..i,{.2,2.1,.2},{side*2.65,1.15,(i-2.5)*1.1},"Cylinder","dark","Torso",{0,0,-side*24})
  end end
 end
 if row.form=="UMBRELLA" then
  for i=0,7 do local a=i*math.pi/4;add("UmbrellaPanel"..i,{1.6,.35,2.3},{math.cos(a)*.9,4.6,math.sin(a)*.9},"Wedge","cloth","Torso",{0,-i*45,18})end
  add("UmbrellaShaft",{.22,3.8,.22},{0,2.6,0},"Cylinder","trim")
  if features.ONE_LEG then limb("LeftLeg",0,.85,0,1.5);add("Sandal",{.75,.22,1.25},{0,.2,-.3},"Block","trim","LeftLeg")end
 elseif row.form=="LANTERN" then add("LanternBody",{3.2,3.4,2.4},{0,3,0},"Ball","cloth")
 elseif row.form=="WALL" then
  for x=-1,1 do for y=0,2 do add("WallBlock"..x..y,{1.55,1.5,.9},{x*1.58,1+y*1.52,0},"Block","cloth")end end
  if features.SHORT_ARMS then for _,side in ipairs({-1,1})do limb(side<0 and "LeftArm" or "RightArm",side*2.6,2.8,0,.9,{0,0,side*40})end end
 elseif row.form=="WHEEL" then
  for i=0,11 do local a=i*math.pi/6;add("WheelRim"..i,{.35,1.15,.65},{math.sin(a)*2.1,3+math.cos(a)*2.1,0},"Block","trim","Torso",{0,0,-i*30})end
 elseif row.form=="OBJECT_SWARM" then
  for i=0,6 do local a=i*math.pi*2/7;add("FloatingBook"..i,{1.3,.8,.24},{math.sin(a)*2,3+math.cos(a)*1.7,math.sin(a*2)*.6},"Block","cloth","Torso",{i*13,i*29,i*17})end
 end
 local faceY=(row.form=="LANTERN" or row.form=="WHEEL" or row.form=="WALL") and 3.5 or row.form=="UMBRELLA" and 4.55 or headY
 local faceZ=row.form=="LANTERN" and -1.22 or row.form=="UMBRELLA" and -1.4 or headZ-.59
 if row.form~="HEADLESS" then
  if not noBody or row.form=="FLOATING_HEAD" then add("HeadShell",{1.25,1.5,1.12},{0,headY,headZ},"Ball","skin","Head")end
  if row.form=="LONG_NECK" or row.form=="THIN_NECK" then add("ElongatedNeck",{.3,headY-4,.35},{0,(headY+4)/2,0},"Cylinder","skin","Head")end
  if row.face~="FACELESS" then
   if row.face=="SINGLE_EYE" then eye("Eye",0,faceY+.12,faceZ,.5,"Head")
   else for _,side in ipairs({-1,1})do eye("Eye"..side,side*.28,faceY+.16,faceZ,.3,"Head")end end
   if row.face=="MANY_EYES" then for i=0,3 do eye("ExtraEye"..i,(i%2-.5)*.65,faceY-.3+math.floor(i/2)*.65,faceZ,.18,"Head")end end
   add("Mouth",{features.TINY_MOUTH and .17 or row.face=="SPLIT" and 1.22 or .6,features.TINY_MOUTH and .12 or row.face=="GRIN" and .13 or .32,.09},{0,faceY-.38,faceZ-.02},"Ball","dark","Head")
   if row.face=="WEEPING" then for _,side in ipairs({-1,1})do add("Tear"..side,{.08,.52,.06},{side*.28,faceY-.2,faceZ-.12},"Block","dark","Head")end end
   if row.face=="SKULL" or row.face=="FANGED" or row.face=="SPLIT" then for i=0,3 do add("Tooth"..i,{.1,.2,.1},{(i-1.5)*.18,faceY-.38,faceZ-.1},"Wedge","bone","Head",nil,2)end end
   if row.face=="HORSE" or row.face=="FOX" or row.face=="BULL" or row.face=="BEAK" then
    add("Muzzle",{row.face=="HORSE" and .85 or .65,.62,.9},{0,faceY-.2,faceZ-.25},row.face=="BEAK" and "Wedge" or "Ball","skin","Head")
   end
   if row.face=="LONG_NOSE" then add("LongNose",{.22,.25,.9},{0,faceY,faceZ-.3},"Wedge","trim","Head")end
   if row.face=="CRACKED" then for i=0,2 do add("FaceCrack"..i,{.07,.46,.07},{.16+i*.09,faceY+.35-i*.3,faceZ-.1},"Block","dark","Head",{0,0,i%2==0 and 20 or -20},2)end end
   if row.face=="HALF_MASK" or row.face=="HUMAN_MASK" then add("PorcelainMask",{row.face=="HALF_MASK" and .55 or 1,.95,.14},{-.24,faceY,faceZ-.12},"Ball","bone","Head",{0,0,-8})end
   if row.face=="BACK_MOUTH" then add("BackMouth",{.85,.72,.12},{0,headY,headZ+.6},"Ball","dark","Head")end
  end
 end
 if not noBody and row.outfit~="NONE" and row.outfit~="FUR" and row.outfit~="SCALES" then
  add("OuterGarment",{1.96,2.1,1.03},{0,3.45,.04},"Block","cloth")
  add("CollarLeft",{.28,1.4,.09},{-.35,3.95,-.53},"Block","trim","Torso",{0,0,-24})
  add("CollarRight",{.28,1.4,.09},{.35,3.95,-.53},"Block","trim","Torso",{0,0,24})
  if row.outfit=="KIMONO" or row.outfit=="HANBOK" or row.outfit=="ROBE" or row.outfit=="DRESS" then
   for _,side in ipairs({-1,1})do add("Sleeve"..side,{.86,1.1,.94},{side*1.35,3.8,.07},"Block","cloth",side<0 and "LeftArm" or "RightArm",{0,0,side*9})end
   add("WaistBand",{2.03,.27,1.13},{0,2.75,.05},"Block","trim")
  end
 end

 for featureIndex,feature in ipairs(row.features)do
  local group=featureGroup[feature]
  local prefix=feature.."_"
  local function deco(name,size,pos,shape,color,boneName,rotation,minLevel)add(prefix..name,size,pos,shape,color,boneName,rotation,minLevel)end
  if group=="hair" then
   local count=level==1 and 3 or 6
   for i=0,count-1 do
    local wet=feature=="WET_HAIR";local x=(i-(count-1)/2)*(wet and .19 or .24)
    local length=feature=="MANE" and 1.5 or feature=="HAIR_ARMS" and 3.6 or wet and (2.9+(i%3)*.35) or 2.9
    deco("Strand"..i,{wet and .2 or .28,length,wet and .16 or .22},{x,headY-length*.33,headZ+.4},"Wedge",feature=="FLAME_HAIR" and "eye" or "dark","Head",{wet and 0 or i%2*10,0,wet and (i%2*4-2) or (i-(count-1)/2)*8})
    if wet then deco("Drop"..i,{.12,.22,.12},{x,headY-length*.85-.3,headZ+.42},"Ball","eye","Head",nil,2)end
   end
  elseif group=="ears" then
   for _,side in ipairs({-1,1})do deco("Ear"..side,{feature=="BIG_EARS" and .8 or .45,feature=="ANTENNAE" and 1.5 or .85,.3},{side*.66,headY+.66,headZ},"Wedge","skin","Head",{0,0,-side*18})end
  elseif group=="horns" or group=="crown" then
   local count=feature=="ONE_HORN" and 1 or feature=="TWO_HORNS" and 2 or (level==1 and 3 or 5)
   for i=1,count do local x=(i-(count+1)/2)*.36;local y=feature=="DORSAL_SPINES" and 2+i*.4 or headY+.95
    deco("Point"..i,{.28,.7+(i%2)*.3,.35},{x,y,feature=="DORSAL_SPINES" and .78 or headZ},"Wedge",group=="crown" and "trim" or "bone",feature=="DORSAL_SPINES" and "Torso" or "Head",{0,0,-x*30})
    if feature=="ANTLERS" or feature=="WOOD_CROWN" then deco("Fork"..i,{.14,.6,.18},{x+.2,y+.2,headZ},"Cylinder","trim","Head",{0,0,-45},2)end
   end
  elseif group=="hat" then
   local tall=feature=="TALL_HAT" and 1.5 or feature=="GAT" and .75 or .4
   -- Roblox cylinders run along local X; store the axial thickness before rotating upright.
   deco("Top",feature=="POINTED_HAT" and {1.35,1.5,1.35} or {tall,1.35,1.35},{0,headY+.8+tall/2,headZ},feature=="POINTED_HAT" and "Wedge" or "Cylinder","cloth","Head",{0,0,feature=="POINTED_HAT" and 0 or 90})
   if feature=="GAT" or feature=="STRAW_HAT" or feature=="RED_CAP" then deco("Brim",{.12,2.3,2},{0,headY+.8,headZ},"Cylinder","trim","Head",{0,0,90})end
   if feature=="HEAD_DISH" then deco("DishWater",{.08,.8,.8},{0,headY+1.1,headZ},"Cylinder","eye","Head",{0,0,90})end
  elseif group=="wings" then
   for _,side in ipairs({-1,1})do for i=0,(level==1 and 1 or 3)do
    deco("Wing"..side..i,{.7,3.7-i*.46,.16},{side*(1.7+i*.5),3.7-i*.28,.4},feature=="INSECT_WINGS" and "Ball" or "Wedge",feature=="BASKET_WINGS" and "trim" or "dark","Torso",{8,side*18,-side*(48+i*12)})
   end end
  elseif group=="tails" then
   local count=feature=="NINE_TAILS" and 9 or feature=="THREE_TAILS" and 3 or feature=="TWO_TAILS" and 2 or 1
   for i=1,count do local angle=(i-(count+1)/2)*16
    deco("Tail"..i,{.42,2.8,.54},{math.sin(math.rad(angle))*2,1.3,.9+math.cos(math.rad(angle))},feature=="WISP_TAIL" and "Wedge" or "Ball",feature=="WISP_TAIL" and "eye" or "skin","Tail",{55,angle,angle})
   end
  elseif group=="cloth" then
   local head=feature=="VEIL" or feature=="FACE_CLOTH"
   local count=(feature=="RIBBON" or feature=="BLACK_RIBBON") and 2 or 4
   for i=1,count do deco("Fold"..i,{.44,head and 2.1 or 2.8,.12},{(i-(count+1)/2)*.38,head and headY-.15 or 2.5,head and headZ-.7 or .62},"Wedge","cloth",head and "Head" or "Torso",{head and 0 or 12,0,(i-(count+1)/2)*6})end
  elseif group=="face" then
   if feature=="ARM_EYES" then for _,side in ipairs({-1,1})do for i=0,2 do eye(prefix..side..i,side*1.35,2.3+i*.55,-.34,.18,side<0 and "LeftArm" or "RightArm")end end
   elseif feature=="BELLY_MOUTH" then deco("Mouth",{1.05,.9,.13},{0,3.2,-.6},"Ball","dark")
   elseif feature=="TONGUE" then deco("Tongue",{.3,1.3,.16},{0,faceY-.9,faceZ-.25},"Ball","trim","Head",{-18,0,0})
   elseif feature=="FANGS" or feature=="TUSKS" or feature=="IRON_TEETH" then for _,side in ipairs({-1,1})do deco("Fang"..side,{.18,feature=="TUSKS" and .9 or .35,.2},{side*.37,faceY-.4,faceZ-.2},"Wedge","bone","Head",{0,0,side*14})end
   elseif feature=="LONG_NOSE" then deco("Nose",{.24,.28,1.1},{0,faceY,faceZ-.35},"Wedge","skin","Head")
   elseif feature=="TINY_MOUTH" then -- Mouth dimensions are applied above, without an opaque mask.
   else deco("Mask",{feature=="HALF_MASK" and .58 or 1.15,feature=="FACE_CLOTH" and .4 or 1.1,.13},{feature=="HALF_MASK" and -.3 or 0,faceY,faceZ-.17},"Ball","bone","Head",{0,feature=="PEEL_MASK" and 35 or 0,feature=="UPSIDE_MASK" and 180 or 0})end
  elseif group=="hands" then
   for _,side in ipairs({-1,1})do local foot=feature=="HOOVES" or feature=="IRON_BOOTS" or feature=="HOOK_FEET" or feature=="REVERSED_FEET"
    local count=(feature=="LONG_FINGERS" or feature=="LONG_CLAWS") and 3 or 1
    for i=1,count do deco("Tip"..side..i,{count>1 and .09 or .72,count>1 and .7 or .48,.3},{side*(foot and .58 or 1.4)+(i-(count+1)/2)*.16,foot and .3 or 1.55,foot and -.3 or -.1},feature=="LONG_CLAWS" and "Wedge" or "Block","bone",side<0 and (foot and "LeftLeg" or "LeftArm") or (foot and "RightLeg" or "RightArm"),{0,0,side*8})end
   end
  elseif group=="anatomy" then
   if feature=="FOUR_ARMS" then for _,side in ipairs({-1,1})do deco("ExtraArm"..side,{.48,2.5,.55},{side*1.9,2.6,.35},"Ball","skin",side<0 and "LeftArm" or "RightArm",{0,0,side*38})end
   elseif feature=="BELLY" then deco("Belly",{1.75,1.45,1.35},{0,2.9,-.35},"Ball","skin")end
  elseif group=="ribs" then
   if feature=="WHEEL_SPOKES" then
    for i=0,7 do local angle=i*math.pi/4;deco("Spoke"..i,{.14,1.7,.16},{math.sin(angle)*1.1,3+math.cos(angle)*1.1,.05},"Block","trim","Torso",{0,0,-i*45})end
   elseif feature=="PAPER_RIBS" then
    for i=0,7 do local a=i*math.pi/4;deco("Rib"..i,{.09,.1,2.3},{math.cos(a)*.9,4.82,math.sin(a)*.9},"Block","trim","Torso",{0,-i*45,0})end
   elseif feature=="LANTERN_RIBS" then
    for i=0,5 do local a=i*math.pi/3;deco("Rib"..i,{.1,2.8,.1},{math.sin(a)*1.35,3,math.cos(a)},"Block","trim")end
   else
   for i=1,(level==1 and 2 or 4)do
    local stone=feature=="STONE_BLOCKS";local paper=feature=="PAPER_RIBS" or feature=="LANTERN_RIBS"
    deco("Band"..i,{stone and .8 or 1.6,paper and .08 or .16,.18},{0,2.3+i*.4,-.57},"Block",feature=="TIGER_STRIPES" and "dark" or "bone","Torso",{0,0,(i%2==0 and 6 or -6)})
   end
   end
  elseif group=="chain" then
   for i=1,(level==1 and 3 or 6)do local angle=i*math.pi/5
    deco("Link"..i,{.18,.25,.15},{math.cos(angle)*.9,3.6-math.sin(angle)*.65,-.6},feature=="BEADS" and "Ball" or "Block","trim","Torso",{0,0,i*18})
   end
  elseif group=="props" then
   local left=featureIndex%2==0;local x=left and -1.65 or 1.65;local b=left and "LeftArm" or "RightArm"
   if feature=="UMBRELLA" then
    deco("Shaft",{.12,3.6,.12},{x,3.6,0},"Block","trim",b)
    for i=0,5 do local a=i*math.pi/3;deco("Canopy"..i,{.85,.18,1.2},{x+math.sin(a)*.5,5.3,math.cos(a)*.5},"Wedge","cloth",b,{0,-i*60,12})end
   elseif feature=="CLUB" or feature=="BROOM" or feature=="SWORD" or feature=="AXE" or feature=="HOOK" then
    deco("Handle",{.2,2.5,.2},{x,2.1,-.2},"Cylinder","trim",b)
    deco("Head",{feature=="AXE" and 1.1 or .6,feature=="SWORD" and 2.1 or .8,.26},{x,3.25,-.2},feature=="SWORD" and "Wedge" or "Block","bone",b)
   elseif feature=="LANTERN" or feature=="CANDLE" or feature=="JADE_ORB" then
    deco("Body",{.7,feature=="CANDLE" and 1.4 or .8,.7},{x,2.7,-.3},feature=="JADE_ORB" and "Ball" or "Block","trim",b)
    deco("Glow",{.34,.4,.36},{x,3.2,-.3},"Ball","eye",b)
   elseif feature=="FAN" then
    for i=0,3 do deco("FanLeaf"..i,{.28,1.2,.1},{x+(i-1.5)*.2,3.1,-.3},"Wedge","cloth",b,{0,0,(i-1.5)*19})end
   elseif feature=="CARRIED_HEAD" or feature=="PUMPKIN" then
    deco("Head",{1.15,1.3,1.1},{x,2.4,-.35},"Ball",feature=="PUMPKIN" and "trim" or "skin",b);eye(prefix.."Eye",x,2.55,-.94,.35,b)
   elseif feature=="SCISSORS" then
    for _,side in ipairs({-1,1})do deco("Blade"..side,{.13,1.5,.12},{x,2.7,-.3},"Wedge","bone",b,{0,0,side*22})end
   else
    local flat=feature=="SCROLL" or feature=="TALISMAN" or feature=="KEYS" or feature=="COMB" or feature=="HAIR_PIN"
    deco("Object",{flat and .62 or .95,flat and 1.2 or .85,flat and .12 or .65},{feature=="TALISMAN" and 0 or x,feature=="TALISMAN" and headY-.1 or 2.7,feature=="TALISMAN" and faceZ-.22 or -.3},flat and "Block" or "Ball","trim",feature=="TALISMAN" and "Head" or b)
    deco("Binding",{.12,.65,.1},{x,2.7,-.68},"Block","dark",b,nil,2)
   end
  elseif group=="aura" then
   if feature=="SHELL" then deco("Shell",{2.3,2.5,.85},{0,3.25,.85},"Ball","trim")
   else for i=0,(level==1 and 1 or 3)do local a=i*math.pi/2;deco("Orbit"..i,{.42,.6,.35},{math.sin(a)*1.6,2+i*.7,math.cos(a)*.9},feature=="FLOATING_BOOKS" and "Block" or "Ball",feature=="MOSS" and "cloth" or "eye","Torso",{i*12,i*20,0},1)end end
  end
 end
 assert(#out.parts<=180,"GHOST_SKIN_PART_BUDGET_EXCEEDED: "..id)
 return out
end

function Factory.Create(id,options)
 options=options or {}
 local data=Factory.Describe(id,options.quality)
 local model=Instance.new("Model");model.Name="GhostSkin_"..id
 model:SetAttribute("AssetId",id);model:SetAttribute("DisplayName",data.name);model:SetAttribute("BodyForm",data.form)
 model:SetAttribute("ProductionVerified",false);model:SetAttribute("CosmeticSkinOnly",true)
 local bones={}
 for name,spec in pairs(data.bones)do
  local p=Instance.new("Part");p.Name="Skin"..name;p.Size=Vector3.new(.2,.2,.2);p.Transparency=1
  p.Anchored=name=="Root" and options.anchored~=false;p.CanCollide=false;p.CanTouch=false;p.CanQuery=false;p.Massless=true
  p.CFrame=CFrame.new(table.unpack(spec.position));p.Parent=model;bones[name]=p
 end
 for name,spec in pairs(data.bones)do if spec.parent then
  local joint=Instance.new("Motor6D");joint.Name=name.."Joint";joint.Part0=bones[spec.parent];joint.Part1=bones[name]
  joint.C0=bones[spec.parent].CFrame:ToObjectSpace(bones[name].CFrame);joint.C1=CFrame.new();joint.Parent=bones[spec.parent]
 end end
 for _,spec in ipairs(data.parts)do
  local p=Instance.new(spec.shape=="Wedge" and "WedgePart" or "Part");p.Name=spec.name
  if spec.shape=="Ball" then p.Shape=Enum.PartType.Ball elseif spec.shape=="Cylinder" then p.Shape=Enum.PartType.Cylinder end
  p.Size=Vector3.new(table.unpack(spec.size));p.CFrame=CFrame.new(table.unpack(spec.position))*CFrame.Angles(math.rad(spec.rotation[1]),math.rad(spec.rotation[2]),math.rad(spec.rotation[3]))
  p.Color=Color3.fromRGB(table.unpack(data.palette[spec.color]));p.Material=spec.color=="eye" and Enum.Material.Neon or Enum.Material.SmoothPlastic
  p.CanCollide=false;p.CanTouch=false;p.CanQuery=false;p.Massless=true;p.CastShadow=spec.color~="eye";p.Parent=model
  local weld=Instance.new("WeldConstraint");weld.Part0=bones[spec.bone];weld.Part1=p;weld.Parent=p
 end
 local controller=Instance.new("AnimationController");controller.Name="SkinAnimationController";controller.Parent=model
 Instance.new("Animator",controller)
 model.PrimaryPart=bones.Root
 model:PivotTo(options.pivot or CFrame.new())
 model.Parent=options.parent
 return model
end

function Factory.CreateGallery(parent,page,quality)
 page=page or 1;assert(page%1==0 and page>=1 and page<=13,"INVALID_GALLERY_PAGE")
 local folder=Instance.new("Folder");folder.Name="WorldGhostSkins_Page"..page
 -- Eight models per page protects the single Studio host from a 100-model burst.
 for index=(page-1)*8+1,math.min(page*8,#Catalog)do
  local slot=(index-1)%8
  Factory.Create(Catalog[index].id,{quality=quality or "mid",parent=folder,pivot=CFrame.new((slot%4)*14,0,math.floor(slot/4)*16)})
 end
 folder.Parent=parent;return folder
end

return Factory
