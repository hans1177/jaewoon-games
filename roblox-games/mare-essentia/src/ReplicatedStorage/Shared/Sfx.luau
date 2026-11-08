--!nonstrict
-- 음악·효과음 재생기 (클라이언트). ID는 AudioIds.luau(업로드 워크플로가 기록)에서 읽는다. ID가 없으면 조용히 건너뛴다.

local SoundService = game:GetService("SoundService")
local TweenService = game:GetService("TweenService")

local IDS = require(script.Parent:WaitForChild("AudioIds"))

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
	if not sfxOn or not IDS[name] then
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
	if not name or not IDS[name] then
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

-- 파도·바람 같은 앰비언트 루프 (names: 목록, nil 이면 끈다)
function Sfx.ambient(names)
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
	end
	return sfxLevel
end

function Sfx.levels()
	return musicLevel, sfxLevel
end

function Sfx.state()
	return musicOn, sfxOn
end

return Sfx
