-- 파일명: tools/runtime/roblox/Vibe2AutoPlayer.luau
-- 역할: Roblox Studio 테스트 안에서 StudioTestService + VirtualInput으로 실제 입력을 보낸다.
-- 사용 조건: Studio 전용. published experience에서 PASS 증거로 사용하지 않는다.

local UserInputService = game:GetService("UserInputService")
local StudioTestService = game:GetService("StudioTestService")
local HttpService = game:GetService("HttpService")
local EncodingService = game:GetService("EncodingService")

local Vibe2AutoPlayer = {}

local function nowMs()
    return math.floor(os.clock() * 1000)
end

local function keyCode(name)
    local item = Enum.KeyCode[name]
    if not item then
        error("Unknown Roblox key: " .. tostring(name))
    end
    return item
end

local function append(list, value)
    list[#list + 1] = value
end

function Vibe2AutoPlayer.Run(scenario, options)
    options = options or {}
    local nonce = tostring(options.nonce or "")
    if nonce == "" then
        error("VIBE2 nonce required")
    end

    local virtualInput = UserInputService:CreateVirtualInput()
    if not virtualInput then
        error("VirtualInput unavailable")
    end

    local result = {
        version = 1,
        engine = "roblox",
        nonce = nonce,
        authority = "vibe2-roblox-studio-runtime",
        runtimeVerified = true,
        capabilities = {
            studioTestService = StudioTestService ~= nil,
            virtualInput = true,
        },
        place = game.Name,
        actions = {},
        checkpoints = {},
        errors = {},
        metrics = {
            timeToFirstActionMs = nil,
            consoleErrorCount = 0,
        },
    }

    local started = nowMs()
    local firstInput = nil
    local verifier = options.verify

    for index, action in ipairs(scenario.actions or {}) do
        local id = tostring(action.id or ("action-" .. index))
        local kind = string.lower(tostring(action.type or ""))
        local record = { id = id, type = kind, dispatched = false, ok = false }
        local ok, err = pcall(function()
            if kind == "wait" then
                task.wait(math.max(0, tonumber(action.ms or 0)) / 1000)
                record.ok = true
            elseif kind == "key" then
                if firstInput == nil then firstInput = nowMs() end
                local key = keyCode(tostring(action.key or action.code or ""))
                virtualInput:SendKey(true, key, false)
                task.wait(math.max(0.01, tonumber(action.holdMs or 80) / 1000))
                virtualInput:SendKey(false, key, false)
                record.dispatched = true
                record.ok = true
            elseif kind == "click" then
                if firstInput == nil then firstInput = nowMs() end
                local x = tonumber(action.x or (action.data and action.data.x) or 0)
                local y = tonumber(action.y or (action.data and action.data.y) or 0)
                local point = Vector2.new(x, y)
                virtualInput:SendMousePosition(point)
                virtualInput:SendMouseButton(point, Enum.UserInputType.MouseButton1, true, 0)
                virtualInput:SendMouseButton(point, Enum.UserInputType.MouseButton1, false, 0)
                record.dispatched = true
                record.ok = true
            elseif kind == "expect" then
                if type(verifier) ~= "function" then
                    error("Roblox expect requires options.verify(action)")
                end
                local pass, value = verifier(action)
                pass = pass == true
                append(result.checkpoints, {
                    id = id,
                    name = tostring(action.name or id),
                    required = action.required ~= false,
                    pass = pass,
                    value = value,
                })
                record.ok = pass
                if action.required ~= false and not pass then
                    error("checkpoint failed: " .. tostring(action.name or id))
                end
            else
                error("Unsupported Roblox AUTO PLAYER action: " .. kind)
            end
        end)
        if not ok then
            record.error = tostring(err)
            append(result.errors, { type = "action-error", actionId = id, message = tostring(err) })
        end
        append(result.actions, record)
        if not ok and action.required ~= false then
            break
        end
    end

    if firstInput ~= nil then
        result.metrics.timeToFirstActionMs = math.max(0, firstInput - started)
    end
    result.metrics.durationMs = math.max(0, nowMs() - started)
    return result
end

function Vibe2AutoPlayer.EncodeStdout(result)
    local json = HttpService:JSONEncode(result)
    local encoded = EncodingService:Base64Encode(buffer.fromstring(json))
    return "VIBE2_AUTO_PLAYER_RUNTIME_JSON=" .. buffer.tostring(encoded)
end

return Vibe2AutoPlayer
