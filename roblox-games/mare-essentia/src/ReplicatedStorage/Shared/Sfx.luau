--!nonstrict
-- 음악·효과음 재생기 (클라이언트). ID는 AudioIds.luau(업로드 워크플로가 기록)에서 읽는다. ID가 없으면 조용히 건너뛴다.

local SoundService = game:GetService("SoundService")
local TweenService = game:GetService("TweenService")

local IDS = require(script.Parent:WaitForChild("AudioIds"))
-- 불러오기에 실패한 소리(권한 미승인·삭제 등)는 건너뛰고 다음 대체 소리를 쓴다
local broken: { [string]: number } = {} -- 일시적인 로딩 실패만 20초 유예. 영구 음소거 금지
local warned: { [string]: boolean } = {}
local Regions = require(script.Parent:WaitForChild("Regions"))

-- 기본 음량: 지역·스토리 원본의 인코딩 감쇠(0.50~0.64)를 상쇄한다.
-- 기존 음악·효과음의 기본값과 사용자 전체 음량/켜기 설정은 유지한다.
local VOLUME = {
	music_harbor = 0.7, music_sea = 0.75, music_battle = 0.8, music_market = 0.65,
	music_pirate = 0.80,
	music_region_europe = 0.98, music_region_w_africa = 1.08,
	music_region_new_world = 0.98, music_region_indian = 1.05,
	music_region_far_east = 0.98, music_region_pacific = 0.98,
	music_story_tavern = 0.95, music_story_storm = 1.07, music_story_ruins = 1.07,
	music_story_harbor = 1.00, music_story_palace = 1.08,
	music_history_war = 1.02, music_history_trade = 0.95,
	music_history_exploration = 0.95, music_history_discovery = 0.95,
	music_history_disaster = 1.10,
	music_wonder_temple = 1.12, music_wonder_nature = 1.07,
	music_quest_victory = 0.92, music_quest_defeat = 1.04,
	sfx_waves = 0.5, sfx_wind = 0.35,
}

local Sfx = {}
local group = Instance.new("SoundGroup")
group.Name = "MareAudio"
group.Parent = SoundService
group.Volume = 1 -- [공통 믹서] 기본 0.5 감쇠가 하위 음원 전체에 두 번 적용되지 않도록 고정.
local musicGroup = Instance.new("SoundGroup")
musicGroup.Name = "MareMusic"
musicGroup.Parent = group
local sfxGroup = Instance.new("SoundGroup")
sfxGroup.Name = "MareSfx"
sfxGroup.Parent = group

local musicOn, sfxOn = true, true
-- 사용자가 고르는 전체 크기 (기본 1.5배로 키웠다. 0.4 ~ 3.0)
local musicLevel, sfxLevel = 1.5, 1.5
local currentMusic, currentName = nil, nil
local ambient = {}
local ambientKey = nil -- 같은 항구 화면을 다시 그릴 때 환경음을 중복 재생하지 않는다
local lastPlayed = {}

local function make(name, parent)
	local id = IDS[name]
	if not id then
		return nil
	end
	local s = Instance.new("Sound")
	s.Name = name
	s.SoundId = id
	s.Volume = VOLUME[name] or 0.6
	s.SoundGroup = parent
	s.Parent = SoundService
	-- [오디오 실제 로드 진단] Play() 요청만으로는 접근 권한·파일 로딩 성공을 알 수 없다.
	-- 각 음원당 최초 실패 한 번만 기록해 모바일 로그 폭증을 막는다.
	group:SetAttribute("AudioLastRequested", name)
	if not s.IsLoaded then
		s.Loaded:Once(function()
			if not s.Parent then return end
			broken[name] = nil
			group:SetAttribute("AudioLastLoaded", name)
		end)
	end
	task.delay(12, function()
		if s.Parent and not s.IsLoaded then
			broken[name] = os.clock() + 20
			group:SetAttribute("AudioLastFailed", name)
			if not warned[name] then
				warned[name] = true
				warn("[MareAudio] 음원 로드 실패: 권한·게시 Universe·연결 점검:", name, s.SoundId)
			end
		end
	end)
	return s
end

-- 효과음 한 번 (같은 소리는 너무 자주 겹치지 않게 0.05초 간격)
function Sfx.play(name, volume, speed, fallback)
	if not sfxOn then
		return
	end
	-- 신규 해전 음원이 아직 등록되지 않았거나 재생에 실패했으면 기존 승인 효과음을 쓴다.
	if not IDS[name] or (broken[name] and os.clock() < broken[name]) then
		name = fallback
	end
	if not name or not IDS[name] or (broken[name] and os.clock() < broken[name]) then
		return
	end
	local now = os.clock()
	if lastPlayed[name] and now - lastPlayed[name] < 0.05 then
		return
	end
	lastPlayed[name] = now
	local s = make(name, sfxGroup)
	if not s then
		return
	end
	if volume then
		s.Volume = volume
	end
	s.PlaybackSpeed = speed or (0.96 + math.random() * 0.08)
	-- [첫 모바일 터치 효과음] 파일이 늦게 도착했다면 같은 사운드를 다시 재생한다.
	if not s.IsLoaded then
		s.Loaded:Once(function()
			if s.Parent and sfxOn and not s.Playing then s:Play() end
		end)
	end
	s:Play()
	-- [모바일 느린 로딩] 첫 재생은 TimeLength=0일 수 있어 3초 만에 자르지 않는다.
	s.Ended:Once(function() if s.Parent then s:Destroy() end end)
	task.delay(math.max(12, s.TimeLength + 1), function()
		if s.Parent then s:Destroy() end
	end)
end

-- 배경 음악: 같은 곡이면 그대로, 다르면 서서히 바꾼다
-- 방문 시설(탭)별 입장 소리: 교역소·조선소·항구·서고·선장실 등에서 장소 느낌이 나게 한다.
-- 나중에 오는 소리는 task.delay 로 겹치지 않게 늘어놓는다. 등록 전인 소리는 play 가 알아서 건너뛴다.
local FACILITY_CUES = {
	trade = { { "sfx_bell", 0.5 }, { "sfx_coin_pouch", 0.55, 0.25 } },
	yard = { { "sfx_workshop_chop", 0.45 }, { "sfx_rope_pull", 0.35, 0.3 } },
	harbor = { { "sfx_rope_release", 0.35 }, { "sfx_gull", 0.3, 0.2 } },
	scholar = { { "sfx_book_turn", 0.35 }, { "sfx_quest_book_close", 0.25, 0.4 } },
	board = { { "sfx_chart_unfold", 0.3 }, { "sfx_contract_stamp", 0.3, 0.35 } },
	quest = { { "sfx_book_turn", 0.3 } },
	route = { { "sfx_sail_fabric", 0.3 }, { "sfx_waves", 0.2, 0.2 } },
	cards = { { "sfx_card_deal", 0.45, 0, "sfx_book_turn" }, { "sfx_card_page", 0.35, 0.3, "sfx_book_turn" } },
	gwent = { { "sfx_card_deal", 0.5, 0, "sfx_book_turn" } },
	status = { { "sfx_equipment_wear", 0.3 } },
	crew = { { "sfx_ship_cabin_door", 0.3 } },
	recruit = { { "sfx_ship_cabin_door", 0.3 }, { "sfx_deck_step", 0.2, 0.3 } },
	tech = { { "sfx_book_turn", 0.3 }, { "sfx_workshop_chop", 0.2, 0.4 } },
	codex = { { "sfx_book_turn", 0.3 } },
	map = { { "sfx_chart_unfold", 0.3 } },
	explore = { { "sfx_chart_unfold", 0.25 }, { "sfx_gull", 0.2, 0.3 } },
	battle = { { "sfx_metal_clash", 0.35 } },
	war = { { "sfx_horn", 0.35 } },
}
local lastFacility, lastFacilityAt = nil, 0
function Sfx.facilityCue(tabId)
	local cues = FACILITY_CUES[tabId]
	if not cues then
		return
	end
	local now = os.clock()
	if lastFacility == tabId and now - lastFacilityAt < 1.5 then
		return -- 같은 시설 화면을 다시 그릴 때 소리가 반복되지 않게
	end
	lastFacility, lastFacilityAt = tabId, now
	for _, c in cues do
		if c[3] and c[3] > 0 then
			task.delay(c[3], Sfx.play, c[1], c[2], nil, c[4])
		else
			Sfx.play(c[1], c[2], nil, c[4])
		end
	end
end

function Sfx.currentName()
	return currentName
end

function Sfx.music(name)
	-- [음악 재생 복구] 이전 요청이 로드 실패·정지 상태라면 동일 곡도 다시 시도한다.
	if currentName == name and currentMusic and currentMusic.Parent
		and currentMusic.Playing and not (broken[name] and os.clock() < broken[name]) then
		return
	end
	currentName = name
	local old = currentMusic
	currentMusic = nil
	if old then
		local tw = TweenService:Create(old, TweenInfo.new(1.5), { Volume = 0 })
		tw:Play()
		tw.Completed:Connect(function()
			old:Destroy()
		end)
	end
	if not name or not IDS[name] or (broken[name] and os.clock() < broken[name]) then
		return
	end
	local s = make(name, musicGroup)
	if not s then
		return
	end
	s.Looped = true
	local target = s.Volume
	s.Volume = 0
	if not s.IsLoaded then
		s.Loaded:Once(function()
			if s.Parent and currentMusic == s and not s.Playing then s:Play() end
		end)
	end
	s:Play()
	TweenService:Create(s, TweenInfo.new(2), { Volume = target }):Play()
	currentMusic = s
	-- [배경음 자동 복구] 12초에 로딩 실패로 20초 유예된 음원을 22초에 즉시 재요청하면
	-- 유예에 막혀 currentMusic만 사라지고 영구 무음이 된다. 유예 만료 후 같은 곡일 때만 복구한다.
	task.delay(22, function()
		if currentMusic ~= s or currentName ~= name or not s.Parent or s.IsLoaded then return end
		local retryAfter = math.max(0, (broken[name] or 0) - os.clock()) + 0.2
		task.delay(retryAfter, function()
			if currentMusic == s and currentName == name and s.Parent and not s.IsLoaded then
				currentName = nil
				Sfx.music(name)
			end
		end)
	end)
end


-- 지역·국가·이벤트 선곡은 기존 음악 재생기로만 처리한다.
-- 음원 ID가 실제 등록되지 않은 이름은 반드시 기존 승인된 곡으로 되돌린다.
local function firstReady(...)
	for i = 1, select("#", ...) do
		local name = select(i, ...)
		if name and IDS[name] and (not broken[name] or os.clock() >= broken[name]) then
			return name
		end
	end
	return nil
end

-- [재생 회복] 로딩 중·일시 통신 실패를 영구 결함으로 기록하지 않는다.
-- 핵심 배경음/효과음부터 먼저 확인한다. 실패가 반복돼도 20초 뒤 다시 재시도 가능하다.
-- 전체 100개 자산을 동시에 프리로드해 모바일 오디오 스트림을 막는 동작은 피한다.
task.spawn(function()
	task.wait(3)
	local ContentProvider = game:GetService("ContentProvider")
	local priority = { "music_harbor", "music_sea", "music_battle", "sfx_wind", "sfx_waves",
		"sfx_card_swing", "sfx_rope_release", "sfx_card_volley", "sfx_card_fire",
		"sfx_hit", "sfx_metal_clash", "sfx_click" }
	for _, name in priority do
		local id = IDS[name]
		if id then
			local sound = Instance.new("Sound")
			sound.Name = "MareAudioPreload"
			sound.SoundId = id
			sound.Parent = SoundService
			local failed = false
			local ok = pcall(function()
				ContentProvider:PreloadAsync({ sound }, function(contentId, status)
					if contentId == id and status ~= Enum.AssetFetchStatus.Success then failed = true end
				end)
			end)
			sound:Destroy()
			if not ok or failed then
				broken[name] = os.clock() + 20
				if not warned[name] then
					warned[name] = true
					warn("[MareAudio] 원본 음원 로딩 실패, 20초 뒤 재시도:", name)
				end
			else
				broken[name] = nil
			end
		end
		task.wait(0.04)
	end
end)

-- 현재 항구의 나라 → 해역 → 기존 항구·교역소 BGM 순으로 적용.
-- 지역별 교역 전용곡이 없으면 이미 승인된 그 해역의 테마곡을 사용한다.
function Sfx.portMusic(port, market)
	if not port then
		Sfx.music(if market then "music_market" else "music_harbor")
		return
	end
	local region = Regions.of(port).id
	local country = tostring(port.country or "")
	local portId = tostring(port.id or "")
	if market then
		Sfx.music(firstReady("music_market_port_" .. portId, "music_market_nation_" .. country,
			"music_market_region_" .. region, "music_region_" .. region, "music_market"))
	else
		Sfx.music(firstReady("music_port_" .. portId, "music_nation_" .. country,
			"music_region_" .. region, "music_harbor"))
	end
end

-- 항구의 지역 환경음도 승인된 ID가 있으면 우선 적용하고, 없으면 기존 파도로 유지한다.
function Sfx.portAmbient(port)
	if not port then
		Sfx.ambient({ "sfx_waves" })
		return
	end
	local region = Regions.of(port).id
	Sfx.ambient({ firstReady("sfx_ambience_port_" .. tostring(port.id or ""),
		"sfx_ambience_nation_" .. tostring(port.country or ""),
		"sfx_ambience_region_" .. region, "sfx_waves") })
end

-- 대사·스토리 장면별 선곡. 해적 사건은 검증된 CC0 원본 기반 음원이 등록되면 우선 사용한다.
function Sfx.storyMusic(ev)
	local art = tostring(ev.art or "harbor")
	local identity = tostring(ev.id or "") .. " " .. tostring(ev.chapter or "")
	if string.find(identity, "pirate", 1, true) or string.find(identity, "해적", 1, true)
		or string.find(identity, "사략", 1, true) then
		return firstReady("music_pirate", "music_battle")
	end
	local base = ({
		tavern = "music_market", storm = "music_battle", palace = "music_harbor",
		library = "music_harbor", observatory = "music_sea", ruins = "music_sea",
		harbor = "music_harbor",
	})[art] or "music_harbor"
	return firstReady("music_story_" .. art, "music_story_nation_" .. tostring(ev.nation or ""), base)
end

function Sfx.storyCue(ev)
	local art = tostring(ev.art or "harbor")
	local base = ({
		tavern = "sfx_creak", storm = "sfx_horn", palace = "sfx_bell",
		library = "sfx_creak", observatory = "sfx_bell", ruins = "sfx_creak",
		harbor = "sfx_horn",
	})[art] or "sfx_bell"
	return firstReady("sfx_story_" .. art, base)
end

-- 실제 역사 사건의 성격으로 전환한다. 게임 이벤트의 날짜·보상·결과는 바꾸지 않는다.
function Sfx.historyMusic(ev)
	local tag = tostring(ev.tag or "")
	if string.find(tag, "전쟁", 1, true) then
		return firstReady("music_history_war", "music_battle")
	elseif string.find(tag, "재난", 1, true) or string.find(tag, "화재", 1, true) then
		return firstReady("music_history_disaster", "music_battle")
	elseif string.find(tag, "무역", 1, true) or string.find(tag, "경제", 1, true) then
		return firstReady("music_history_trade", "music_market")
	elseif string.find(tag, "학문", 1, true) or string.find(tag, "문화", 1, true) then
		return firstReady("music_history_discovery", "music_harbor")
	elseif string.find(tag, "탐험", 1, true) then
		return firstReady("music_history_exploration", "music_sea")
	end
	return firstReady("music_history", "music_sea")
end

function Sfx.historyCue(ev)
	local tag = tostring(ev.tag or "")
	if string.find(tag, "전쟁", 1, true) then
		return firstReady("sfx_event_war", "sfx_cannon")
	elseif string.find(tag, "재난", 1, true) or string.find(tag, "화재", 1, true) then
		return firstReady("sfx_event_danger", "sfx_horn")
	elseif string.find(tag, "탐험", 1, true) or string.find(tag, "발견", 1, true) then
		return firstReady("sfx_event_discovery", "sfx_fanfare")
	elseif string.find(tag, "경제", 1, true) or string.find(tag, "무역", 1, true) then
		return firstReady("sfx_event_trade", "sfx_coin")
	end
	return firstReady("sfx_event_notice", "sfx_bell")
end

-- 전투·의뢰 결과 직후의 짧은 곡 (없으면 항구 곡으로 돌아간다)
function Sfx.questEndMusic(won)
	return firstReady(if won then "music_quest_victory" else "music_quest_defeat", "music_harbor")
end

-- 불가사의 발견 화면의 특별 곡이 없는 동안은 기존 원더 음악을 보존한다.
function Sfx.wonderMusic(mood, fallback)
	return firstReady("music_wonder_" .. tostring(mood or "temple"), fallback, "music_sea")
end

function Sfx.wonderCue(mood, fallback)
	return firstReady("sfx_wonder_" .. tostring(mood or "temple"), fallback, "sfx_bell")
end


-- 교역소 상인 인사: 자막 없이 한 마디만, 지원되는 현지어 음성으로 들려준다.
-- 지원되지 않는 언어는 임의의 가짜 현지어 음성을 만들지 않고 짧은 공용 인사로 대체한다.
-- 오디오 자산 신규 등록 없이 로블록스 기본 AudioTextToSpeech를 사용한다.
local MERCHANT_VOICE = {
	en = { "Welcome!", "1" },
	fr = { "Bienvenue!", "401" },
	de = { "Willkommen!", "201" },
	it = { "Benvenuto!", "301" },
	es = { "¡Bienvenido!", "101" },
	pt = { "Bem-vindo!", "1001" },
	ar = { "أهلاً وسهلاً!", "801" },
	hi = { "नमस्ते!", "601" },
	zh = { "欢迎光临！", "501" },
	ja = { "いらっしゃいませ！", "701" },
	ko = { "어서 오시오!", "901" },
}
local MERCHANT_LANGUAGE = {
	england = "en", scotland = "en", ireland = "en", new_england = "en",
	canada = "en", newfoundland = "en", pennsylvania = "en", carolina = "en",
	jamaica = "en", barbados = "en", australia = "en", tasmania = "en",
	new_zealand = "en", california = "en", pacific_northwest = "en",
	france = "fr", new_france = "fr", louisiana = "fr", mauritius = "fr",
	germany = "de", austria = "de", prussia = "de",
	italy = "it", venice = "it", tuscany = "it", naples = "it", sicily = "it",
	papal = "it", sardinia = "it", corsica = "it",
	spain = "es", new_spain = "es", cuba = "es", hispaniola = "es",
	puerto_rico = "es", new_granada = "es", venezuela = "es", panama = "es",
	rio_de_la_plata = "es", peru = "es", chile = "es", quito = "es",
	canary = "es", mallorca = "es",
	portugal = "pt", brazil = "pt", madeira = "pt", azores = "pt", cape_verde = "pt",
	portuguese_india = "pt", macau = "zh", sao_tome = "pt", angola = "pt",
	egypt = "ar", morocco = "ar", algeria = "ar",
	tunisia = "ar", tripoli = "ar", hejaz = "ar", yemen = "ar",
	oman = "ar", levant = "ar",
	china = "zh", japan = "ja", korea = "ko",
}
local lastMerchantVoiceAt = -100
local activeMerchantVoice = nil

function Sfx.merchantGreeting(port)
	if not sfxOn or not port or os.clock() - lastMerchantVoiceAt < 12 then
		return
	end
	local language = MERCHANT_LANGUAGE[tostring(port.country or "")] or "en"
	local phrase = MERCHANT_VOICE[language]
	lastMerchantVoiceAt = os.clock()
	-- 음성 요청량과 중복 재생을 억제한다. 기존 효과음 음량 설정을 그대로 따른다.
	if activeMerchantVoice then
		activeMerchantVoice.speech:Destroy()
		activeMerchantVoice.output:Destroy()
		activeMerchantVoice = nil
	end
	local ok = pcall(function()
		local speech = Instance.new("AudioTextToSpeech")
		speech.Name = "MareMerchantGreeting"
		speech.Text = phrase[1]
		speech.VoiceId = phrase[2]
		speech.AutoLocalize = false -- 입항한 지역의 음성 언어를 유지
		speech.Volume = math.clamp(sfxLevel * 0.30, 0, 0.85)
		speech.Parent = SoundService

		local output = Instance.new("AudioDeviceOutput")
		output.Name = "MareMerchantOutput"
		output.Parent = SoundService

		local wire = Instance.new("Wire")
		wire.SourceInstance = speech
		wire.TargetInstance = output
		wire.Parent = speech

		local playing = { speech = speech, output = output }
		activeMerchantVoice = playing
		local function finish()
			if activeMerchantVoice == playing then
				activeMerchantVoice = nil
			end
			speech:Destroy()
			output:Destroy()
		end
		speech.Ended:Once(finish)
		speech:Play()
		task.delay(8, function()
			if speech.Parent then
				finish()
			end
		end)
	end)
	if not ok and activeMerchantVoice then
		activeMerchantVoice.speech:Destroy()
		activeMerchantVoice.output:Destroy()
		activeMerchantVoice = nil
	end
end

-- 파도·바람 같은 앰비언트 루프. 해전 중에는 gain으로 배경음을 낮춰 포격을 가리지 않는다.
-- names: 목록, nil 이면 끈다. 기본 1은 기존 항구·항해의 음량을 그대로 보존한다.
function Sfx.ambient(names, gain)
	local level = math.clamp(tonumber(gain) or 1, 0, 1)
	local key = table.concat(names or {}, "|") .. ":" .. string.format("%.2f", level)
	if ambientKey == key and #ambient > 0 then
		local audible = false
		for _, track in ambient do
			if track.Parent and track.Playing then audible = true break end
		end
		if audible then return end
	end
	ambientKey = key
	for _, s in ambient do
		local tw = TweenService:Create(s, TweenInfo.new(1.2), { Volume = 0 })
		tw:Play()
		tw.Completed:Connect(function()
			s:Destroy()
		end)
	end
	ambient = {}
	for _, name in names or {} do
		local s = if not broken[name] or os.clock() >= broken[name] then make(name, sfxGroup) else nil
		if s then
			s.Looped = true
			local target = s.Volume * level
			s.Volume = 0
			if not s.IsLoaded then
				s.Loaded:Once(function()
					if s.Parent and ambientKey == key and not s.Playing then s:Play() end
				end)
			end
			s:Play()
			TweenService:Create(s, TweenInfo.new(1.5), { Volume = target }):Play()
				table.insert(ambient, s)
			-- [환경음 자동 복구] 로딩 실패 뒤에도 같은 날씨가 이어지면 22초마다 복구를 재시도한다.
			task.delay(22, function()
				if ambientKey == key and s.Parent and not s.IsLoaded then
					ambientKey = nil
					Sfx.ambient(names, gain)
				end
			end)
		end
	end
	-- [모든 환경음 로딩 실패] 초기 20초 유예에도 날씨가 그대로라면 다음 호출이 없어 영구 무음이 되던 문제를 복구한다.
	if names and #names > 0 and #ambient == 0 then
		task.delay(21, function()
			if ambientKey == key and #ambient == 0 then
				ambientKey = nil
				Sfx.ambient(names, gain)
			end
		end)
	end
end

musicGroup.Volume = musicLevel
sfxGroup.Volume = sfxLevel

function Sfx.setMusicEnabled(on)
	musicOn = on
	musicGroup.Volume = if on then musicLevel else 0
end

function Sfx.setSfxEnabled(on)
	sfxOn = on
	sfxGroup.Volume = if on then sfxLevel else 0
	if activeMerchantVoice then
		activeMerchantVoice.speech.Volume = if on then math.clamp(sfxLevel * 0.30, 0, 0.85) else 0
	end
end

-- 음량 단계 조절 (dir: +1 크게, -1 작게). 바뀐 크기를 돌려준다.
function Sfx.stepMusic(dir)
	musicLevel = math.clamp(math.floor((musicLevel + dir * 0.3) * 10 + 0.5) / 10, 0.4, 3.0)
	if musicOn then
		musicGroup.Volume = musicLevel
	end
	return musicLevel
end

function Sfx.stepSfx(dir)
	sfxLevel = math.clamp(math.floor((sfxLevel + dir * 0.3) * 10 + 0.5) / 10, 0.4, 3.0)
	if sfxOn then
		sfxGroup.Volume = sfxLevel
		if activeMerchantVoice then
			activeMerchantVoice.speech.Volume = math.clamp(sfxLevel * 0.30, 0, 0.85)
		end
	end
	return sfxLevel
end

function Sfx.levels()
	return musicLevel, sfxLevel
end

-- 지금 흐르는 배경 음악 이름 (연출이 끝난 뒤 되돌리는 데 쓴다)
function Sfx.current()
	return currentName
end

function Sfx.state()
	return musicOn, sfxOn
end

return Sfx
