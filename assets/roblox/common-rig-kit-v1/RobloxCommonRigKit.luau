--!nonstrict
-- RobloxCommonRigKit: 뼈(Bone) 리그 몹의 자세·모션·표현 공용 규칙. 새 도형이나 파츠를 만들지 않는 순수 계산 모듈이다.
-- 마력숲에서 실제로 부딪힌 문제(거꾸로 선 사슴, T자 팔, 늑대 로봇 걸음, 변종에 새는 전용 모션)에서 뽑은 규칙이며,
-- 게임별 소스에서 이 함수들을 불러 쓰도록 바이브 소스 작성기가 읽는다. 표시 전용이고 판정·저장·AI와 무관하다.
local Kit = {}

-- 뼈 이름 정규화: 소문자, '.' '_' 공백 제거 (UpperArm.L -> upperarml)
function Kit.Normalize(name)
	return (string.lower(name):gsub("[%._%s]", ""))
end

-- 모델 안의 모든 Bone을 정규화한 이름으로 모은다.
function Kit.CollectBones(model)
	local bones = {}
	for _, descendant in ipairs(model:GetDescendants()) do
		if descendant:IsA("Bone") then
			bones[Kit.Normalize(descendant.Name)] = descendant
		end
	end
	return bones
end

-- 리그 가족 표(생성 구간: 원본은 rig-families.json)
-- BEGIN GENERATED FAMILIES (tools/vibe-rig-kit.mjs --emit, 직접 수정 금지)
Kit.Families = {
	{ id = "quadruped", all = {}, any = {"frontupperlegl", "frontuplegl", "backupperlegl", "backuplegl"} },
	{ id = "biped", all = {"upperarml", "upperarmr", "upperlegl", "upperlegr"}, any = {} },
	{ id = "snake", all = {"head", "tail", "chest", "body"}, any = {} },
	{ id = "winged", all = {}, any = {"wing1l", "wing1r", "wingl", "wingr"} },
	{ id = "chain", all = {"body1", "body2"}, any = {} },
	{ id = "simple", all = {"body", "head"}, any = {} },
}
-- END GENERATED FAMILIES

-- 뼈 이름 신호로 가족을 판정한다. 맞는 가족이 없으면 "static"(뼈 모션 없음).
function Kit.Classify(bones)
	for _, family in ipairs(Kit.Families) do
		local okAll = true
		for _, name in ipairs(family.all) do
			if not bones[name] then okAll = false break end
		end
		local okAny = #family.any == 0
		for _, name in ipairs(family.any) do
			if bones[name] then okAny = true break end
		end
		if okAll and okAny then return family.id end
	end
	return "static"
end

-- [자세 판정] 모델 크기 비율이 아니라 뼈 위치로 '위쪽'을 구한다: 발·정강이 뼈 평균에서 몸통 뼈 평균으로 향하는 방향이 위다.
-- 모델이 눕거나 거꾸로 임포트됐을 때 X축으로 돌려 세울 각도(라디안)를 돌려준다. 이미 서 있으면 0.
-- 다리 뼈가 없으면 nil(뱀·거미 등은 머리 위치 같은 다른 신호를 써야 한다).
function Kit.UpPitch(bones)
	local feet, torso, fc, tc = Vector3.zero, Vector3.zero, 0, 0
	for name, bone in pairs(bones) do
		if string.find(name, "lowerleg", 1, true) or string.find(name, "lowleg", 1, true) or string.find(name, "foot", 1, true) then
			feet += bone.WorldPosition
			fc += 1
		elseif name == "body" or name == "hips" or name == "back" or name == "torso" or name == "torso2" or name == "spine" or name == "chest" or name == "abdomen" then
			torso += bone.WorldPosition
			tc += 1
		end
	end
	if fc == 0 or tc == 0 then return nil end
	local up = (torso / tc) - (feet / fc)
	if up.Magnitude < 0.05 then return 0 end
	up = up.Unit
	local pitch = math.atan2(-up.Z, up.Y)
	if math.abs(pitch) > 0.35 then return pitch end
	return 0
end

-- [뼈 포즈] 뼈의 로컬 축 방향과 상관없이 '모델(피벗) 기준 회전'을 넣는다.
-- 피벗 공간에서 앞은 -Z, 위는 +Y. X 회전이 +면 늘어진 팔다리가 앞으로 흔들리고 서 있는 몸은 뒤로 젖혀진다(-면 숙인다).
-- 호출 순서: poser = Kit.MakePoser(model, bones); 매 프레임 poser.Set("upperarml", CFrame.Angles(0.5,0,0), alpha)
function Kit.MakePoser(model, bones)
	local inverse = model:GetPivot():Inverse()
	local rest, current = {}, {}
	for name, bone in pairs(bones) do
		rest[name] = (inverse * (bone.WorldCFrame * bone.Transform:Inverse())).Rotation
		current[name] = CFrame.identity
	end
	local poser = {}
	function poser.Set(name, rotation, alpha)
		local bone = bones[name]
		if not bone then return end
		local target = rest[name]:Inverse() * rotation * rest[name]
		current[name] = current[name]:Lerp(target, alpha)
		bone.Transform = current[name]
	end
	return poser
end

-- 보행 위상: 이동 거리에 비례해 올린다(제자리 발구름 방지). height는 몹 키(스터드).
function Kit.AdvancePhase(phase, movedStuds, height)
	return phase + movedStuds / math.max(2, height * 1.05)
end

-- 대각 트로트: 앞다리 한 쌍과 반대편 뒷다리가 같은 위상. 무릎은 앞으로 나올 때만 접는다.
function Kit.TrotLeg(phase, side, amplitude)
	local sign = if side == "l" then 1 else -1
	local swing = math.sin(phase * math.pi * 2) * amplitude * sign
	local bend = -amplitude * math.max(0, math.sin(phase * math.pi * 2 + 0.9 + (if side == "l" then 0 else math.pi)))
	return swing, bend
end

-- 몹 성격: 같은 종이어도 개체마다 보폭·속도·두리번 주기가 달라 군집이 로봇처럼 보이지 않게 한다. seed는 위치 해시 등 고정 값.
function Kit.Personality(seed)
	local function roll(n) return ((seed * (n * 7919 + 13)) % 1000) / 1000 end
	return {
		stride = 0.9 + roll(1) * 0.2,
		tempo = 0.92 + roll(2) * 0.16,
		lookPeriod = 3 + roll(3) * 4,
		sway = 0.8 + roll(4) * 0.4,
	}
end

-- 전용 모션 격리: 늑대 질주·울음 같은 종 전용 동작이 변종 모델(거미·오크 등)로 새지 않게, 변종은 Variant 속성이 있다.
-- 종 전용 동작은 Variant가 nil이거나 허용 목록에 있을 때만 켠다.
function Kit.SpeciesMotionAllowed(model, allowedVariants)
	local variant = model:GetAttribute("Variant")
	if variant == nil then return true end
	return allowedVariants ~= nil and allowedVariants[variant] == true
end

-- 공격 패턴 이름 -> 이펙트 계열. 색·모양을 계열로 나눠 모든 몹이 같은 초록 섬광이 되지 않게 한다.
local PATTERN_FAMILY = {
	{ "BANDIT_", "blade" }, { "WAR_AXE", "blade" }, { "FOCUS_STRIKE", "blade" },
	{ "GHOST_", "spirit" }, { "PHANTOM_", "spirit" },
	{ "DIVE", "dive" }, { "WING_", "dive" }, { "BAT_", "dive" }, { "BEE_", "dive" },
	{ "WOLF_", "bite" }, { "LEAP_BITE", "bite" }, { "BOAR_", "charge" },
	{ "ARCANE_", "arcane" }, { "BRUTE_", "heavy" }, { "GOLEM_", "boss" },
	{ "CROSSBOW_", "shot" },
}
function Kit.PatternFamily(pattern)
	for _, row in ipairs(PATTERN_FAMILY) do
		if string.find(pattern or "", row[1], 1, true) then return row[2] end
	end
	return "generic"
end

-- 변종 색칠 순서: 큰 조각=몸통, 둘째=배·얼굴(밝게), 작은 조각=발·귀·꼬리(어둡게). 이름에 eye/horn/tooth/claw가 있으면 따로 처리한다.
function Kit.ToneForRank(base, rank)
	if rank == 2 then return base:Lerp(Color3.fromRGB(220, 208, 186), 0.38) end
	if rank >= 4 then return base:Lerp(Color3.fromRGB(34, 28, 26), 0.30) end
	return base
end

return Kit
