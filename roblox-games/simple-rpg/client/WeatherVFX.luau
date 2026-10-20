--!strict
-- Self-authored particle emitters and weather tint presets permanently removed.
-- Only licensed, uploaded and curated external weather models may be presented.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local Shared = ReplicatedStorage:WaitForChild("Shared")

local WeatherVFX = {}
local current: Model? = nil
local currentWeather = "Clear"

local function clearVisual(): ()
    if current then
        current:Destroy()
        current = nil
    end
end

RunService.RenderStepped:Connect(function()
    if not current then return end
    local camera = Workspace.CurrentCamera
    if camera then
        if current.Parent ~= camera then current.Parent = camera end
        current:PivotTo(camera.CFrame * CFrame.new(0, 3.5, -13))
    end
end)

function WeatherVFX.Apply(weatherType: string, mitigation: number): ()
    local valid = weatherType == "Sandstorm" or weatherType == "Blizzard" or weatherType == "Monsoon"
    local target = if valid then weatherType else "Clear"
    local strength = 1 - math.clamp(if typeof(mitigation) == "number" then mitigation else 0, 0, 1)
    if target == "Clear" or strength <= 0 then
        clearVisual()
        currentWeather = "Clear"
        return
    end
    if currentWeather == target then return end
    clearVisual()
    currentWeather = target
    local folder = Shared:FindFirstChild("CuratedWeatherEffects")
    local template = folder and folder:FindFirstChild(target)
    if not (template and template:IsA("Model")
        and template:GetAttribute("CuratedExternalAsset") == true
        and (tonumber(template:GetAttribute("VerifiedRobloxAssetId")) or 0) > 0
        and template:FindFirstChildWhichIsA("BasePart", true)) then
        return
    end
    local model = template:Clone()
    for _, part in ipairs(model:GetDescendants()) do
        if part:IsA("BasePart") then
            part.Anchored = true
            part.CanCollide = false
            part.CanTouch = false
            part.CanQuery = false
        end
    end
    current = model
    local camera = Workspace.CurrentCamera
    if camera then
        model.Parent = camera
        model:PivotTo(camera.CFrame * CFrame.new(0, 3.5, -13))
    end
end

return table.freeze(WeatherVFX)
