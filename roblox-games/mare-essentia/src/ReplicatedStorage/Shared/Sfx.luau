--!nonstrict
-- 음악·효과음 재생기 (클라이언트). ID는 AudioIds.luau(업로드 워크플로가 기록)에서 읽는다. ID가 없으면 조용히 건너뛴다.

local SoundService = game:GetService("SoundService")
local TweenService = game:GetService("TweenService")

local IDS = require(script.Parent:WaitForChild("AudioIds"))
-- 불러오기에 실패한 소리(권한 미승인·삭제 등)는 건너뛰고 다음 대체 소리를 쓴다
local broken: { [string]: boolean } = {}
local Regions = require(script.Parent:WaitForChild("Regions"))

-- 기본 음량 (0~1)
local VOLUME = {
	music_harbor = 0.7, music_sea = 0.75, music_battle = 0.8, music_market = 0.65,
	sfx_waves = 0.5, sfx_wind = 0.35,
}

local Sfx = {}
local group = Instance.new("SoundGroup")
group.Name = "MareAudio"
group.Parent = SoundService
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
	return s
end

-- 효과음 한 번 (같은 소리는 너무 자주 겹치지 않게 0.05초 간격)
function Sfx.play(name, volume, speed)
	if not sfxOn or not IDS[name] or broken[name] then
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
	s:Play()
	task.delay(math.max(3, s.TimeLength + 1), function()
		s:Destroy()
	end)
end

-- 배경 음악: 같은 곡이면 그대로, 다르면 서서히 바꾼다
function Sfx.currentName()
	return currentName
end

function Sfx.music(name)
	if currentName == name then
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
	if not name or not IDS[name] or broken[name] then
		return
	end
	local s = make(name, musicGroup)
	if not s then
		return
	end
	s.Looped = true
	local target = s.Volume
	s.Volume = 0
	s:Play()
	TweenService:Create(s, TweenInfo.new(2), { Volume = target }):Play()
	currentMusic = s
end


-- 지역·국가·이벤트 선곡은 기존 음악 재생기로만 처리한다.
-- 음원 ID가 실제 등록되지 않은 이름은 반드시 기존 승인된 곡으로 되돌린다.
local function firstReady(...)
	for i = 1, select("#", ...) do
		local name = select(i, ...)
		if name and IDS[name] and not broken[name] then
			return name
		end
	end
	return nil
end

-- 시작하고 잠시 뒤 등록된 소리를 미리 불러와 실패한 이름을 기록한다. 일시적 실패일 수 있어 한 번 더 확인한 뒤에만 막는다.
task.spawn(function()
	task.wait(8)
	local ContentProvider = game:GetService("ContentProvider")
	local function probe(names)
		local failed, byContent, sounds = {}, {}, {}
		for _, name in names do
			local snd = Instance.new("Sound")
			snd.Name = "Probe_" .. name
			snd.SoundId = IDS[name]
			sounds[#sounds + 1] = snd
			byContent[IDS[name]] = name
		end
		pcall(function()
			ContentProvider:PreloadAsync(sounds, function(contentId, status)
				if status ~= Enum.AssetFetchStatus.Success and byContent[contentId] then
					failed[#failed + 1] = byContent[contentId]
				end
			end)
		end)
		for _, snd in sounds do
			snd:Destroy()
		end
		return failed
	end
	local all = {}
	for name in IDS do
		all[#all + 1] = name
	end
	local first = probe(all)
	if #first == 0 then
		return
	end
	task.wait(5)
	for _, name in probe(first) do
		broken[name] = true
		warn("[Sfx] 소리를 불러오지 못해 대체 소리를 씁니다:", name)
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

-- 파도·바람 같은 앰비언트 루프 (names: 목록, nil 이면 끈다)
function Sfx.ambient(names)
	local key = table.concat(names or {}, "|")
	if ambientKey == key then
		return
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
		local s = make(name, sfxGroup)
		if s then
			s.Looped = true
			local target = s.Volume
			s.Volume = 0
			s:Play()
			TweenService:Create(s, TweenInfo.new(1.5), { Volume = target }):Play()
			table.insert(ambient, s)
		end
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
