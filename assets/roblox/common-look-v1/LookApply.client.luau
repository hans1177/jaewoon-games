--!nonstrict
-- [룩 자동 적용] 비주얼 래더 룩 관리자(tools/vibe-look-govern.mjs)가 정한 프리셋을 게임에 입힌다.
-- 원본: assets/roblox/common-look-v1/LookApply.client.luau (게임 StarterPlayer 폴더에 같은 내용으로 복사해 쓴다).
-- Shared.LookAssignment.Preset 이 nil 이면 아무것도 하지 않는다(게임 원래 연출 그대로). 게임이 만든 안개·블룸 등은 건드리지 않는다.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local shared = ReplicatedStorage:WaitForChild("Shared", 10)
if not shared then
	return
end
local assignModule = shared:WaitForChild("LookAssignment", 10)
local common = shared:FindFirstChild("Common")
local kitModule = common and common:FindFirstChild("RobloxCommonLookKit")
if not assignModule or not kitModule then
	return
end
local okAssign, assign = pcall(require, assignModule)
if not okAssign or type(assign) ~= "table" or type(assign.Preset) ~= "string" then
	return
end
local okKit, Kit = pcall(require, kitModule)
if not okKit or type(Kit) ~= "table" then
	return
end
Kit.Apply(assign.Preset, { duration = 2, respectGameEffects = true })
