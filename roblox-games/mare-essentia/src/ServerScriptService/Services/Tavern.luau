--!nonstrict
-- 주점 의뢰판: 그 항구(또는 해역)에서, 그 시기에만 나오는 잡다한 의뢰. 역사적 사실에서 나온 일, 주점 소문, 전투 의뢰가 섞여 있다.
-- 종류: hunt(전투 의뢰: 실시간 해전) · deliver(그 항구가 지금 필요로 하는 물건 납품) · event(주점에서 벌어지는 일, 선택).
-- 연도·사건은 게임 설정이며 구현 전 출처 확인이 필요하다 (docs/CATALOG.md).
-- ports 또는 region(Regions.List 의 id) 중 하나로 장소를 정하고, from~to 연도 안에서만 보인다.

local Data = require(script.Parent.TavernData)

return function(D, S)
	local handlers = {}

	local JOBS = {
		-- ===== 전투 의뢰 =====
		{ id = "armada_scout", kind = "hunt", tag = "역사", name = "무적함대 정찰선을 쫓아라", ports = { "plymouth" }, from = 1585, to = 1590, lvOffset = 1, enemy = "스페인 정찰선",
			text = "에스파냐의 대함대가 영국 해협으로 온다는 소문이 돈다. 앞서 해협을 살피는 정찰선을 잡아 달라는 의뢰.", coins = 700, fame = 20 },
		{ id = "anglo_dutch_privateer", kind = "hunt", tag = "역사", name = "영란전쟁 사략선 소탕", ports = { "amsterdam", "rotterdam" }, from = 1652, to = 1674, lvOffset = 1, enemy = "영국 사략선",
			text = "영국과의 전쟁으로 북해에 사략선이 들끓는다. 상선단 길목을 막은 한 척을 처리해 달라.", coins = 900, fame = 24 },
		{ id = "barbary_corsair", kind = "hunt", tag = "지역", name = "바르바리 해적 소탕", ports = { "valletta", "genoa", "livorno", "marseille", "naples", "palermo" }, from = 1600, to = 1830, lvOffset = 0, enemy = "바르바리 해적선",
			text = "북아프리카 해안에서 온 해적선이 지중해 상선을 노린다. 길드가 현상금을 걸었다.", coins = 600, fame = 15 },
		{ id = "silver_fleet_guard", kind = "hunt", tag = "역사", name = "은 선단 매복 해적", ports = { "seville", "cadiz" }, from = 1600, to = 1700, lvOffset = 1, enemy = "은 선단 매복선",
			text = "신대륙의 은을 실은 선단이 도착할 철이다. 길목에 매복한 해적을 먼저 쫓아내 달라는 의뢰.", coins = 800, fame = 18 },
		{ id = "red_sea_pirate", kind = "hunt", tag = "지역", name = "홍해 입구의 해적", ports = { "aden", "mocha", "jeddah", "muscat" }, from = 1600, to = 1830, lvOffset = 0, enemy = "홍해 해적선",
			text = "순례선과 향신료 상선을 노리는 해적이 바브엘만데브 해협 근처에 숨어 있다.", coins = 650, fame = 16 },
		{ id = "south_china_sea_pirate", kind = "hunt", tag = "지역", name = "남중국해 해적선 격퇴", ports = { "malacca", "manila", "macau", "canton", "amoy" }, from = 1600, to = 1830, lvOffset = 1, enemy = "남중국해 해적선",
			text = "비단과 은을 실은 배를 노리는 해적 무리가 해협에 드나든다. 거래소가 호송을 부탁한다.", coins = 750, fame = 18 },
		{ id = "caribbean_bounty", kind = "hunt", tag = "지역", name = "카리브 해적 현상금", region = "new_world", from = 1650, to = 1730, lvOffset = 1, enemy = "카리브 해적선",
			text = "섬들 사이를 오가는 해적선에 총독이 현상금을 걸었다. 이 해역의 항구에서만 받을 수 있는 일.", coins = 850, fame = 20 },
		{ id = "baltic_privateer", kind = "hunt", tag = "역사", name = "대북방전쟁 발트해 사략선", ports = { "stockholm", "riga", "tallinn", "gdansk", "koenigsberg", "copenhagen" }, from = 1700, to = 1721, lvOffset = 1, enemy = "발트해 사략선",
			text = "대북방전쟁이 한창인 발트해. 교역선을 괴롭히는 사략선을 잡으면 항구 상인들이 사례한다.", coins = 800, fame = 20 },
		-- ===== 납품 의뢰 (그 항구가 지금 필요한 것) =====
		{ id = "london_rebuild", kind = "deliver", tag = "역사", name = "런던 재건 목재", ports = { "london" }, from = 1666, to = 1672, good = "timber", amount = 8, coins = 900, fame = 20,
			text = "큰불이 번진 뒤, 도시를 벽돌과 석조로 다시 짓는 중이다. 건축 목재가 모자란다." },
		{ id = "venice_galley_repair", kind = "deliver", tag = "역사", name = "갤리선 수리용 철", ports = { "venice" }, from = 1571, to = 1600, good = "iron", amount = 6, coins = 700, fame = 15,
			text = "해전이 끝난 뒤 조선소가 갤리선을 대량으로 수리한다. 못과 보강재용 철이 필요하다." },
		{ id = "lisbon_quake_relief", kind = "deliver", tag = "역사", name = "리스본 복구 구호물자", ports = { "lisbon" }, from = 1755, to = 1762, good = "timber", amount = 10, coins = 500, fame = 45,
			text = "지진과 해일과 화재가 도시를 덮쳤다. 임시 가옥을 짓는 목재가 급하다. 돈보다 이름을 남기는 일." },
		{ id = "glasgow_sugar", kind = "deliver", tag = "지역", name = "글래스고 설탕 정제소", ports = { "glasgow" }, from = 1700, to = 1800, good = "sugar", amount = 8, coins = 800, fame = 14,
			text = "서인도 무역으로 번창하는 항구의 정제소가 원당을 찾는다." },
		{ id = "dejima_sugar", kind = "deliver", tag = "역사", name = "데지마 상관의 설탕", ports = { "nagasaki" }, from = 1650, to = 1830, good = "sugar", amount = 6, coins = 850, fame = 16,
			text = "바다 위 인공섬의 네덜란드 상관이 일본 상인에게 팔 설탕을 모은다." },
		{ id = "canton_silver", kind = "deliver", tag = "지역", name = "광저우 상관의 은", ports = { "canton", "macau" }, from = 1700, to = 1830, good = "silver", amount = 4, coins = 1100, fame = 18,
			text = "차와 도자기를 사 가려는 서양 상인들이 은을 모은다. 은이 귀한 철이다." },
		{ id = "goa_cloth", kind = "deliver", tag = "지역", name = "코로만델 직물 맞교환", ports = { "goa", "calicut", "cochin", "madras" }, from = 1600, to = 1800, good = "cloth", amount = 8, coins = 750, fame = 12,
			text = "인도 서해안 상인이 유럽산 모직과 맞바꿀 후추를 내놓는다. 직물을 넘기면 값을 쳐 준다." },
		{ id = "amsterdam_herring", kind = "deliver", tag = "지역", name = "암스테르담 청어 절임 소금", ports = { "amsterdam" }, from = 1600, to = 1750, good = "salt", amount = 10, coins = 600, fame = 10,
			text = "북해 청어잡이를 뒷받침하는 소금 공급이 달린다. 소금을 대면 선주 조합이 보상한다." },
		-- ===== 주점 이벤트 (선택) =====
		{ id = "south_sea_bubble", kind = "event", tag = "역사", name = "남해회사 투자 권유", ports = { "london" }, from = 1719, to = 1721,
			text = "주점마다 남해회사 주식 이야기뿐이다. 옆자리 신사가 '지금이 기회'라며 투자를 권한다.",
			choices = {
				{ label = "크게 투자한다 (-300)", hint = "절반은 큰 이익, 절반은 큰 손실", cost = 300, chance = { p = 0.45, win = { coins = 900, fame = 5, text = "값이 오르는 걸 보고 때맞춰 빠져나왔다." }, lose = { coins = 0, fame = 0, text = "거품이 꺼지자 투자금이 사라졌다." } } },
				{ label = "소문만 듣는다", hint = "명성 +3", fame = 3, text = "'남의 잔치'라 여기고 술잔만 비웠다. 몇 달 뒤 소문대로 되었다." },
			} },
		{ id = "scilly_wreck_news", kind = "event", tag = "역사", name = "스킬리 해역 난파 소식", ports = { "plymouth" }, from = 1707, to = 1708,
			text = "주점이 술렁인다. 안개 속에서 함대 여러 척이 섬 근처 암초에 부딪혔다는 소식이다. 항해사들이 경도 측정법을 두고 언성을 높인다.",
			choices = {
				{ label = "유가족 구호금을 보탠다 (-120)", hint = "명성 +18", cost = 120, fame = 18, text = "선원 가족들에게 구호금을 전했다." },
				{ label = "암초 위치를 해도에 적어 둔다", hint = "명성 +8, +60코인", coins = 60, fame = 8, text = "소문의 위치를 해도에 표시해 두었다. 다른 선장이 사례했다." },
			} },
		{ id = "plague_rumor", kind = "event", tag = "역사", name = "역병이 돈다는 소문", ports = { "london", "amsterdam" }, from = 1664, to = 1666,
			text = "항구 한쪽에서 역병이 번진다는 소문이 돈다. 선원들이 출항을 서두른다.",
			choices = {
				{ label = "선원들에게 약초술을 산다 (-80)", hint = "명성 +10", cost = 80, fame = 10, text = "약초주머니를 나눠 주었다. 선원들이 고마워했다." },
				{ label = "소문을 무시하고 거래한다", hint = "50%: +300코인 / 50%: -150", chance = { p = 0.5, win = { coins = 300, fame = 0, text = "붐비는 시장 덕분에 이문을 남겼다." }, lose = { coins = -150, fame = 0, text = "병이 돈다는 말에 거래가 끊겼다." } } },
			} },
		{ id = "jenkins_ear_rumor", kind = "event", tag = "역사", name = "잘린 귀 이야기", ports = { "cadiz", "plymouth", "london", "cartagena" }, from = 1738, to = 1740,
			text = "한 선장이 스페인 순찰선에 귀를 잘렸다며 병에 담은 귀를 보여 준다. 전쟁을 부르자는 목소리가 높아진다.",
			choices = {
				{ label = "전쟁 물자를 미리 사 둔다 (-200)", hint = "+350코인", cost = 200, coins = 350, text = "전쟁 소문에 값이 오르는 물자를 선점했다." },
				{ label = "중재에 나선다", hint = "명성 +15", fame = 15, text = "주점 사람들을 진정시켰다는 평이 퍼졌다." },
			} },
		{ id = "tulip_talk", kind = "event", tag = "역사", name = "구근 한 알이 집 한 채", ports = { "amsterdam" }, from = 1650, to = 1655,
			text = "몇 해 전 튤립 구근 값이 천정부지로 뛰었다 폭락한 얘기를 늙은 상인이 들려 준다. 다시 오를 것이라 믿는 이도 있다.",
			choices = {
				{ label = "늙은 상인에게 한턱 낸다 (-60)", hint = "명성 +8", cost = 60, fame = 8, text = "경험담을 들으며 '투기를 조심하라'는 말을 가슴에 새겼다." },
				{ label = "구근에 소액 투자한다 (-100)", hint = "40%: +400 / 60%: 손실", cost = 100, chance = { p = 0.4, win = { coins = 400, fame = 0, text = "운 좋게 사 줄 사람이 나타났다." }, lose = { coins = 0, fame = 0, text = "구근이 그대로 주저앉았다." } } },
			} },
		{ id = "dejima_tales", kind = "event", tag = "지역", name = "나가사키의 소문", ports = { "nagasaki" }, from = 1650, to = 1830,
			text = "외국인에게 허락된 작은 인공섬 이야기와 쇄국 속 서양 책 이야기가 오간다. 난학을 배우려는 통사(통역관)가 말을 건다.",
			choices = {
				{ label = "책 몇 권을 사 준다 (-90)", hint = "명성 +12", cost = 90, fame = 12, text = "통사가 고마워하며 지리서를 한 권 안겨 주었다." },
				{ label = "무역 소문만 모은다", hint = "+60코인", coins = 60, text = "항로와 가격 소문을 적어 두었다." },
			} },
		{ id = "tavern_brawl", kind = "event", tag = "주점", name = "선원들의 주먹다짐", region = "europe", from = 1600, to = 1830,
			text = "다른 배 선원들과 우리 배 선원이 시비가 붙었다. 주인이 말려 달라며 눈짓한다.",
			choices = {
				{ label = "술값을 대신 낸다 (-60)", hint = "명성 +5", cost = 60, fame = 5, text = "소동이 가라앉고 주인이 고마워했다." },
				{ label = "직접 나서서 말린다", hint = "60%: 명성 +12 / 40%: -50코인", chance = { p = 0.6, win = { coins = 0, fame = 12, text = "한마디에 모두 물러났다." }, lose = { coins = -50, fame = 0, text = "멱살을 잡혔다가 술잔을 변상했다." } } },
			} },
		{ id = "map_peddler", kind = "event", tag = "주점", name = "수상한 지도 장수", region = "indian", from = 1600, to = 1830,
			text = "낯선 이가 '아무도 모르는 섬이 그려진 해도'라며 속삭인다. 조금 수상하다.",
			choices = {
				{ label = "해도를 산다 (-150)", hint = "50%: 명성 +25 / 50%: 가짜", cost = 150, chance = { p = 0.5, win = { coins = 0, fame = 25, text = "진짜 같은 해안선이었다. 항해사들이 감탄했다." }, lose = { coins = 0, fame = 0, text = "알고 보니 베낀 해도였다." } } },
				{ label = "돌려보낸다", hint = "명성 +2", fame = 2, text = "정중히 거절했다." },
			} },
	}

	-- 지역 이야기·전설·수상한 손님 의뢰를 같은 표에 합친다
	for _, list in { Data.LOCAL, Data.LEGEND, Data.SHADY } do
		for _, j in list do
			table.insert(JOBS, j)
		end
	end
	-- 그 지역·그 시기에 항구에 들어서면 자동으로 맡는 큰 사건
	for _, id in { "armada_scout", "london_rebuild", "lisbon_quake_relief", "anglo_dutch_privateer", "baltic_privateer" } do
		for _, j in JOBS do
			if j.id == id then
				j.grand = true
			end
		end
	end

	local JOB_BY_ID = {}
	for _, j in JOBS do
		JOB_BY_ID[j.id] = j
	end

	local DRINK_COST = 30
	local function tq(state)
		state.tavernQ = state.tavernQ or {}
		return state.tavernQ
	end

	local function regionOf(state)
		local port = D.Ports.Ports[state.portId]
		return port and D.Regions.of(port).id or nil
	end

	local function here(state, j)
		if j.any then
			return true
		end
		if j.ports then
			return table.find(j.ports, state.portId) ~= nil
		end
		return j.region ~= nil and j.region == regionOf(state)
	end

	local function active(state, j)
		local y = S.State.year(state)
		return y >= j.from and y <= j.to
	end

	local function blockReason(state, j)
		if state.tavernJobs[j.id] then
			return "이미 마친 의뢰예요"
		end
		if j.kind == "hunt" then
			if state.pendingBattle then
				return "해전을 먼저 마무리하세요"
			end
			if state.ship.hull < S.State.shipDef(state).hull * 0.5 then
				return "선체를 수리한 뒤 나서세요"
			end
		elseif j.kind == "deliver" then
			if (state.cargo[j.good] or 0) < j.amount then
				local g = D.Ports.Goods[j.good]
				return string.format("%s %d개가 필요해요 (지금 %d개)", g and g.name or j.good, j.amount, state.cargo[j.good] or 0)
			end
		end
		return nil
	end

	local function view(state)
		local out = {}
		for _, j in JOBS do
			if not j.shady and not j.legend and here(state, j) and active(state, j) then
				local choices
				if j.choices then
					choices = {}
					for _, c in j.choices do
						table.insert(choices, { label = c.label, hint = c.hint, locked = c.cost ~= nil and state.coins < c.cost })
					end
				end
				local g = j.good and D.Ports.Goods[j.good]
				table.insert(out, {
					id = j.id, kind = j.kind, tag = j.tag, name = j.name, text = j.text,
					coins = j.coins, fame = j.fame, good = g and g.name, amount = j.amount, enemy = j.enemy,
					done = state.tavernJobs[j.id] ~= nil, blocked = blockReason(state, j), choices = choices,
				})
			end
		end
		return out
	end

	-- 전투 의뢰를 이겼을 때 보상 (Battle.resolve 가 부른다)
	local function settleHunt(state, jobId, msgs)
		local j = JOB_BY_ID[jobId]
		if not j or state.tavernJobs[jobId] then
			return
		end
		state.tavernJobs[jobId] = state.day
		state.coins += j.coins
		state.fame += j.fame
		local q = tq(state)
		if q.active and q.active.id == jobId then
			q.active = nil
		end
		table.insert(msgs, string.format("의뢰 완수! '%s' — 보상 %d코인, 명성 +%d", j.name, j.coins, j.fame))
	end

	-- 의뢰 전투에서 졌을 때: 수상한 손님 의뢰만 명성이 떨어진다 (일반 의뢰는 벌이 없다)
	local function failHunt(state, jobId, msgs)
		local j = JOB_BY_ID[jobId]
		local q = tq(state)
		if not j or not q.active or q.active.id ~= jobId then
			return
		end
		q.active = nil
		if j.shady then
			local loss = math.min(state.fame, j.failFame or 20)
			state.fame -= loss
			table.insert(msgs, string.format("의뢰 실패. '%s' — 뒷골목에 소문이 돌았다 (명성 -%d)", j.name, loss))
		else
			table.insert(msgs, string.format("의뢰를 마치지 못했다. '%s' — 다음 기회에 (벌은 없어요)", j.name))
		end
	end

	-- 지금 이 항구에서 맡을 수 있는 일반 의뢰 (전투·납품)
	local function easyPool(state)
		local out = {}
		for _, j in JOBS do
			if (j.kind == "hunt" or j.kind == "deliver") and not j.shady and not j.legend and here(state, j) and active(state, j) and not state.tavernJobs[j.id] then
				table.insert(out, j)
			end
		end
		return out
	end
	local function shadyPool(state)
		local out = {}
		for _, j in Data.SHADY do
			if active(state, j) and not state.tavernJobs[j.id] then
				table.insert(out, j)
			end
		end
		return out
	end
	local function draw(list, n, rng)
		local pool, out = table.clone(list), {}
		while #out < n and #pool > 0 do
			table.insert(out, table.remove(pool, math.floor(rng() * #pool) + 1))
		end
		return out
	end
	local function ids(list)
		local out = {}
		for _, j in list do
			table.insert(out, j.id)
		end
		return out
	end

	-- 수상한 손님이 지금 이 주점에 있는가 (항구·날짜로 정해진다: 며칠 머물다 사라진다)
	local function strangerHere(state)
		local h = 0
		for i = 1, #state.portId do
			h = (h * 31 + string.byte(state.portId, i)) % 100003
		end
		h = (h + math.floor(state.day / 4) * 7919) % 100
		return h < 38 and #shadyPool(state) > 0
	end

	-- 기한이 지난 의뢰 정리
	local function expire(state)
		local q = tq(state)
		local a = q.active
		if a and state.day > a.due then
			local j = JOB_BY_ID[a.id]
			q.active = nil
			if j and j.shady then
				local loss = math.min(state.fame, j.failFame or 20)
				state.fame -= loss
				q.note = string.format("기한이 지났다. '%s' 의뢰는 무산됐다 (명성 -%d)", j.name, loss)
			elseif j then
				q.note = string.format("기한이 지났다. '%s' 의뢰는 다른 이에게 넘어갔다 (벌은 없어요)", j.name)
			end
		end
	end

	-- 그 지역·그 연도의 큰 사건은 항구에 들어서면 자동으로 맡는다
	local function autoGrand(state)
		local q = tq(state)
		if q.active then
			return
		end
		for _, j in JOBS do
			if j.grand and here(state, j) and active(state, j) and not state.tavernJobs[j.id] and q.grandSeen ~= j.id .. ":" .. state.portId then
				q.grandSeen = j.id .. ":" .. state.portId
				q.active = { id = j.id, src = "grand", due = state.day + (j.days or 60) }
				q.note = string.format("큰 사건: '%s' — 항구가 술렁인다. 일지에 올렸다.", j.name)
				return
			end
		end
	end

	local function describe(state, j)
		local g = j.good and D.Ports.Goods[j.good]
		return {
			id = j.id, kind = j.kind, tag = j.tag, name = j.name, text = j.text,
			coins = j.coins, fame = j.fame, good = g and g.name, amount = j.amount, enemy = j.enemy,
			shady = j.shady == true, failFame = j.failFame, blocked = blockReason(state, j),
			choices = j.choices and (function()
				local out = {}
				for _, c in j.choices do
					table.insert(out, { label = c.label, hint = c.hint, locked = c.cost ~= nil and state.coins < c.cost })
				end
				return out
			end)() or nil,
		}
	end

	-- 주점 화면: 맡은 의뢰 · 제안 · 수상한 손님 · 소문 이벤트
	local function questView(state)
		expire(state)
		autoGrand(state)
		local q = tq(state)
		local out = { drinkCost = DRINK_COST, stranger = strangerHere(state), note = q.note, offer = {} }
		q.note = nil
		if q.active then
			local j = JOB_BY_ID[q.active.id]
			if j then
				out.active = describe(state, j)
				out.active.src = q.active.src
				out.active.left = math.max(0, q.active.due - state.day)
				out.active.here = here(state, j)
			end
		end
		if q.offer and q.offer.port == state.portId then
			out.offerKind = q.offer.kind
			for _, id in q.offer.ids do
				local j = JOB_BY_ID[id]
				if j then
					table.insert(out.offer, describe(state, j))
				end
			end
		end
		if q.rumorEvent then
			local j = JOB_BY_ID[q.rumorEvent]
			if j and j.kind == "event" and not state.tavernJobs[j.id] and (j.any or here(state, j)) then
				out.rumorEvent = describe(state, j)
			end
		end
		return out
	end

	function handlers.TavernJob(state, p, ctx)
		local j = type(p) == "table" and type(p.id) == "string" and JOB_BY_ID[p.id]
		if not j or not here(state, j) or not active(state, j) then
			return false, "이 항구에는 그런 의뢰가 없어요"
		end
		local block = blockReason(state, j)
		if block then
			return false, block
		end
		if j.kind == "deliver" then
			S.State.removeCargo(state, j.good, j.amount)
			state.coins += j.coins
			state.fame += j.fame
			state.tavernJobs[j.id] = state.day
			local q = tq(state)
			if q.active and q.active.id == j.id then
				q.active = nil
			end
			return true, string.format("'%s' 완수! 보상 %d코인, 명성 +%d", j.name, j.coins, j.fame)
		elseif j.kind == "event" then
			local c = j.choices[type(p.choice) == "number" and math.floor(p.choice) or 0]
			if not c then
				return false, "선택지를 골라 주세요"
			end
			if c.cost and state.coins < c.cost then
				return false, "코인이 모자라요"
			end
			state.tavernJobs[j.id] = state.day
			local q = tq(state)
			if q.active and q.active.id == j.id then
				q.active = nil
			end
			if q.rumorEvent == j.id then
				q.rumorEvent = nil
			end
			local msgs = {}
			if c.cost then
				state.coins -= c.cost
			end
			local text = c.text
			local coins, fame = c.coins or 0, c.fame or 0
			if c.chance then
				local win = ctx.rng() < c.chance.p
				local r = if win then c.chance.win else c.chance.lose
				coins += r.coins or 0
				fame += r.fame or 0
				text = r.text
			end
			state.coins = math.max(0, state.coins + coins)
			state.fame = math.max(0, state.fame + fame)
			table.insert(msgs, text)
			if coins ~= 0 or fame ~= 0 then
				table.insert(msgs, string.format("%s%s", if coins ~= 0 then string.format("코인 %+d", coins) else "", if fame ~= 0 then string.format("%s명성 %+d", if coins ~= 0 then " · " else "", fame) else ""))
			end
			return true, table.concat(msgs, "\n")
		else -- hunt: 실시간 해전으로 이어진다
			state.war = nil
			local msgs = { string.format("의뢰 '%s' 수락", j.name) }
			S.State.advanceDays(state, 1)
			S.Battle.encounter(state, ctx, msgs, true, { lvOffset = j.lvOffset, name = j.enemy, job = j.id })
			return true, table.concat(msgs, "\n")
		end
	end

	local function setOffer(state, kind, list)
		tq(state).offer = { kind = kind, ids = ids(list), port = state.portId, day = state.day }
	end

	-- 술을 사 주면 주인이 일감 두 개를 보여 준다. 아주 가끔은 전설급 의뢰를 먼저 건넨다.
	function handlers.TavernDrink(state, _p, ctx)
		local q = tq(state)
		if q.active then
			return false, "이미 맡은 의뢰가 있어요. 끝내거나 포기한 뒤 오세요"
		end
		if state.coins < DRINK_COST then
			return false, "술값이 모자라요"
		end
		state.coins -= DRINK_COST
		local y = S.State.year(state)
		if ctx.rng() < 0.06 then
			local legends = {}
			for _, j in Data.LEGEND do
				if y >= j.from and y <= j.to and not state.tavernJobs[j.id] then
					table.insert(legends, j)
				end
			end
			if #legends > 0 then
				local j = legends[math.floor(ctx.rng() * #legends) + 1]
				q.active = { id = j.id, src = "legend", due = state.day + (j.days or 40) }
				q.offer = nil
				return true, string.format("주인이 잔을 닦다 말고 목소리를 낮춘다.\n전설 의뢰: '%s'\n%s", j.name, j.text)
			end
		end
		local picks = draw(easyPool(state), 2, ctx.rng)
		if #picks == 0 then
			return true, "주인이 어깨를 으쓱한다. '오늘은 마땅한 일이 없소. 다른 때에 다시 오시오.'"
		end
		setOffer(state, "job", picks)
		return true, "주인이 잔을 채우며 일감을 꺼낸다. '둘 중에 고르시오.' (맡지 않아도 돼요)"
	end

	function handlers.TavernStranger(state, _p, ctx)
		if not strangerHere(state) then
			return false, "구석 자리가 비어 있어요"
		end
		local picks = draw(shadyPool(state), 2, ctx.rng)
		if #picks == 0 then
			return false, "손님이 고개를 젓고 일어선다"
		end
		setOffer(state, "shady", picks)
		return true, "수상한 손님이 맞은편 의자를 가리킨다. '둘 중 하나요. 실패하면 소문이 따라다닐 거요.'"
	end

	function handlers.TavernPick(state, p, ctx)
		local q = tq(state)
		local offer = q.offer
		if not offer or offer.port ~= state.portId then
			return false, "제안이 사라졌어요"
		end
		if q.active then
			return false, "이미 맡은 의뢰가 있어요"
		end
		local id = type(p) == "table" and offer.ids[math.floor(tonumber(p.index) or 0)]
		local j = id and JOB_BY_ID[id]
		if not j then
			return false, "고를 수 있는 의뢰가 아니에요"
		end
		q.active = { id = j.id, src = if j.shady then "shady" else "job", due = state.day + (j.days or 25) }
		q.offer = nil
		local tail = if j.shady then " (실패·포기하면 명성 -" .. tostring(j.failFame or 20) .. ")" else " (실패해도 명성은 그대로예요)"
		return true, string.format("'%s' 의뢰를 맡았다%s", j.name, tail)
	end

	function handlers.TavernDecline(state)
		tq(state).offer = nil
		return true, "손을 저었다"
	end

	function handlers.TavernAbandon(state)
		local q = tq(state)
		if not q.active then
			return false, "맡은 의뢰가 없어요"
		end
		local j = JOB_BY_ID[q.active.id]
		q.active = nil
		if j and j.shady then
			local loss = math.min(state.fame, j.failFame or 20)
			state.fame -= loss
			return true, string.format("의뢰를 접었다. 손님은 아무 말 없이 사라졌다 (명성 -%d)", loss)
		end
		return true, "의뢰를 접었다 (벌은 없어요)"
	end

	-- 주인에게 소문 듣기: 무료. 지역 소식이거나, 선택이 걸린 사건이거나, 때로는 일감으로 이어진다.
	function handlers.TavernRumor(state, _p, ctx)
		local q = tq(state)
		local r = ctx.rng()
		if r < 0.3 then
			local events = {}
			for _, j in JOBS do
				if j.kind == "event" and not j.shady and here(state, j) and active(state, j) and not state.tavernJobs[j.id] then
					table.insert(events, j)
				end
			end
			if #events > 0 then
				local j = events[math.floor(ctx.rng() * #events) + 1]
				q.rumorEvent = j.id
				return true, string.format("주인이 소곤댄다. '%s'\n(선택이 걸린 소식이에요. 아래에서 골라 보세요)", j.name)
			end
		elseif r < 0.5 and not q.active then
			local picks = draw(easyPool(state), 1, ctx.rng)
			if #picks > 0 then
				setOffer(state, "rumor", picks)
				return true, "소문을 듣다 보니 도움이 필요한 사람 이야기가 나왔다. 일감으로 이어질 것 같다."
			end
		end
		local port = D.Ports.Ports[state.portId]
		local rid = port and D.Regions.of(port).id
		local lines = Data.RUMORS[rid] or Data.RUMORS.europe
		return true, "주인이 말한다. \"" .. lines[math.floor(ctx.rng() * #lines) + 1] .. "\""
	end

	-- 같이 다니는 동료와 술잔을 나누며 대화: 호감도가 오르고, 이야기 속에서 일감이 튀어나오기도 한다.
	function handlers.TavernTalk(state, _p, ctx)
		if #state.companions == 0 then
			return false, "함께하는 동료가 없어요"
		end
		local id = state.companions[math.floor(ctx.rng() * #state.companions) + 1]
		local q = tq(state)
		local ok, msg = S.Perk.handlers.Talk(state, { companionId = id }, ctx)
		if not ok then
			return ok, msg
		end
		if not q.active and ctx.rng() < 0.3 then
			local picks = draw(easyPool(state), 1, ctx.rng)
			if #picks > 0 then
				setOffer(state, "talk", picks)
				msg ..= "\n(대화 중 동료가 이 항구의 일감 이야기를 꺼냈다)"
			end
		end
		return true, msg
	end

	return { handlers = handlers, view = view, questView = questView, settleHunt = settleHunt, failHunt = failHunt, jobs = JOBS }
end
