--!strict
-- 파일명: roblox-games/daechung-rpg/shared/TechTreeData.luau
-- 메인: 5개 시대 72개 연구 / 유레카 50% 할인
export type TechConfig={TechID:number,Era:number,Name:string,RequiredResources:{[string]:number},EurekaCondition:string,EurekaMetric:string,EurekaTarget:number,Prerequisite:number}
local all:{[number]:TechConfig}={
[1]={TechID=1,Era=1,Name="신수의 불꽃",RequiredResources={CivMyth=3},EurekaCondition="CivParries 2 달성",EurekaMetric="CivParries",EurekaTarget=2,Prerequisite=0},
[2]={TechID=2,Era=1,Name="원시 채집",RequiredResources={CivMyth=4},EurekaCondition="CivBossKills 1 달성",EurekaMetric="CivBossKills",EurekaTarget=1,Prerequisite=1},
[3]={TechID=3,Era=1,Name="성스러운 불씨",RequiredResources={CivMyth=5},EurekaCondition="HouseLevel 1 달성",EurekaMetric="HouseLevel",EurekaTarget=1,Prerequisite=2},
[4]={TechID=4,Era=1,Name="원시 도구",RequiredResources={CivMyth=6},EurekaCondition="WeaponTier 2 달성",EurekaMetric="WeaponTier",EurekaTarget=2,Prerequisite=3},
[5]={TechID=5,Era=1,Name="가축 길들이기",RequiredResources={CivMyth=7},EurekaCondition="ArmorTier 2 달성",EurekaMetric="ArmorTier",EurekaTarget=2,Prerequisite=4},
[6]={TechID=6,Era=1,Name="영혼의 제단",RequiredResources={CivMyth=8},EurekaCondition="CivKills 6 달성",EurekaMetric="CivKills",EurekaTarget=6,Prerequisite=5},
[7]={TechID=7,Era=1,Name="룬 각인",RequiredResources={CivMyth=9},EurekaCondition="CivParries 2 달성",EurekaMetric="CivParries",EurekaTarget=2,Prerequisite=6},
[8]={TechID=8,Era=1,Name="드루이드 통찰",RequiredResources={CivMyth=10},EurekaCondition="CivBossKills 1 달성",EurekaMetric="CivBossKills",EurekaTarget=1,Prerequisite=7},
[9]={TechID=9,Era=1,Name="태양 신앙",RequiredResources={CivMyth=11},EurekaCondition="HouseLevel 1 달성",EurekaMetric="HouseLevel",EurekaTarget=1,Prerequisite=8},
[10]={TechID=10,Era=1,Name="조상 숭배",RequiredResources={CivMyth=12},EurekaCondition="WeaponTier 2 달성",EurekaMetric="WeaponTier",EurekaTarget=2,Prerequisite=9},
[11]={TechID=11,Era=1,Name="부족 협약",RequiredResources={CivMyth=13},EurekaCondition="ArmorTier 2 달성",EurekaMetric="ArmorTier",EurekaTarget=2,Prerequisite=10},
[12]={TechID=12,Era=1,Name="신비 약초학",RequiredResources={CivMyth=14},EurekaCondition="CivKills 11 달성",EurekaMetric="CivKills",EurekaTarget=11,Prerequisite=11},
[13]={TechID=13,Era=1,Name="성역 수호",RequiredResources={CivMyth=15},EurekaCondition="CivParries 2 달성",EurekaMetric="CivParries",EurekaTarget=2,Prerequisite=12},
[14]={TechID=14,Era=1,Name="신화의 문",RequiredResources={CivMyth=16},EurekaCondition="CivBossKills 1 달성",EurekaMetric="CivBossKills",EurekaTarget=1,Prerequisite=13},
[15]={TechID=15,Era=2,Name="뗀석기 제작",RequiredResources={CivStone=5},EurekaCondition="WeaponTier 2 달성",EurekaMetric="WeaponTier",EurekaTarget=2,Prerequisite=14},
[16]={TechID=16,Era=2,Name="흑요석 단검",RequiredResources={CivStone=6},EurekaCondition="ArmorTier 2 달성",EurekaMetric="ArmorTier",EurekaTarget=2,Prerequisite=15},
[17]={TechID=17,Era=2,Name="원시 가죽 가공",RequiredResources={CivStone=7},EurekaCondition="CivKills 16 달성",EurekaMetric="CivKills",EurekaTarget=16,Prerequisite=16},
[18]={TechID=18,Era=2,Name="모닥불",RequiredResources={CivStone=8},EurekaCondition="CivParries 3 달성",EurekaMetric="CivParries",EurekaTarget=3,Prerequisite=17},
[19]={TechID=19,Era=2,Name="석재 방벽",RequiredResources={CivStone=9},EurekaCondition="CivBossKills 1 달성",EurekaMetric="CivBossKills",EurekaTarget=1,Prerequisite=18},
[20]={TechID=20,Era=2,Name="수렵 활",RequiredResources={CivStone=10},EurekaCondition="HouseLevel 1 달성",EurekaMetric="HouseLevel",EurekaTarget=1,Prerequisite=19},
[21]={TechID=21,Era=2,Name="돌도끼 제작",RequiredResources={CivStone=11},EurekaCondition="WeaponTier 2 달성",EurekaMetric="WeaponTier",EurekaTarget=2,Prerequisite=20},
[22]={TechID=22,Era=2,Name="동굴 탐사",RequiredResources={CivStone=12},EurekaCondition="ArmorTier 2 달성",EurekaMetric="ArmorTier",EurekaTarget=2,Prerequisite=21},
[23]={TechID=23,Era=2,Name="석제 작업대",RequiredResources={CivStone=13},EurekaCondition="CivKills 21 달성",EurekaMetric="CivKills",EurekaTarget=21,Prerequisite=22},
[24]={TechID=24,Era=2,Name="지하수 저장",RequiredResources={CivStone=14},EurekaCondition="CivParries 4 달성",EurekaMetric="CivParries",EurekaTarget=4,Prerequisite=23},
[25]={TechID=25,Era=2,Name="가죽 갑옷",RequiredResources={CivStone=15},EurekaCondition="CivBossKills 1 달성",EurekaMetric="CivBossKills",EurekaTarget=1,Prerequisite=24},
[26]={TechID=26,Era=2,Name="부족 정찰",RequiredResources={CivStone=16},EurekaCondition="HouseLevel 1 달성",EurekaMetric="HouseLevel",EurekaTarget=1,Prerequisite=25},
[27]={TechID=27,Era=2,Name="돌기둥 건축",RequiredResources={CivStone=17},EurekaCondition="WeaponTier 2 달성",EurekaMetric="WeaponTier",EurekaTarget=2,Prerequisite=26},
[28]={TechID=28,Era=2,Name="정착촌 확장",RequiredResources={CivStone=18},EurekaCondition="ArmorTier 2 달성",EurekaMetric="ArmorTier",EurekaTarget=2,Prerequisite=27},
[29]={TechID=29,Era=3,Name="청동 용해",RequiredResources={CivBronze=7},EurekaCondition="CivParries 5 달성",EurekaMetric="CivParries",EurekaTarget=5,Prerequisite=28},
[30]={TechID=30,Era=3,Name="고조선 천부인",RequiredResources={CivBronze=8},EurekaCondition="CivBossKills 2 달성",EurekaMetric="CivBossKills",EurekaTarget=2,Prerequisite=29},
[31]={TechID=31,Era=3,Name="청동 검",RequiredResources={CivBronze=9},EurekaCondition="HouseLevel 1 달성",EurekaMetric="HouseLevel",EurekaTarget=1,Prerequisite=30},
[32]={TechID=32,Era=3,Name="청동 방패",RequiredResources={CivBronze=10},EurekaCondition="WeaponTier 2 달성",EurekaMetric="WeaponTier",EurekaTarget=2,Prerequisite=31},
[33]={TechID=33,Era=3,Name="주조 틀",RequiredResources={CivBronze=11},EurekaCondition="ArmorTier 2 달성",EurekaMetric="ArmorTier",EurekaTarget=2,Prerequisite=32},
[34]={TechID=34,Era=3,Name="구리 광산",RequiredResources={CivBronze=12},EurekaCondition="CivKills 31 달성",EurekaMetric="CivKills",EurekaTarget=31,Prerequisite=33},
[35]={TechID=35,Era=3,Name="주석 정련",RequiredResources={CivBronze=13},EurekaCondition="CivParries 7 달성",EurekaMetric="CivParries",EurekaTarget=7,Prerequisite=34},
[36]={TechID=36,Era=3,Name="청동 갑옷",RequiredResources={CivBronze=14},EurekaCondition="CivBossKills 2 달성",EurekaMetric="CivBossKills",EurekaTarget=2,Prerequisite=35},
[37]={TechID=37,Era=3,Name="랜드마크 기초",RequiredResources={CivBronze=15},EurekaCondition="HouseLevel 1 달성",EurekaMetric="HouseLevel",EurekaTarget=1,Prerequisite=36},
[38]={TechID=38,Era=3,Name="교역로",RequiredResources={CivBronze=16},EurekaCondition="WeaponTier 2 달성",EurekaMetric="WeaponTier",EurekaTarget=2,Prerequisite=37},
[39]={TechID=39,Era=3,Name="항해술",RequiredResources={CivBronze=17},EurekaCondition="ArmorTier 2 달성",EurekaMetric="ArmorTier",EurekaTarget=2,Prerequisite=38},
[40]={TechID=40,Era=3,Name="성문 강화",RequiredResources={CivBronze=18},EurekaCondition="CivKills 36 달성",EurekaMetric="CivKills",EurekaTarget=36,Prerequisite=39},
[41]={TechID=41,Era=3,Name="병기 정비",RequiredResources={CivBronze=19},EurekaCondition="CivParries 8 달성",EurekaMetric="CivParries",EurekaTarget=8,Prerequisite=40},
[42]={TechID=42,Era=3,Name="관개 농업",RequiredResources={CivBronze=20},EurekaCondition="CivBossKills 3 달성",EurekaMetric="CivBossKills",EurekaTarget=3,Prerequisite=41},
[43]={TechID=43,Era=3,Name="상형 기록",RequiredResources={CivBronze=21},EurekaCondition="HouseLevel 1 달성",EurekaMetric="HouseLevel",EurekaTarget=1,Prerequisite=42},
[44]={TechID=44,Era=3,Name="청동기 도시",RequiredResources={CivBronze=22},EurekaCondition="WeaponTier 2 달성",EurekaMetric="WeaponTier",EurekaTarget=2,Prerequisite=43},
[45]={TechID=45,Era=4,Name="제철 용광로",RequiredResources={CivIron=9},EurekaCondition="CivKills 41 달성",EurekaMetric="CivKills",EurekaTarget=41,Prerequisite=44},
[46]={TechID=46,Era=4,Name="강철 주조",RequiredResources={CivIron=10},EurekaCondition="CivParries 9 달성",EurekaMetric="CivParries",EurekaTarget=9,Prerequisite=45},
[47]={TechID=47,Era=4,Name="중장갑 기사 갑옷",RequiredResources={CivIron=11},EurekaCondition="CivBossKills 3 달성",EurekaMetric="CivBossKills",EurekaTarget=3,Prerequisite=46},
[48]={TechID=48,Era=4,Name="장검 단조",RequiredResources={CivIron=12},EurekaCondition="HouseLevel 2 달성",EurekaMetric="HouseLevel",EurekaTarget=2,Prerequisite=47},
[49]={TechID=49,Era=4,Name="철제 방패",RequiredResources={CivIron=13},EurekaCondition="WeaponTier 3 달성",EurekaMetric="WeaponTier",EurekaTarget=3,Prerequisite=48},
[50]={TechID=50,Era=4,Name="투석기",RequiredResources={CivIron=14},EurekaCondition="ArmorTier 3 달성",EurekaMetric="ArmorTier",EurekaTarget=3,Prerequisite=49},
[51]={TechID=51,Era=4,Name="수직 광산",RequiredResources={CivIron=15},EurekaCondition="CivKills 46 달성",EurekaMetric="CivKills",EurekaTarget=46,Prerequisite=50},
[52]={TechID=52,Era=4,Name="공성 무기",RequiredResources={CivIron=16},EurekaCondition="CivParries 10 달성",EurekaMetric="CivParries",EurekaTarget=10,Prerequisite=51},
[53]={TechID=53,Era=4,Name="항구 요새",RequiredResources={CivIron=17},EurekaCondition="CivBossKills 3 달성",EurekaMetric="CivBossKills",EurekaTarget=3,Prerequisite=52},
[54]={TechID=54,Era=4,Name="중장갑 기병",RequiredResources={CivIron=18},EurekaCondition="HouseLevel 2 달성",EurekaMetric="HouseLevel",EurekaTarget=2,Prerequisite=53},
[55]={TechID=55,Era=4,Name="철제 농기구",RequiredResources={CivIron=19},EurekaCondition="WeaponTier 3 달성",EurekaMetric="WeaponTier",EurekaTarget=3,Prerequisite=54},
[56]={TechID=56,Era=4,Name="대형 성벽",RequiredResources={CivIron=20},EurekaCondition="ArmorTier 3 달성",EurekaMetric="ArmorTier",EurekaTarget=3,Prerequisite=55},
[57]={TechID=57,Era=4,Name="철제 도구",RequiredResources={CivIron=21},EurekaCondition="CivKills 52 달성",EurekaMetric="CivKills",EurekaTarget=52,Prerequisite=56},
[58]={TechID=58,Era=4,Name="전술 훈련",RequiredResources={CivIron=22},EurekaCondition="CivParries 11 달성",EurekaMetric="CivParries",EurekaTarget=11,Prerequisite=57},
[59]={TechID=59,Era=4,Name="도시 연맹",RequiredResources={CivIron=23},EurekaCondition="CivBossKills 4 달성",EurekaMetric="CivBossKills",EurekaTarget=4,Prerequisite=58},
[60]={TechID=60,Era=4,Name="철기 제국",RequiredResources={CivIron=24},EurekaCondition="HouseLevel 2 달성",EurekaMetric="HouseLevel",EurekaTarget=2,Prerequisite=59},
[61]={TechID=61,Era=5,Name="영웅의 서약",RequiredResources={CivHero=11},EurekaCondition="ArmorTier 3 달성",EurekaMetric="ArmorTier",EurekaTarget=3,Prerequisite=60},
[62]={TechID=62,Era=5,Name="전설의 대장간",RequiredResources={CivHero=12},EurekaCondition="CivKills 56 달성",EurekaMetric="CivKills",EurekaTarget=56,Prerequisite=61},
[63]={TechID=63,Era=5,Name="신수의 갑주",RequiredResources={CivHero=13},EurekaCondition="CivParries 12 달성",EurekaMetric="CivParries",EurekaTarget=12,Prerequisite=62},
[64]={TechID=64,Era=5,Name="영웅 특수기",RequiredResources={CivHero=14},EurekaCondition="CivBossKills 4 달성",EurekaMetric="CivBossKills",EurekaTarget=4,Prerequisite=63},
[65]={TechID=65,Era=5,Name="문명 최종 랜드마크",RequiredResources={CivHero=15},EurekaCondition="HouseLevel 2 달성",EurekaMetric="HouseLevel",EurekaTarget=2,Prerequisite=64},
[66]={TechID=66,Era=5,Name="황금 가디언",RequiredResources={CivHero=16},EurekaCondition="WeaponTier 4 달성",EurekaMetric="WeaponTier",EurekaTarget=4,Prerequisite=65},
[67]={TechID=67,Era=5,Name="고대 유물 결합",RequiredResources={CivHero=17},EurekaCondition="ArmorTier 4 달성",EurekaMetric="ArmorTier",EurekaTarget=4,Prerequisite=66},
[68]={TechID=68,Era=5,Name="영웅의 항해",RequiredResources={CivHero=18},EurekaCondition="CivKills 62 달성",EurekaMetric="CivKills",EurekaTarget=62,Prerequisite=67},
[69]={TechID=69,Era=5,Name="무제한 원정 무역",RequiredResources={CivHero=19},EurekaCondition="CivParries 13 달성",EurekaMetric="CivParries",EurekaTarget=13,Prerequisite=68},
[70]={TechID=70,Era=5,Name="신성 방벽",RequiredResources={CivHero=20},EurekaCondition="CivBossKills 5 달성",EurekaMetric="CivBossKills",EurekaTarget=5,Prerequisite=69},
[71]={TechID=71,Era=5,Name="차원 공명",RequiredResources={CivHero=21},EurekaCondition="HouseLevel 2 달성",EurekaMetric="HouseLevel",EurekaTarget=2,Prerequisite=70},
[72]={TechID=72,Era=5,Name="멀티버스 포털",RequiredResources={CivHero=22},EurekaCondition="WeaponTier 4 달성",EurekaMetric="WeaponTier",EurekaTarget=4,Prerequisite=71},
}
local module={All=all,Count=72,EraNames={"신화 시대","석기 시대","청동기 시대","철기 시대","영웅 시대"},EraResources={"CivMyth","CivStone","CivBronze","CivIron","CivHero"}}
function module.EraForUnlocked(n:number):number
 if n<14 then return 1 elseif n<28 then return 2 elseif n<44 then return 3 elseif n<60 then return 4 end
 return 5
end
function module.GetTech(id:number):TechConfig?
 if typeof(id)~="number"or id%1~=0 then return nil end
 return all[id]
end
function module.Next(n:number):TechConfig? return all[n+1]end
return table.freeze(module)
