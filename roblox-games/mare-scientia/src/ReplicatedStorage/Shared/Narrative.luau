--!strict
-- 이야기 줄기: 왜 항해를 시작했는가, 해역마다 무엇을 만나는가, 지금 무엇을 하면 좋은가.
-- 아버지 로페스 선장이 남긴 반쪽짜리 해도 'Mare Scientia(지식의 바다)'를 찾아가는 여정.

local Story = {}

Story.Prologue = {
	title = "프롤로그 · 아버지의 해도",
	text = "아버지 로페스 선장은 '지식의 바다'를 찾아 떠났다가 돌아오지 않았다. 남은 것은 낡은 배 한 척, 갚지 못한 빚, 그리고 반쯤 찢긴 해도 한 장. 해도의 빈 쪽은 여섯 바다에 흩어져 있다고 한다. 먼저 가까운 바다에서 교역으로 빚을 갚고 동료를 모아라. 바다가 넓어질수록 아버지의 흔적도 선명해진다.",
}

-- 해역 단계(Regions.List 순서)마다: 처음 들어갈 때 보는 이야기와 그 바다의 목표
Story.Regions = {
	{ title = "1막 · 유럽의 항구", intro = "아버지의 마지막 장부 첫 줄엔 '리스본에서 시작하라'고 적혀 있다. 항구마다 값이 다르다. 싸게 사서 비싼 곳에 파는 법부터 익히자.", goal = "교역으로 빚을 갚고 명성을 쌓아 다음 바다의 문을 열자" },
	{ title = "2막 · 황금 해안", intro = "아프리카 서안과 대서양 섬. 아버지의 이름을 아는 늙은 상인이 해도의 첫 조각 이야기를 꺼낸다. '그분은 별만 보고 서쪽으로 가셨소.'", goal = "섬과 항구를 돌며 아버지의 흔적을 찾자" },
	{ title = "3막 · 신대륙", intro = "낯선 식물, 낯선 사람들, 끝없는 해안. 이 땅의 선원 사이에선 '하얀 돛의 로페스'가 전설이 되어 있다. 해도의 두 번째 조각이 이곳 어딘가에 있다.", goal = "탐험과 발견으로 학자들에게 이름을 알리자" },
	{ title = "4막 · 인도양", intro = "향신료 항로의 한복판. 이름난 함대들이 앞다투어 바다를 차지하려 한다. 아버지는 이곳에서 '바람의 법칙'을 적어 남겼다.", goal = "강한 선단을 꾸려 경쟁 속에서 살아남자" },
	{ title = "5막 · 극동", intro = "비단과 도자기의 나라들. 아버지의 마지막 서신은 이곳 항구에서 부쳐졌다. '다음 바다는 이름이 없다. 그래서 가 볼 가치가 있다.'", goal = "서신의 행방을 쫓아 가장 먼 바다로 나아가자" },
	{ title = "종막 · 지식의 바다", intro = "끝없는 태평양. 세 조각의 해도가 맞춰지자 한 줄이 드러난다. '바다는 팔 물건이 아니라 배울 것이다.' 아버지가 찾던 것은 보물이 아니라 세계의 모양이었다.", goal = "지도를 완성하고 자신만의 항해를 이어 가자" },
}

-- 지금 상황에 맞는 조언 한 줄. state 는 서버 상태.
function Story.advice(s: any, regions: any, hasCompanion: boolean, activeQuest: any?, nextLockedRegion: any?): string
	if s.coins < 150 and s.ship.crew > 0 and not s.cargoAny then
		return "빚이 무겁습니다. 교역소에서 싼 특산품을 사 두었다가 값이 높은 항구에 파는 것부터 해 보세요."
	end
	if not hasCompanion then
		return "혼자 항해하기엔 바다가 넓습니다. 주점에서 동료를 영입하면 항해·교역·전투에 효과가 붙어요."
	end
	if s.morale < 40 then
		return "선원들 얼굴이 어둡습니다. 주점에서 한턱 내 사기를 올리지 않으면 탈영할 수 있어요."
	end
	if activeQuest then
		return string.format("진행 중인 의뢰 '%s'를 마무리해 보세요. 보상과 명성이 쌓입니다.", activeQuest.name)
	end
	if nextLockedRegion then
		return string.format("모험 레벨 %d이 되면 '%s'가 열립니다. 항해와 발견으로 경험을 쌓으세요.", nextLockedRegion.minLevel, nextLockedRegion.name)
	end
	return "새 항구로 항해하며 아버지의 해도 조각을 찾아보세요. 항구마다 다른 소문과 의뢰가 기다립니다."
end

return Story
