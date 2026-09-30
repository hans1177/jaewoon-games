-- Original modular construction kit. Dimensions are project units, not Conan data.
local Catalog={Unit=8,WallHeight=6,SchemaVersion=1}
Catalog.Styles={
 sandstone={name="사막 석조",tier=1,wall={190,155,107},wood={101,66,43},roof={65,112,113},metal={111,80,46},cloth={178,70,44},detail="MASONRY",material="Sandstone"},
 woodland={name="숲 목조",tier=2,wall={145,116,82},wood={63,78,58},roof={48,76,72},metal={103,117,105},cloth={205,155,73},detail="TIMBER",material="WoodPlanks"},
 moonstone={name="달빛 고딕",tier=3,wall={81,90,109},wood={48,47,63},roof={61,50,85},metal={165,178,191},cloth={103,66,125},detail="GOTHIC",material="Slate"},
 frostholm={name="설원 산장",tier=2,wall={165,170,172},wood={83,65,57},roof={211,225,231},metal={90,130,156},cloth={74,110,146},detail="SNOW",material="Rock"},
 tideport={name="해적 항구",tier=2,wall={179,154,111},wood={84,118,117},roof={138,83,50},metal={149,113,69},cloth={226,210,157},detail="SAIL",material="WoodPlanks"},
 aether={name="마도공학",tier=3,wall={161,162,187},wood={64,66,97},roof={80,107,139},metal={178,145,79},cloth={86,160,176},detail="ARCANE",material="Marble"},
}
Catalog.StyleOrder={"sandstone","woodland","moonstone","frostholm","tideport","aether"}
Catalog.Pieces={};Catalog.Order={}
local function piece(id,name,category,shape,placement,w,h,d,cost,extra)
 local row={id=id,name=name,category=category,shape=shape,placement=placement,w=w,h=h,d=d,cost=cost,loss=0}
 for k,v in pairs(extra or {})do row[k]=v end
 Catalog.Pieces[id]=row;table.insert(Catalog.Order,id)
end
local stone={stone=12,wood=3};local wood={wood=8,fiber=2};local decor={wood=4,fiber=4}
piece("foundation","사각 기초","기초","slab","ground",8,1,8,stone,{tile=true,ground=true})
piece("triangle-foundation","삼각 기초","기초","triangle","ground",8,1,8*math.sqrt(3)/2,stone,{tile=true,triangle=true,ground=true})
piece("fence-foundation","울타리 기초","기초","slab","ground",8,1,1.2,stone,{wall=true,ground=true})
piece("pillar","기둥","기초","pillar","center",1,6,1,stone,{vertical=true,top=true})
piece("half-pillar","반높이 기둥","기초","pillar","center",1,3,1,stone,{vertical=true,top=true})
piece("beam","가로 보","기초","beam","walltop",8,.65,.65,wood,{top=true,loss=10})
piece("wall","벽","벽·문","wall","edge",8,6,.5,stone,{wall=true,top=true})
piece("doorframe","문틀","벽·문","doorframe","edge",8,6,.5,stone,{wall=true,top=true,doorSocket=true})
piece("window","창문 벽","벽·문","window","edge",8,6,.5,stone,{wall=true,top=true})
piece("half-wall","반높이 벽","벽·문","wall","edge",8,3,.5,stone,{wall=true,top=true})
piece("archway","아치 통로","벽·문","arch","edge",8,6,.7,stone,{wall=true,top=true})
piece("gable-left","왼쪽 박공","벽·문","gable-left","walltop",8,3,.5,stone,{wall=true})
piece("gable-right","오른쪽 박공","벽·문","gable-right","walltop",8,3,.5,stone,{wall=true})
piece("door","출입문","벽·문","door","door",3.2,4.8,.22,wood,{interaction="door"})
piece("double-door","양개문","벽·문","double-door","door",3.2,4.8,.22,wood,{interaction="door"})
piece("gateframe","대형 성문 틀","벽·문","gateframe","edge",8,12,.8,{stone=28,metal=8},{wall=true,top=true,doorSocket=true,gate=true})
piece("gate","대형 성문","벽·문","gate","door",5.8,9.5,.35,{wood=28,metal=12},{interaction="door",gate=true})
piece("floor","사각 바닥","바닥·계단","slab","tile",8,.4,8,wood,{tile=true,loss=20})
piece("triangle-floor","삼각 바닥","바닥·계단","triangle","tile",8,.4,8*math.sqrt(3)/2,wood,{tile=true,triangle=true,loss=20})
piece("hatch-floor","사다리 바닥","바닥·계단","hatch","tile",8,.4,8,wood,{tile=true,loss=20})
piece("stairs","실내 계단","바닥·계단","stairs","center",3.2,6,7.6,wood,{top=true,vertical=true})
piece("wide-stairs","넓은 계단","바닥·계단","stairs","center",6,6,7.6,wood,{top=true,vertical=true})
piece("ramp","경사로","바닥·계단","ramp","center",4,3,7.6,wood,{top=true,vertical=true})
piece("ladder","사다리","바닥·계단","ladder","center",2,6,.4,wood,{top=true,vertical=true})
piece("bridge","좁은 다리","바닥·계단","bridge","tile",8,.4,3,wood,{tile=true,loss=20})
piece("flat-roof","평지붕","지붕","slab","roof",8,.4,8,stone,{tile=true,loss=20})
piece("sloped-roof","경사 지붕","지붕","roof","roof",8,3,8,wood,{tile=true,loss=20})
piece("triangle-roof","삼각 지붕","지붕","triangle-roof","roof",8,3,8*math.sqrt(3)/2,wood,{tile=true,triangle=true,loss=20})
piece("roof-cap","용마루","지붕","ridge","center",8,1.2,1.2,wood)
piece("awning","차양","지붕","awning","walltop",8,1.8,4,decor,{loss=20})
piece("railing","난간","성벽·야외","railing","edge",8,2.4,.4,wood,{wall=true})
piece("palisade","목책","성벽·야외","palisade","edge",8,4,.5,wood,{wall=true})
piece("battlement","성가퀴","성벽·야외","battlement","edge",8,2.5,.65,stone,{wall=true})
piece("fence-gate","울타리 문틀","성벽·야외","doorframe","edge",8,6,.4,wood,{wall=true,top=true,doorSocket=true})
piece("bed","침대","가구","bed","surface",3,1.3,5,decor,{interaction="bed"})
piece("chair","의자","가구","chair","surface",1.8,3,1.8,wood)
piece("bench","긴 의자","가구","bench","surface",4,2.6,1.6,wood)
piece("table","식탁","가구","table","surface",4,2.4,2.4,wood)
piece("round-table","원형 탁자","가구","round-table","surface",3,2.4,3,wood)
piece("chest","보관 상자","가구","chest","surface",2.8,1.8,1.8,{wood=12,metal=2},{interaction="storage",capacity=200})
piece("wardrobe","옷장","가구","wardrobe","surface",3,5,1.8,wood,{interaction="storage",capacity=400})
piece("bookshelf","책장","가구","bookshelf","surface",3,5,1,wood)
piece("rug","직조 깔개","장식","rug","surface",4,.08,3,decor,{overlay=true})
piece("banner","가문 깃발","장식","banner","surface",1.8,5,.5,decor)
piece("lantern","등불","장식","lantern","surface",.7,1.4,.7,{metal=3,fiber=2})
piece("planter","화분","장식","planter","surface",1.7,2,1.7,decor)
piece("barrel","물통","장식","barrel","surface",1.6,2.2,1.6,wood)
piece("statue","수호상","장식","statue","surface",2,4.5,2,stone)
piece("fireplace","벽난로","제작·생활","fireplace","surface",3,4,1.5,stone,{interaction="station",station="cooking"})
piece("workbench","목공 작업대","제작·생활","workbench","surface",4,2.5,2.3,wood,{interaction="station",station="carpentry"})
piece("furnace","제련로","제작·생활","furnace","surface",2.7,3.5,2.7,stone,{interaction="station",station="smelting"})
piece("anvil","대장장이 모루","제작·생활","anvil","surface",2.5,2.5,1.5,{stone=4,metal=14},{interaction="station",station="smithing"})
piece("loom","직조기","제작·생활","loom","surface",3,3.8,1.8,{wood=10,fiber=8},{interaction="station",station="weaving"})
piece("cooking-pot","요리 솥","제작·생활","pot","surface",2,2,2,{stone=6,metal=4},{interaction="station",station="cooking"})
return Catalog
