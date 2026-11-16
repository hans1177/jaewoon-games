--!strict
local W = require("./Shared/Weapons")
local J = require("./Shared/JobSkills")
local passed, failed = 0, 0
local function check(name: string, ok: boolean)
	if ok then
		passed += 1
	else
		failed += 1
		print("실패: " .. name)
	end
end
check("무기가 8종 이상", #W.List >= 8)
local ids: { [string]: boolean } = {}
local dup = false
for _, w in W.List do
	if ids[w.id] then dup = true end
	ids[w.id] = true
end
check("무기 id 중복 없음", not dup)
check("맨손·검·도끼·석궁·활·총 모두 있다", ids.fist and ids.sword and ids.axe and ids.crossbow and ids.bow and ids.gun)
check("원거리는 활·석궁·총", W.get("bow").ranged and W.get("crossbow").ranged and W.get("gun").ranged and not W.get("sword").ranged)
check("없는 id 는 맨손", W.get("nope").id == "fist")
-- [기본 호환] 기존 직업 무기는 모두 존재하고, 등록되지 않은 모델은 임의 참조하지 않는다.
local allOk = true
for catId in J.Categories do
	local w = W.allyWeapon(catId)
	if not w or not w.id or w.power <= 0 then allOk = false end
end
check("직업별 무기 데이터 유효", allOk)
check("성직자·의사는 다른 장비", W.allyWeapon("clergy").id ~= W.allyWeapon("doctor").id)
check("주인공 자유 무기 선택 유지", W.playerChoices() == W.List and ids.bow)
check("지역형 무기 20종 이상", #W.Regional >= 20)
local allIds = {}
local variantOk = true
for _, w in W.List do allIds[w.id] = true end
for _, w in W.Regional do
	if allIds[w.id] or not w.motion or not w.region then variantOk = false end
	allIds[w.id] = true
end
check("지역형 무기 식별자 중복 없음", variantOk)
check("지팡이·방패 무기 없음", not allIds.staff and not allIds.shield)
check("지역형은 기본 피해·사거리 유지",
	W.get("japanese_yumi").power == W.get("bow").power
	and W.get("japanese_yumi").range == W.get("bow").range
	and W.get("matchlock_musket").power == W.get("gun").power
	and W.get("rapier").power == W.get("sword").power)
-- [출신 + 경력 + 시대] 같은 직업이라도 실존 무기 문화와 이력에 따라 다른 장비.
check("일본 무사 = 일본도", W.allyWeapon("warrior", { nation = "japan", job = "낭인 무사" }).id == "katana")
check("조선 수군 = 환도", W.allyWeapon("warrior", { nation = "korea", job = "판옥선 수군" }).id == "hwando")
check("무인 격투 경력 = 맨손", W.allyWeapon("warrior", { nation = "france", background = "권투 선수" }).id == "fist")
check("유럽 학자 = 레이피어", W.allyWeapon("scholar", { nation = "france", job = "학자" }).id == "rapier")
check("일본 탐험 학자 = 일본 화궁", W.allyWeapon("scholar", { nation = "japan", job = "지식 여행자" }).id == "japanese_yumi")
check("조선 탐험 학자 = 각궁", W.allyWeapon("scholar", { nation = "korea", background = "박물학 탐험" }).id == "korean_gakgung")
check("영국 야외 학자 = 장궁", W.allyWeapon("scholar", { nation = "england", background = "박물 탐험" }).id == "english_longbow")
check("오스만 상인 = 샴시르", W.allyWeapon("merchant", { nation = "ottoman", job = "대상 상인" }).id == "shamshir")
check("영국 해상 상인 = 선상도", W.allyWeapon("merchant", { nation = "england", job = "해상 상인" }).id == "cutlass")
check("오스만 호위 출신 상인 = 현지 권총", W.allyWeapon("merchant", { nation = "ottoman", background = "호위 경력", year = 1710 }).id == "ottoman_kubur")
check("결투 경력 상인 = 결투용 권총", W.allyWeapon("merchant", { nation = "france", background = "결투 경력의 퇴역 상인", year = 1740 }).id == "dueling_pistol")
check("일본 초기 포수 = 다네가시마", W.allyWeapon("gunner", { nation = "japan", job = "포수", year = 1570 }).id == "tanegashima")
check("유럽 초기 포수 = 화승총", W.allyWeapon("gunner", { nation = "england", job = "포수", year = 1570 }).id == "matchlock_musket")
check("유럽 후기 포수 = 수석총", W.allyWeapon("gunner", { nation = "england", job = "포수", year = 1740 }).id == "flintlock_musket")
check("성직자 무장 수도회 = 검", W.allyWeapon("clergy", { nation = "france", background = "무장 기사단" }).id == "sword")
check("일반 성직자 = 비무장", W.allyWeapon("clergy", { nation = "france", background = "일반 성직자" }).id == "fist")
check("전직 해군 의사 = 선상도", W.allyWeapon("doctor", { nation = "france", background = "해군 군의관" }).id == "cutlass")
check("순환: 마지막 다음은 처음", W.cycle(W.List[#W.List].id, 1).id == W.List[1].id)
check("순환: 처음 이전은 마지막", W.cycle(W.List[1].id, -1).id == W.List[#W.List].id)
check("빠른 무기는 동작이 짧다", W.swingDuration(W.get("dagger"), 1) < W.swingDuration(W.get("axe"), 1))
check("도끼가 맨손보다 세다", W.damage(W.get("axe"), 10) > W.damage(W.get("fist"), 10))
print(string.format("무기 테스트: 통과 %d, 실패 %d", passed, failed))
if failed > 0 then error("무기 테스트 실패") end
