--!nonstrict
-- 지상 탐험 전술 맵. 글자 한 칸이 한 타일이다 (지형 글자는 TacticsData.Terrain).
-- 1~5: 내 부대 시작 칸, A~H: 적 시작 칸(foes 표로 종류를 정한다), x: 도감 카드가 숨어 있는 조사 지점.
-- 새 맵은 표에 항목 하나만 더하면 된다. 모든 맵은 테스트가 크기·시작 칸·조사 지점·목표 도달 가능 여부를 검사한다.

local Maps = {}

Maps.List = {
	{
		id = "plain_road", name = "들판 길목", biome = "plain", objective = "rout", turnLimit = 12,
		intro = "들판 한가운데 산적들이 길을 막고 있다. 낮은 둔덕을 차지하고 맞서자.",
		rows = {
			"............",
			"..f.....h...",
			"1...x..h..A.",
			"2..f...h....",
			"3....x...B..",
			"4..f...h....",
			"5...x..h..A.",
			"..f.....h...",
			"............",
		},
		foes = { A = "bandit", B = "bandit_archer" },
	},
	{
		id = "forest_trail", name = "깊은 숲길", biome = "forest", objective = "boss", turnLimit = 14,
		intro = "숲속에서 늑대 울음이 들린다. 큰곰이 오솔길 끝을 지키고 있다.",
		rows = {
			"ffff.ffffff.",
			"f..f..f..f..",
			"1.x.ff..f.Cf",
			"2..f..f..A.f",
			"3.f..x..f.Bf",
			"4..f..f..A.f",
			"5.x.ff..f..f",
			"f..f..f..f..",
			"ffff.ffffff.",
		},
		foes = { A = "wolf", B = "poacher", C = "bear" },
	},
	{
		id = "coast_cove", name = "해적의 후미", biome = "coast", objective = "boss", turnLimit = 13,
		intro = "모래톱 너머 해적들이 짐을 풀고 있다. 두목을 쓰러뜨리면 흩어질 것이다.",
		rows = {
			"WWWWWWWWWWWW",
			"WsssssssssWW",
			"1s.x.ww..sBW",
			"2s..ww.s.sAW",
			"3s.s..w.xsCW",
			"4s..ww.s.sAW",
			"5s.x.ww..sDW",
			"Wsssssssss.W",
			"WWWWWWWWWWWW",
		},
		foes = { A = "pirate", B = "pirate_captain", C = "pirate_gunner", D = "smuggler" },
	},
	{
		id = "mine_tunnel", name = "어두운 갱도", biome = "mine", objective = "boss", turnLimit = 14,
		intro = "좁은 갱도에서 광산 도적들이 매복하고 있다. 감독을 지나 두목이 있는 막장까지 가자.",
		rows = {
			"############",
			"#mmm##mmmmm#",
			"1mxm#mm##mC#",
			"2mmmmmm#xmm#",
			"3mm##mmmmBm#",
			"4mmm#mm#mmm#",
			"5mxm##mmmmA#",
			"#mmm##mmmmm#",
			"############",
		},
		foes = { A = "miner", B = "foreman", C = "mine_boss" },
	},
	{
		id = "stone_circle", name = "고대 열석", biome = "stones", objective = "survive", turnLimit = 8,
		intro = "해 질 녘, 열석 사이로 약탈자들이 몰려온다. 8턴만 버티면 지나가던 마을 사람들이 도와준다.",
		rows = {
			"............",
			".r..r..r..r.",
			"1...........",
			"2.r..xx..r.A",
			"3.....r...B.",
			"4.r..xx..r.A",
			"5...........",
			".r..r..r..r.",
			"............",
		},
		foes = { A = "raider", B = "raider_chief" },
	},
	{
		id = "cliff_path", name = "절벽 위 오솔길", biome = "cliff", objective = "reach", turnLimit = 12,
		intro = "벼랑 위 좁은 길을 따라 반대편 봉화대까지 가야 한다. 길목마다 적이 지킨다.",
		rows = {
			"hhh##hhhhhh#",
			"1.h#hhx.hh.#",
			"2..#hh..#h.G",
			"3.hhh..h#..#",
			"4....h.x#h.#",
			"5.hh##...hA.",
			"hhh###hh...B",
			"hhhh#hhh.xA#",
			"############",
		},
		foes = { A = "bandit", B = "bandit_archer" },
	},
	{
		id = "marsh_lagoon", name = "안개 낀 석호", biome = "marsh", objective = "rout", turnLimit = 14,
		intro = "늪과 물길이 얽힌 석호. 밀수꾼들이 갈대밭에서 기다린다. 마른 땅을 골라 딛자.",
		rows = {
			"~~~~.~~~~~~.",
			"~..~.~..~~A.",
			"1.x~~~.x~~..",
			"2...~w....B.",
			"3.~~~w.~~~..",
			"4...~w.x~.A.",
			"5.x~~~.~~~..",
			"~..~.~..~~~~",
			"~~~~.~~~~~~~",
		},
		foes = { A = "smuggler", B = "pirate_gunner" },
	},
	{
		id = "volcano_slope", name = "화산 기슭", biome = "volcano", objective = "survive", turnLimit = 9,
		intro = "땅이 울린다. 굳은 용암 위에서 약탈자들을 9턴 동안 막아내야 한다.",
		rows = {
			"llll....llll",
			"l..l.xx.l..l",
			"1.ll....ll..",
			"2....##.....",
			"3.l..#x.l..A",
			"4....##....B",
			"5.ll....ll.A",
			"l..l.xx.l..l",
			"llll....llll",
		},
		foes = { A = "raider", B = "raider_chief" },
	},
	{
		id = "quarry", name = "채석장 비탈", biome = "quarry", objective = "boss", turnLimit = 14,
		intro = "하얀 돌 비탈 위에 산적들이 진을 쳤다. 높은 곳에서 내려다보는 쪽이 유리하다.",
		rows = {
			"hhhhh#hhhhhh",
			"h..xh#h..hhC",
			"1...hh...hhB",
			"2.h......hA.",
			"3.hh##.hh.#.",
			"4.h..x...hA.",
			"5...hh.h.hh.",
			"h.x.hh.h.hhh",
			"hhhhh#hhhhhh",
		},
		foes = { A = "bandit", B = "bandit_archer", C = "bandit_chief" },
	},
	{
		id = "ruins_dig", name = "발굴 현장", biome = "ruins", objective = "rout", turnLimit = 13,
		intro = "무너진 신전 터에 도굴꾼들이 들어와 있다. 유물이 상하기 전에 쫓아내야 한다.",
		rows = {
			"rrr.....rrr.",
			"r.r..x..r.r.",
			"1....rr.....",
			"2.rr.rr.rr.A",
			"3....xx..rB.",
			"4.rr....rr.A",
			"5....rr.....",
			"r.r..x..r.rC",
			"rrr.....rrr.",
		},
		foes = { A = "grave_robber", B = "relic_guard", C = "grave_robber" },
	},
	{
		id = "orchard_grove", name = "과수원 언덕", biome = "garden", objective = "rout", turnLimit = 12,
		intro = "수확철 과수원을 탈영병들이 털고 있다. 나무 사이로 돌아 들어가 몰아내자.",
		rows = {
			"............",
			".f.f.f.f.f..",
			"1...x.......",
			"2.f.f.f.f.A.",
			"3.....x...B.",
			"4.f.f.f.f.A.",
			"5...x.......",
			".f.f.f.f.f..",
			"............",
		},
		foes = { A = "deserter", B = "bandit_archer" },
	},
	{
		id = "wall_ridge", name = "옛 방벽 능선", biome = "wall", objective = "boss", turnLimit = 14,
		intro = "무너진 방벽을 끼고 약탈 부대가 진을 쳤다. 방벽 틈 사이로 우회해 대장을 노리자.",
		rows = {
			"h..#...#...h",
			"1.x#.h.#.x..",
			"2..#...#..BC",
			"3....h.....A",
			"4..#...#...A",
			"5.x#.h.#.x..",
			"h..#...#...h",
			"hh.........h",
			"hhhhhhhhhhhh",
		},
		foes = { A = "raider", B = "raider_chief", C = "relic_guard" },
	},
}

Maps.ById = {}
for _, m in Maps.List do
	Maps.ById[m.id] = m
end

-- 탐험 지점 이름 → 장소 종류. 단어가 맞는 첫 항목을 쓴다. 건물 안·바다 위 지점은 전술 탐험을 할 수 없다(nil).
local BIOME_WORDS = {
	{ "stones", { "선돌", "열석", "룬석", "신석기", "묘", "봉분" } },
	{ "wall", { "방벽" } },
	{ "ruins", { "발굴", "유적", "로마", "신전" } },
	{ "volcano", { "베수비오", "화산" } },
	{ "mine", { "광산", "철광", "탄광" } },
	{ "quarry", { "채석" } },
	{ "cliff", { "절벽", "바위", "바위산", "바위길", "동굴" } },
	{ "marsh", { "석호", "간척", "염전" } },
	{ "forest", { "숲", "계곡", "군도 숲" } },
	{ "garden", { "정원", "과수원", "올리브", "라벤더", "감자밭", "농장" } },
	{ "coast", { "해안", "후미", "만 " } },
	{ "plain", { "들판", "평원", "언덕", "밭" } },
}
local INDOOR_WORDS = { "실험실", "병원", "관측대", "천문대", "기록실", "자료실", "대성당", "조선소", "공방", "진열실", "보관소", "창고", "열람", "관찰", "전설", "앞바다", "해협", "부두" }

function Maps.biomeOfName(name: string): string?
	for _, w in INDOOR_WORDS do
		if string.find(name, w, 1, true) then
			return nil
		end
	end
	for _, entry in BIOME_WORDS do
		for _, w in entry[2] do
			if string.find(name, w, 1, true) then
				return entry[1]
			end
		end
	end
	return nil
end

-- 특별한 장소는 정해진 맵을 쓴다. 그 밖의 장소는 장소 종류에 맞는 맵을 쓴다.
Maps.SiteOverride = {
	falun_mine = "mine_tunnel",
	stockholm_mine = "mine_tunnel",
	hadrian_hills = "wall_ridge",
	salisbury_plain = "stone_circle",
	giants_causeway = "cliff_path",
	pompeii_ruins = "ruins_dig",
	vesuvius_slopes = "volcano_slope",
	carrara_quarry = "quarry",
	gothenburg_forest = "forest_trail",
}

local BIOME_DEFAULT = {
	plain = "plain_road", forest = "forest_trail", coast = "coast_cove", mine = "mine_tunnel", stones = "stone_circle",
	cliff = "cliff_path", marsh = "marsh_lagoon", volcano = "volcano_slope", quarry = "quarry", ruins = "ruins_dig",
	garden = "orchard_grove", wall = "wall_ridge",
}

-- 이 탐험 지점(site)에서 열 수 있는 전술 맵. 없으면 nil.
function Maps.forSite(site)
	local forced = Maps.SiteOverride[site.id]
	if forced then
		return Maps.ById[forced]
	end
	local biome = Maps.biomeOfName(site.name)
	if not biome then
		return nil
	end
	return Maps.ById[BIOME_DEFAULT[biome]]
end

return Maps
