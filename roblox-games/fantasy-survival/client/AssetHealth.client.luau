--!nonstrict
-- 화면 자산 점검: 플레이어 화면(PlayerGui)의 아이콘·이미지가 실제로 불러와지는지 미리 불러 보고, 실패한 ID 를 경고로 남긴다.
-- 경고는 "마력숲 자산점검" 으로 시작하며, DevReport 가 서버로 보내고 tools/fantasy-asset-health.mjs 가 읽어 원인 목록을 만든다.
local ContentProvider = game:GetService("ContentProvider")
local Players = game:GetService("Players")

local player = Players.LocalPlayer
if not player then
	return
end

local MAX_LISTED = 30

local function scan(label)
	local gui = player:FindFirstChildOfClass("PlayerGui")
	if not gui then
		return
	end
	local targets, seen = {}, {}
	for _, d in ipairs(gui:GetDescendants()) do
		if d:IsA("ImageLabel") or d:IsA("ImageButton") then
			local img = d.Image
			if type(img) == "string" and string.find(img, "rbxassetid://", 1, true) and not seen[img] then
				seen[img] = true
				table.insert(targets, d)
			end
		end
	end
	if #targets == 0 then
		return
	end
	local failed = {}
	local ok = pcall(function()
		ContentProvider:PreloadAsync(targets, function(contentId, status)
			if status == Enum.AssetFetchStatus.Failure or status == Enum.AssetFetchStatus.TimedOut then
				if #failed < MAX_LISTED then
					table.insert(failed, contentId)
				end
			end
		end)
	end)
	if not ok then
		return
	end
	if #failed > 0 then
		warn("마력숲 자산점검 " .. label .. " 실패 " .. #failed .. "/" .. #targets .. ": " .. table.concat(failed, ","))
	else
		print("마력숲 자산점검 " .. label .. " 이상 없음 " .. #targets)
	end
end

task.spawn(function()
	task.wait(15)
	scan("15s")
	task.wait(45)
	scan("60s")
end)
