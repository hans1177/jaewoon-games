--!nonstrict
-- 클라이언트 오류·경고와 평균 프레임 속도를 서버(DevTelemetry)로 보낸다. 개인정보 없음.
local LogService = game:GetService("LogService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

if RunService:IsStudio() then
	return
end
local remote = ReplicatedStorage:WaitForChild("DevReport", 30)
if not remote then
	return
end

local sent = 0
LogService.MessageOut:Connect(function(text, kind)
	if sent >= 20 then
		return
	end
	if kind == Enum.MessageType.MessageError then
		sent += 1
		remote:FireServer("error", text)
	elseif kind == Enum.MessageType.MessageWarning and string.find(text, "마력숲", 1, true) then
		sent += 1
		remote:FireServer("warn", text)
	end
end)

task.spawn(function()
	while true do
		local frames, t0 = 0, os.clock()
		local conn = RunService.RenderStepped:Connect(function()
			frames += 1
		end)
		task.wait(20)
		conn:Disconnect()
		local dt = os.clock() - t0
		if dt > 0 and frames > 0 then
			remote:FireServer("fps", frames / dt)
		end
		task.wait(100)
	end
end)
