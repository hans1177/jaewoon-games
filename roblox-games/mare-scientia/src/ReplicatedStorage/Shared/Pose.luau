--!nonstrict
-- 뼈대가 있는 사람 모델의 T자 자세를 풀어 팔을 내린다 (클라이언트 전용).
-- 팔 방향을 월드 좌표로 계산해서, 뼈의 로컬 축 방향과 상관없이 아래쪽으로 돌린다.

local Pose = {}

local function findBone(model, pattern)
	for _, d in model:GetDescendants() do
		if d:IsA("Bone") and string.find(string.lower(d.Name), pattern) then
			return d
		end
	end
	return nil
end

local function lowerArm(upper, lower)
	if not upper or not lower then
		return
	end
	local a = upper.TransformedWorldCFrame
	local b = lower.TransformedWorldCFrame
	local dir = b.Position - a.Position
	if dir.Magnitude < 1e-4 then
		return
	end
	dir = dir.Unit
	local down = Vector3.new(0, -1, 0)
	local dot = math.clamp(dir:Dot(down), -1, 1)
	local angle = math.acos(dot)
	if angle < 0.15 then
		return -- 이미 내려가 있다
	end
	local axis = dir:Cross(down)
	if axis.Magnitude < 1e-4 then
		return
	end
	local turn = CFrame.fromAxisAngle(axis.Unit, angle * 0.88)
	local rot = a.Rotation
	upper.Transform = rot:Inverse() * turn * rot
end

function Pose.relaxArms(model)
	pcall(function()
		for _, side in { "l", "r" } do
			local upper = findBone(model, "upperarm[%._]" .. side)
			local lower = findBone(model, "lowerarm[%._]" .. side)
			lowerArm(upper, lower)
		end
	end)
end

return Pose
