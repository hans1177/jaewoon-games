--!strict
-- 실존 학자 NPC. 연도 범위 안에서만 방문할 수 있고, 첫 방문에 지식 카드를 전수한다.
-- 활동 시기와 장소는 게임 설정이며, 구현 전 출처 확인이 필요하다 (docs/CATALOG.md 참고).

export type Scholar = {
	id: string,
	name: string,
	portId: string,
	fromYear: number,
	toYear: number,
	minFame: number,
	cardId: string,
	line: string,
}

local Scholars: { Scholar } = {
	{ id = "descartes", name = "르네 데카르트", portId = "amsterdam", fromYear = 1629, toYear = 1649, minFame = 30,
		cardId = "phi_cogito", line = "확실한 것을 찾으려면 먼저 모든 것을 의심해 보게." },
	{ id = "huygens", name = "크리스티안 하위헌스", portId = "amsterdam", fromYear = 1655, toYear = 1695, minFame = 50,
		cardId = "ast_saturn_rings", line = "렌즈를 잘 갈면 하늘의 비밀도 가까워지지." },
	{ id = "boyle", name = "로버트 보일", portId = "london", fromYear = 1660, toYear = 1691, minFame = 30,
		cardId = "che_phosphorus", line = "실험으로 확인하지 않은 말은 믿지 않는다네." },
	{ id = "newton", name = "아이작 뉴턴", portId = "london", fromYear = 1685, toYear = 1727, minFame = 150,
		cardId = "phy_gravity", line = "사과도 달도 같은 힘으로 끌린다고 생각해 보게." },
	{ id = "leeuwenhoek", name = "안톤 판 레이우엔훅", portId = "amsterdam", fromYear = 1670, toYear = 1723, minFame = 40,
		cardId = "phy_microscope", line = "물 한 방울 속에도 작은 생물이 가득하다오." },
	{ id = "papin", name = "드니 파팽", portId = "london", fromYear = 1679, toYear = 1713, minFame = 30,
		cardId = "phy_papin_digester", line = "솥 안의 증기가 뚜껑을 밀어 올리는 걸 보았나?" },
	{ id = "savery", name = "토머스 세이버리", portId = "london", fromYear = 1698, toYear = 1715, minFame = 60,
		cardId = "phy_savery_pump", line = "증기로 물을 퍼 올리면 광부들이 한결 편해질 걸세." },
	-- 뉴커먼은 대체 역사 설정으로 등장 시기를 앞당겼다 (docs/STEAM.md)
	{ id = "newcomen", name = "토머스 뉴커먼", portId = "london", fromYear = 1698, toYear = 1729, minFame = 100,
		cardId = "phy_newcomen_engine", line = "증기를 식히면 대기의 무게가 피스톤을 밀어 준다네." },
	{ id = "merian", name = "마리아 지빌라 메리안", portId = "amsterdam", fromYear = 1691, toYear = 1717, minFame = 40,
		cardId = "zoo_metamorphosis", line = "벌레가 나비가 되는 순간을 한 장도 빠짐없이 그렸지요." },
	{ id = "halley", name = "에드먼드 핼리", portId = "london", fromYear = 1690, toYear = 1742, minFame = 50,
		cardId = "ast_comet", line = "그 혜성은 76년쯤마다 돌아올 거라고 나는 믿네." },
	{ id = "leibniz", name = "고트프리트 라이프니츠", portId = "hamburg", fromYear = 1690, toYear = 1716, minFame = 80,
		cardId = "phi_monad", line = "세계는 더 쪼갤 수 없는 작은 단위들로 이루어져 있지." },
	{ id = "linnaeus", name = "카를 린네", portId = "gothenburg", fromYear = 1735, toYear = 1778, minFame = 80,
		cardId = "bot_binomial", line = "이름을 두 단어로 줄이면 모든 식물을 정리할 수 있다네." },
}

return {
	Scholars = Scholars,
}
