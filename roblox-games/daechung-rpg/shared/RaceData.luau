--!strict
-- 파일명: roblox-games/daechung-rpg/shared/RaceData.luau
-- 메인: 24개 문명 원장
export type RaceConfig={ID:number,Name:string,Landmark:string,Visual:string,Passive:string,Mobs:string,Resources:string,Biome:string,Bonuses:{[string]:number}}
local all:{[number]:RaceConfig}={
[1]={ID=1,Name="로마",Landmark="콜로세움",Visual="로마 투구·붉은 망토",Passive="방어 15%·패링 0.05초",Mobs="글래디에이터·검투 늑대",Resources="대리석·로마 철",Biome="지중해 석조 도시",Bonuses={Defense=.15,ParryWindow=.05}},
[2]={ID=2,Name="이집트",Landmark="기자 피라미드",Visual="네메스·금 장신구",Passive="사막 내열 50%·무역 15%",Mobs="아누비스 수호자·맘바 뱀",Resources="나일강 모래·신성한 금",Biome="황금 사막",Bonuses={HeatResist=.5,TradeIncome=.15}},
[3]={ID=3,Name="그리스",Landmark="파르테논 신전",Visual="코린토스 투구·월계관",Passive="연구 15%·스턴 저항",Mobs="미노타우로스·스파르타 영혼",Resources="올리브 목재·천연 은",Biome="신전 언덕",Bonuses={ResearchSpeed=.15,StunResist=.15}},
[4]={ID=4,Name="중국",Landmark="만리장성",Visual="비단 도포·용갑옷",Passive="성벽 내구 30%·체력 15%",Mobs="강시·화염 해태",Resources="점토·천연 화약",Biome="안개 성곽",Bonuses={WallDurability=.3,MaxHealth=.15}},
[5]={ID=5,Name="메소포타미아",Landmark="바빌론 공중정원",Visual="원통 왕관·곱슬 수염",Passive="식량 생산 25%·관개 효율",Mobs="파주주·전갈인간",Resources="점토판·비옥한 토양",Biome="초승달 지대",Bonuses={FoodProduction=.25,Irrigation=.15}},
[6]={ID=6,Name="페르시아",Landmark="페르세폴리스",Visual="불사조 왕관",Passive="무역 수수료 -50%·이동 10%",Mobs="불사신 전사·사막 전갈",Resources="신성한 은·향신료",Biome="무역로",Bonuses={TradeFeeReduction=.5,MoveSpeed=.1}},
[7]={ID=7,Name="인도",Landmark="타지마할",Visual="터번·보석 펜던트",Passive="회복 20%·주민 사기",Mobs="코끼리 거수·아수라",Resources="천연 마노·향신료 목재",Biome="아열대 밀림",Bonuses={HealthRegen=.2,Morale=.15}},
[8]={ID=8,Name="마야",Landmark="엘 카스티요",Visual="깃털 가면",Passive="야간 시야·채집 20%",Mobs="재규어 인간·정령 골렘",Resources="코코아·흑요석",Biome="고대 정글",Bonuses={NightVision=1,FoodGather=.2}},
[9]={ID=9,Name="잉카",Landmark="마추픽추",Visual="태양 황금띠·알파카 옷",Passive="산악 이동 25%·고지대 버프",Mobs="태양 대조류·안데스 곰",Resources="태양의 은·고산 암석",Biome="안데스 고원",Bonuses={MountainSpeed=.25,HighlandBonus=.15}},
[10]={ID=10,Name="아즈텍",Landmark="테노치티틀란",Visual="독수리·재규어 가죽",Passive="승리 공격 10%·피의 가호",Mobs="독수리 전사·환영 뱀",Resources="핏빛 흑요석·태양금",Biome="호수 도시",Bonuses={VictoryAttack=.1,BloodGuard=.1}},
[11]={ID=11,Name="켈트",Landmark="스톤헨지",Visual="드루이드 룬 로브",Passive="신화 연구비 -20%·오라",Mobs="드루이드 늑대·나무 정령",Resources="룬 각인석·드루이드 목재",Biome="안개 거석 숲",Bonuses={MythResearchDiscount=.2,Aura=.1}},
[12]={ID=12,Name="바이킹",Landmark="드라카르 조선소",Visual="털가죽 갑옷",Passive="해상 이동 30%·도끼 공격 15%",Mobs="서리 거인·해적 야만족",Resources="서리 철·드라카르 목재",Biome="빙하 피오르드",Bonuses={OceanSpeed=.3,AxeDamage=.15}},
[13]={ID=13,Name="몽골",Landmark="카라코룸 대오르드",Visual="유목민 모자·기마 활집",Passive="이동 20%·원거리 공격 15%",Mobs="야생 마귀·초원 늑대대장",Resources="말가죽·초원 철",Biome="대초원",Bonuses={MoveSpeed=.2,RangedAttack=.15}},
[14]={ID=14,Name="일본",Landmark="히메지성",Visual="사무라이 카부토",Passive="패링 0.08초·가드 저항",Mobs="오니·닌자 야시",Resources="도검용 강철·벚꽃 목재",Biome="벚꽃 숲",Bonuses={ParryWindow=.08,GuardBreakResist=.15}},
[15]={ID=15,Name="고조선",Landmark="단군성지",Visual="청동 거울·범가죽",Passive="청동기 진입비 -15%·활 공격 15%",Mobs="신시 범·곰 부족 전사",Resources="천부인 청동·쑥과 마늘",Biome="백두산 신시",Bonuses={BronzeDiscount=.15,BowDamage=.15}},
[16]={ID=16,Name="카르타고",Landmark="비르사 항구",Visual="상인 로브·용병 갑옷",Passive="무역 슬롯 +2·용병비 -20%",Mobs="용병 코끼리·해적 선장",Resources="지중해 소금·자줏빛 물감",Biome="항구 도시",Bonuses={TradeSlots=2,MercenaryDiscount=.2}},
[17]={ID=17,Name="아라비아",Landmark="메디나 대사원",Visual="터번·사막 검집",Passive="사막 이동 20%·야간 추위 면역",Mobs="이프리트·사막 거미",Resources="메디나 광물·오아시스 물",Biome="사막 궁전",Bonuses={DesertSpeed=.2,NightColdImmunity=1}},
[18]={ID=18,Name="에티오피아",Landmark="랄리벨라 암굴교회",Visual="고원 가죽·석조 장식",Passive="험지 방어 20%·신앙 버프",Mobs="고원 바부인·암굴 수호자",Resources="암굴 원석·고원 은",Biome="암굴 계곡",Bonuses={RoughTerrainDefense=.2,Faith=.1}},
[19]={ID=19,Name="폴리네시아",Landmark="모아이 석상",Visual="타투·조개 목걸이",Passive="해양 자원 30%·탐색 증가",Mobs="바다 괴수·거대 자걸",Resources="모아이 화산암·야자 목재",Biome="태평양 섬",Bonuses={OceanResources=.3,SearchRange=.2}},
[20]={ID=20,Name="줄루",Landmark="불라와요 크랄",Visual="가죽창·뼈 장식",Passive="근접 이동 25%·사기",Mobs="초원 사자대장·밀림 코뿔소",Resources="사바나 뼈·단단한 목재",Biome="사바나 목책",Bonuses={MeleeMoveSpeed=.25,Morale=.15}},
[21]={ID=21,Name="스페인",Landmark="산타마리아 성당",Visual="정복자 투구",Passive="원정 무역 20%·탐험 범위",Mobs="카라벨 해적·정복자 야시",Resources="천연 은·항해 목재",Biome="원정 항구",Bonuses={ExpeditionTrade=.2,ExploreRange=.2}},
[22]={ID=22,Name="프랑스",Landmark="베르사유 궁전",Visual="귀족 깃털 모자",Passive="동맹 자원 생산 15%",Mobs="궁정 검객·왕실 수호견",Resources="베르사유 유리·보석",Biome="왕실 정원",Bonuses={AllianceProduction=.15}},
[23]={ID=23,Name="독일",Landmark="노이슈반슈타인",Visual="중장갑 기사",Passive="집 내구 25%·무기 공업",Mobs="산악 고블린·중장갑병",Resources="게르만 철·백적목",Biome="알프스 고성",Bonuses={HouseDurability=.25,ForgeBoost=.15}},
[24]={ID=24,Name="러시아",Landmark="크렘린 궁전",Visual="모피 모자·두꺼운 코트",Passive="혹한 면역·채광 25%",Mobs="서리 곰·설원 괴수",Resources="동토 철·크렘린 백은",Biome="동토 설원",Bonuses={ColdImmunity=1,MiningYield=.25}},
}
local module={All=all}
function module.GetRace(id:number?):RaceConfig?
 if typeof(id)~="number"or id%1~=0 then return nil end
 return all[id]
end
return table.freeze(module)
