--!nonstrict
-- PlacementOverrides.luau · 자동 배치 보정표 (2026-11-28 오너 지시: 자동 배치·자동 수정)
-- 키 "<그룹>/<이름>" → { scale = 배율, yaw = 도, y = 높이 보정(스터드), disabled = 배치 제외, mobileHide = 폰에서 숨김, reason = 이유 }
-- tools/devloop/placement_autofix.py 가 Studio 자동 점검 결과(크기·무질감·뜸)로 채운다. 사람이 고쳐도 된다.
-- 항구(PortScene)·지상(FieldScene, 발견물 포함)·항해(PortScene.placeModel) 배치 함수가 모두 이 표를 따른다.
local PlacementOverrides = {}

PlacementOverrides.DATA = {
	-- AUTO:BEGIN (placement_autofix.py 가 씀)
	-- AUTO:END
	-- 예: ["Town/lisbon_house_2"] = { scale = 1.2, yaw = 90, y = -0.3 },
}

function PlacementOverrides.get(kind: string, asset: string)
	return PlacementOverrides.DATA[tostring(kind) .. "/" .. tostring(asset)]
end

-- 배치된 모델에 회전·높이 보정을 적용한다(크기는 배치 전에 desired 에 곱한다).
function PlacementOverrides.apply(m, ov)
	if not (m and ov) then return m end
	local pivot = m:GetPivot()
	if ov.y then pivot = pivot + Vector3.new(0, ov.y, 0) end
	if ov.yaw then pivot = pivot * CFrame.Angles(0, math.rad(ov.yaw), 0) end
	m:PivotTo(pivot)
	m:SetAttribute("PlacementOverride", true)
	return m
end

-- [겹침·길 피하기] 자동 슬롯 모델이 다른 건물·길(이름에 Road/Street/Path)과 겹치면 주변 6스터드 안에서 비킨다.
-- 끝까지 겹치면 제자리에 둔다(기존 배치 흐름을 깨지 않음). 결과는 속성 PlacementNudge 로 남긴다.
local function overlapCount(m, cf, size)
	local params = OverlapParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { m }
	local n = 0
	for _, part in workspace:GetPartBoundsInBox(cf, size * 0.8, params) do
		local isPath = string.find(part.Name, "Road", 1, true) or string.find(part.Name, "Street", 1, true) or string.find(part.Name, "Path", 1, true)
		if part.Anchored and (isPath or (part.CanCollide and part.Size.Magnitude > 4 and part.Size.Y > 2)) then n += 1 end
	end
	return n
end

function PlacementOverrides.avoidOverlap(m)
	if not (m and m.Parent) then return end
	local ok, cf, size = pcall(function() return m:GetBoundingBox() end)
	if not ok then return end
	if overlapCount(m, cf, size) == 0 then return end
	local base = m:GetPivot()
	local best, bestN = nil, math.huge
	for _, d in { Vector3.new(4, 0, 0), Vector3.new(-4, 0, 0), Vector3.new(0, 0, 4), Vector3.new(0, 0, -4), Vector3.new(6, 0, 6), Vector3.new(-6, 0, -6), Vector3.new(6, 0, -6), Vector3.new(-6, 0, 6) } do
		local n = overlapCount(m, cf + d, size)
		if n < bestN then best, bestN = d, n end
		if n == 0 then break end
	end
	if best and bestN == 0 then
		m:PivotTo(base + best)
		m:SetAttribute("PlacementNudge", tostring(best))
	end
end

-- [지역색] 문화권 공통 대체 모델을 항구마다 조금 다르게(질감 없는 면만 12% 물들임). 질감·SurfaceAppearance 는 그대로.
function PlacementOverrides.regionTint(m, portId: string)
	local h = 0
	for i = 1, #portId do h = (h * 31 + string.byte(portId, i)) % 360 end
	local tone = Color3.fromHSV(h / 360, 0.25, 0.85)
	for _, d in m:GetDescendants() do
		if d:IsA("BasePart") and not d:FindFirstChildOfClass("SurfaceAppearance") and not (d:IsA("MeshPart") and d.TextureID ~= "") then
			d.Color = d.Color:Lerp(tone, 0.12)
		end
	end
	m:SetAttribute("RegionTint", portId)
end

return PlacementOverrides
