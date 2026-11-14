--!nonstrict
-- 군사학 카드: 지역마다 병종이 다르다. 전투 능력(줄·무기·위력·능력)은 여기서 직접 정한다.
-- starter = 그 문화권으로 시작하면 처음부터 가진다 (줄마다 한 장씩, 총 3장).

local M = {}

M.List = {
	{ id = "mil_hoplite", name = "중장보병", rarity = "Common", region = "europe", row = "melee", weapon = "spear", power = 3, ability = "morale", starter = true, desc = "청동 갑옷과 둥근 방패, 긴 창을 든 고대 그리스의 시민 병사. 대열을 맞춰 싸운다." },
	{ id = "mil_longbowman", name = "장궁병", rarity = "Common", region = "europe", row = "ranged", weapon = "gun", power = 4, ability = nil, starter = true, desc = "큰 활을 쏘는 잉글랜드의 궁수. 빗발치는 화살로 기사단을 막았다." },
	{ id = "mil_trebuchet", name = "투석기", rarity = "Common", region = "europe", row = "cannon", weapon = "cannon", power = 4, ability = nil, starter = true, desc = "균형추의 힘으로 큰 돌을 멀리 던지는 중세의 공성 무기." },
	{ id = "mil_legionary", name = "로마 군단병", rarity = "Uncommon", region = "europe", row = "melee", weapon = "sword", power = 4, ability = "armor", starter = false, desc = "짧은 검과 직사각 방패로 줄을 맞춰 싸운 로마의 정규 보병." },
	{ id = "mil_crossbowman", name = "석궁병", rarity = "Uncommon", region = "europe", row = "ranged", weapon = "gun", power = 4, ability = nil, starter = false, desc = "기계 장치로 시위를 당겨 두꺼운 갑옷도 뚫는 사수." },
	{ id = "mil_ballista", name = "노포", rarity = "Uncommon", region = "europe", row = "cannon", weapon = "cannon", power = 5, ability = nil, starter = false, desc = "굵은 화살을 쏘는 대형 쇠뇌. 성벽과 배를 노린다." },
	{ id = "mil_swiss_pike", name = "스위스 창병", rarity = "Uncommon", region = "europe", row = "melee", weapon = "spear", power = 4, ability = "morale", starter = false, desc = "긴 창을 숲처럼 세워 기병을 막은 산악 지방의 용병." },
	{ id = "mil_viking_raider", name = "바이킹 전사", rarity = "Uncommon", region = "europe", row = "melee", weapon = "axe", power = 5, ability = nil, starter = false, desc = "긴 배를 타고 해안을 덮친 북유럽의 도끼 전사." },
	{ id = "mil_knight", name = "중세 기사", rarity = "Rare", region = "europe", row = "melee", weapon = "sword", power = 6, ability = "armor", starter = false, desc = "말과 판금 갑옷으로 무장한 중세 유럽의 중무장 기병." },
	{ id = "mil_tercio", name = "스페인 테르시오", rarity = "Rare", region = "europe", row = "ranged", weapon = "gun", power = 6, ability = nil, starter = false, desc = "창병과 총병을 한 방진으로 묶은 16세기 스페인의 최강 보병 편제." },
	{ id = "mil_siege_tower", name = "공성탑", rarity = "Rare", region = "europe", row = "cannon", weapon = "cannon", power = 6, ability = "armor", starter = false, desc = "성벽 높이로 세워 병사를 쏟아 내는 바퀴 달린 탑." },
	{ id = "mil_macedonian_phalanx", name = "마케도니아 팔랑크스", rarity = "Epic", region = "europe", row = "melee", weapon = "spear", power = 8, ability = nil, starter = false, desc = "사리사 창을 겹겹이 세운 알렉산드로스 군대의 중심 방진." },
	{ id = "mil_ashigaru", name = "아시가루", rarity = "Common", region = "east_asia", row = "melee", weapon = "spear", power = 3, ability = nil, starter = true, desc = "일본 전국시대의 보병. 창과 조총을 들고 대열을 이룬다." },
	{ id = "mil_joseon_archer", name = "조선 궁병", rarity = "Common", region = "east_asia", row = "ranged", weapon = "gun", power = 4, ability = nil, starter = true, desc = "각궁으로 먼 거리를 쏘는 조선의 정예 궁수." },
	{ id = "mil_choi_cannon", name = "고려 화포", rarity = "Common", region = "east_asia", row = "cannon", weapon = "cannon", power = 4, ability = nil, starter = true, desc = "최무선이 만든 화약 무기. 바다에서 왜구의 배를 불태웠다." },
	{ id = "mil_han_crossbow", name = "한나라 쇠뇌병", rarity = "Uncommon", region = "east_asia", row = "ranged", weapon = "gun", power = 5, ability = nil, starter = false, desc = "기계식 쇠뇌를 일제히 쏘는 중국의 사수." },
	{ id = "mil_fire_lance", name = "화창병", rarity = "Uncommon", region = "east_asia", row = "ranged", weapon = "gun", power = 4, ability = nil, starter = false, desc = "창 끝에 화약통을 달아 불길을 뿜는 송나라의 병사." },
	{ id = "mil_ming_musket", name = "명 조총병", rarity = "Uncommon", region = "east_asia", row = "ranged", weapon = "gun", power = 5, ability = nil, starter = false, desc = "명나라 군대의 화승총 부대." },
	{ id = "mil_samurai_bushi", name = "사무라이 무사", rarity = "Rare", region = "east_asia", row = "melee", weapon = "sword", power = 6, ability = nil, starter = false, desc = "칼과 활을 함께 익힌 일본의 무사 계급." },
	{ id = "mil_mongol_archer", name = "몽골 궁기병", rarity = "Rare", region = "east_asia", row = "ranged", weapon = "gun", power = 6, ability = "snipe", starter = false, desc = "말을 달리며 활을 쏘는 초원의 기병. 유라시아를 휩쓸었다." },
	{ id = "mil_hwacha", name = "화차", rarity = "Rare", region = "east_asia", row = "cannon", weapon = "cannon", power = 7, ability = nil, starter = false, desc = "수레에 신기전 수백 발을 싣고 한꺼번에 쏘는 조선의 병기." },
	{ id = "mil_kheshig", name = "몽골 케식", rarity = "Legendary", region = "east_asia", row = "melee", weapon = "sword", power = 10, ability = nil, starter = false, desc = "칭기즈 칸을 지키던 정예 친위대. 군대에서 가장 용맹한 사람만 뽑았다." },
	{ id = "mil_jaguar_warrior", name = "재규어 전사", rarity = "Common", region = "new_world", row = "melee", weapon = "axe", power = 4, ability = nil, starter = true, desc = "아즈텍의 정예 전사. 재규어 가죽을 두르고 흑요석 칼로 싸운다." },
	{ id = "mil_inca_sling", name = "잉카 투석병", rarity = "Common", region = "new_world", row = "ranged", weapon = "gun", power = 3, ability = nil, starter = true, desc = "끈에 돌을 걸어 돌리다 던지는 안데스의 병사." },
	{ id = "mil_battering_ram", name = "통나무 파성퇴", rarity = "Common", region = "new_world", row = "cannon", weapon = "cannon", power = 3, ability = nil, starter = true, desc = "단단한 통나무로 성문을 부수는 공성 무기." },
	{ id = "mil_atlatl", name = "아틀라틀 투창병", rarity = "Common", region = "new_world", row = "ranged", weapon = "gun", power = 3, ability = nil, starter = false, desc = "투창기로 창을 멀리 던지는 아메리카의 사냥꾼 병사." },
	{ id = "mil_macuahuitl", name = "마쿠아우이틀 전사", rarity = "Uncommon", region = "new_world", row = "melee", weapon = "axe", power = 5, ability = nil, starter = false, desc = "흑요석 날을 박은 나무 몽둥이를 든 아즈텍의 전사." },
	{ id = "mil_iroquois", name = "이로쿼이 전사", rarity = "Uncommon", region = "new_world", row = "melee", weapon = "axe", power = 4, ability = nil, starter = false, desc = "숲 속 기습에 능한 북아메리카 동부의 연합 전사." },
	{ id = "mil_conquistador", name = "정복자 총병", rarity = "Rare", region = "new_world", row = "ranged", weapon = "gun", power = 6, ability = nil, starter = false, desc = "총과 갑옷, 말로 신대륙을 정복한 스페인 군인." },
	{ id = "mil_eagle_warrior", name = "독수리 전사", rarity = "Epic", region = "new_world", row = "melee", weapon = "axe", power = 8, ability = nil, starter = false, desc = "독수리 깃털 투구를 쓴 아즈텍 최고 용사. 포로를 잡아 신에게 바쳤다." },
	{ id = "mil_saracen_archer", name = "사라센 궁병", rarity = "Common", region = "middle_east", row = "ranged", weapon = "gun", power = 4, ability = nil, starter = true, desc = "합성궁으로 달리는 말 위에서도 쏘는 이슬람 세계의 궁수." },
	{ id = "mil_camel_rider", name = "낙타 기병", rarity = "Common", region = "middle_east", row = "melee", weapon = "spear", power = 4, ability = nil, starter = true, desc = "사막을 건너 달리는 낙타 위의 창병. 말이 겁내는 냄새로 적을 흩뜨렸다." },
	{ id = "mil_manjaniq", name = "만자니크", rarity = "Common", region = "middle_east", row = "cannon", weapon = "cannon", power = 4, ability = nil, starter = true, desc = "이슬람 세계에서 발달한 투석기. 성벽 앞에서 돌과 불덩이를 던졌다." },
	{ id = "mil_janissary", name = "예니체리", rarity = "Uncommon", region = "middle_east", row = "ranged", weapon = "gun", power = 5, ability = nil, starter = false, desc = "오스만 술탄이 직접 길러 낸 상비 총병 부대." },
	{ id = "mil_mamluk", name = "맘루크 기병", rarity = "Rare", region = "middle_east", row = "melee", weapon = "sword", power = 6, ability = nil, starter = false, desc = "노예 출신 병사가 이집트를 다스리게 된 정예 기병." },
	{ id = "mil_greek_fire", name = "그리스의 불", rarity = "Rare", region = "middle_east", row = "cannon", weapon = "cannon", power = 7, ability = nil, starter = false, desc = "물 위에서도 타오르는 비잔티움의 비밀 화염 무기." },
	{ id = "mil_great_bombard", name = "오스만 대형 포", rarity = "Epic", region = "middle_east", row = "cannon", weapon = "cannon", power = 9, ability = nil, starter = false, desc = "콘스탄티노폴리스 성벽을 부순 거대한 청동 대포." },
	{ id = "mil_saladin_guard", name = "살라딘의 친위대", rarity = "Legendary", region = "middle_east", row = "melee", weapon = "sword", power = 10, ability = nil, starter = false, desc = "십자군을 막아 낸 살라딘 곁을 지킨 정예 기병." },
	{ id = "mil_nubian_archer", name = "누비아 궁병", rarity = "Common", region = "africa", row = "ranged", weapon = "gun", power = 4, ability = nil, starter = true, desc = "나일 강 상류에서 이름을 떨친 '활의 땅' 사람들의 궁수." },
	{ id = "mil_ethiopian_spear", name = "에티오피아 창병", rarity = "Common", region = "africa", row = "melee", weapon = "spear", power = 3, ability = nil, starter = true, desc = "고원의 왕국을 지킨 창과 방패의 보병." },
	{ id = "mil_stone_thrower", name = "대형 투석 장치", rarity = "Common", region = "africa", row = "cannon", weapon = "cannon", power = 3, ability = nil, starter = true, desc = "산성 위에서 큰 돌을 굴리고 던지는 방어용 장치." },
	{ id = "mil_songhai_cavalry", name = "송가이 기병", rarity = "Uncommon", region = "africa", row = "melee", weapon = "spear", power = 5, ability = nil, starter = false, desc = "니제르 강 유역 제국의 말 탄 창병." },
	{ id = "mil_ashanti_musket", name = "아산테 머스킷병", rarity = "Uncommon", region = "africa", row = "ranged", weapon = "gun", power = 5, ability = nil, starter = false, desc = "서아프리카 황금 해안의 총병. 교역으로 얻은 총을 썼다." },
	{ id = "mil_berber_raider", name = "베르베르 약탈대", rarity = "Uncommon", region = "africa", row = "melee", weapon = "sword", power = 4, ability = nil, starter = false, desc = "사하라와 지중해 연안을 오가며 배를 덮친 약탈대." },
	{ id = "mil_mali_horse", name = "말리 제국 기병", rarity = "Rare", region = "africa", row = "melee", weapon = "spear", power = 6, ability = nil, starter = false, desc = "만사 무사 시대 말리 제국의 기병." },
	{ id = "mil_hannibal_elephants", name = "한니발의 전투 코끼리", rarity = "Legendary", region = "africa", row = "melee", weapon = "axe", power = 10, ability = nil, starter = false, desc = "알프스를 넘어 로마를 위협한 카르타고의 코끼리 부대." },
	{ id = "mil_scout_party", name = "척후대", rarity = "Common", region = "any", row = "ranged", weapon = "gun", power = 2, ability = "spy", starter = false, desc = "먼저 나아가 적의 움직임을 살피는 소규모 정찰대." },
	{ id = "mil_marine", name = "해병", rarity = "Uncommon", region = "any", row = "melee", weapon = "sword", power = 5, ability = nil, starter = false, desc = "배 위에서 적선에 뛰어드는 전문 접현 병사." },
	{ id = "mil_naval_gunner", name = "해군 포수", rarity = "Uncommon", region = "any", row = "cannon", weapon = "cannon", power = 5, ability = nil, starter = false, desc = "흔들리는 갑판에서 함포를 조준하는 숙련 포수." },
	{ id = "mil_army_surgeon", name = "군의관", rarity = "Uncommon", region = "any", row = "melee", weapon = "sword", power = 2, ability = "medic", starter = false, desc = "전장에서 부상자를 치료하는 의사." },
}

M.ById = {}
M.Starters = {}
for _, m in M.List do
	M.ById[m.id] = m
	if m.starter then
		M.Starters[m.region] = M.Starters[m.region] or {}
		table.insert(M.Starters[m.region], m.id)
	end
end

-- 희귀도별 도감 보상(명성, 코인)
M.Reward = { Common = { 5, 12 }, Uncommon = { 15, 36 }, Rare = { 40, 110 }, Epic = { 100, 280 }, Legendary = { 150, 450 } }

return M
