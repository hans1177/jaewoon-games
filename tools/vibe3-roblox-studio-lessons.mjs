// Original, repository-owned Luau teaching examples. Not game modules or runtime evidence.
// API references explain semantics only; no external game source/assets are ingested.
import crypto from 'node:crypto';

const docs=Object.freeze({
  security:'https://create.roblox.com/docs/scripting/security/client-server-boundary',
  storage:'https://create.roblox.com/docs/cloud-services/data-stores',
  network:'https://create.roblox.com/docs/physics/network-ownership',
  streaming:'https://create.roblox.com/docs/workspace/streaming',
  tags:'https://create.roblox.com/docs/reference/engine/classes/CollectionService',
  path:'https://create.roblox.com/docs/characters/pathfinding',
  query:'https://create.roblox.com/docs/reference/engine/classes/WorldRoot',
  parallel:'https://create.roblox.com/docs/scripting/multithreading',
  editor:'https://create.roblox.com/docs/reference/engine/classes/ChangeHistoryService',
  input:'https://create.roblox.com/docs/reference/engine/classes/ContextActionService',
  animation:'https://create.roblox.com/docs/reference/engine/classes/AnimationTrack',
  ui:'https://create.roblox.com/docs/ui/size-modifiers',
  material:'https://create.roblox.com/docs/art/modeling/surface-appearance'
});
const lesson=(id,title,domain,terms,principle,application,failureMode,transferCheck,code,reference)=>Object.freeze({
  id,title,domain,level:'STUDIO',terms,principle,application,failureMode,transferCheck,
  exampleCode:code.trim()+'\n',apiReference:reference?docs[reference]:null,
  provenance:'ORIGINAL_CHATGPT_AUTHORED_TEACHING_EXAMPLE',exampleKind:'ADAPTATION_FUNCTION_NOT_DROP_IN_SYSTEM',
  runtimeVerified:false,applicationVerified:false,weightTraining:false
});

export const ROBLOX_STUDIO_LESSONS=Object.freeze([
  lesson('REMOTE_PAYLOAD_SCHEMA','리모트 입력 검증','SECURITY','remote payload schema finite 보안 리모트 입력 검증',
    'Decode a small known payload before any authoritative mutation.',
    'Call this from the existing server remote owner, then apply permission, range, cooldown and game-state checks. Ignore all client-supplied damage or ownership.',
    'A number type check accepts NaN/infinity; a valid action name alone does not authorize an action.',
    'Send NaN, infinity, huge strings, wrong types and unknown actions; no state or broadcast should change.',`
return function(payload)
    if typeof(payload) ~= "table" then return nil end
    local action, sequence = payload.action, payload.sequence
    if action ~= "Attack" and action ~= "Interact" then return nil end
    if typeof(sequence) ~= "number" or sequence ~= sequence then return nil end
    if sequence < 0 or sequence > 2147483647 or sequence % 1 ~= 0 then return nil end
    return {action = action, sequence = sequence}
end`, 'security'),
  lesson('SERVER_RATE_LIMIT','서버 요청 속도 제한','SECURITY','rate spam bucket cooldown 스팸 속도 제한',
    'Bound per-player requests before expensive work, with a server-owned clock.',
    'Create one limiter for an existing remote owner; forget player state on PlayerRemoving. Capacity/rate are trusted configuration.',
    'Client-only throttles are bypassable; retaining departed-player keys leaks memory.',
    'Test an allowed burst, sustained spam, independent players and removal/rejoin.',`
return function(capacity, refillPerSecond)
    assert(capacity >= 1 and refillPerSecond > 0)
    local states = {}
    return {
        allow = function(userId, now)
            local s = states[userId] or {tokens = capacity, at = now}
            s.tokens = math.min(capacity, s.tokens + math.max(0, now - s.at) * refillPerSecond)
            s.at = now
            states[userId] = s
            if s.tokens < 1 then return false end
            s.tokens -= 1
            return true
        end,
        forget = function(userId) states[userId] = nil end,
    }
end`, 'security'),
  lesson('SERVER_INTERACTION_GATE','상호작용 권한과 거리','SECURITY','interaction prompt distance permission 상호작용 거리 권한',
    'Use the server actor and a server-selected target to validate an interaction.',
    'Pass a registered target, server-owned eligibility and configured radius; add line-of-sight and phase rules in the same owner. Protect critical movable targets from client physics manipulation.',
    'A client-picked Instance or prompt visibility is not an authorization boundary.',
    'Try a distant, removed, disabled and wrong-role target and a dead/replaced character.',`
return function(player, targetPart, enabled, radius)
    if not enabled or not targetPart:IsDescendantOf(workspace) then return false end
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if not root or not root:IsA("BasePart") or not humanoid or humanoid.Health <= 0 then
        return false
    end
    local distance = (root.Position - targetPart.Position).Magnitude
    return distance == distance and distance <= radius
end`, 'security'),
  lesson('SAVE_SCHEMA_MIGRATION','저장 스키마 마이그레이션','PERSISTENCE','save schema migration version 저장 마이그레이션 버전',
    'Make data upgrades explicit, pure and repeatable; never turn a failed load into a successful empty profile.',
    'Apply only to a successfully loaded, validated profile. Distinguish missing data from backend errors; preserve unknown fields and reject future versions.',
    'Defaulting every failed read to a new profile overwrites progression; in-place mutation corrupts retry inputs.',
    'Run old/current/future schemas twice, verify unknown fields survive and failed reads never enter save.',`
return function(raw)
    if typeof(raw) ~= "table" then return nil, "INVALID_PROFILE" end
    local version = raw.version or 1
    if version ~= 1 and version ~= 2 then return nil, "UNSUPPORTED_VERSION" end
    local nextData = table.clone(raw)
    if version == 1 then
        local coins = raw.coins or 0
        if typeof(coins) ~= "number" or coins ~= coins or coins < 0 or coins > 1e9 then
            return nil, "INVALID_CURRENCY"
        end
        nextData.wallet = {coins = math.floor(coins)}
        nextData.coins = nil
        nextData.version = 2
    end
    return nextData
end`, 'storage'),
  lesson('SAVE_SESSION_FENCE','저장 세션 소유권','PERSISTENCE','session lease fence save 세션 임대 저장 충돌',
    'A save callback must still own the profile session when the atomic update executes.',
    'This is only a pure UpdateAsync callback guard. Integrate with the existing acquisition, renewal, conflict and release protocol; freeze a deep snapshot and a save generation before calling UpdateAsync.',
    'Checking a lease before yielding does not protect the later write; an expired token must not write over a new server.',
    'Simulate competing servers, expired ownership and out-of-order saves; stale callbacks must return nil.',`
return function(current, token, now, saveGeneration, snapshot)
    if typeof(current) ~= "table" or typeof(current.session) ~= "table" then return nil end
    local lease = current.session
    if lease.token ~= token or lease.expiresAt <= now then return nil end
    if saveGeneration <= (current.saveGeneration or 0) then return nil end
    local updated = table.clone(current)
    updated.data = snapshot
    updated.saveGeneration = saveGeneration
    return updated
end`, 'storage'),
  lesson('BOUNDED_BACKOFF','제한 있는 재시도','PERSISTENCE','retry backoff deadline budget 재시도 백오프 오류',
    'Retry only transient failures, with a deadline and a finite attempt budget.',
    'Use an idempotent existing operation; classify errors and check platform request budgets outside the pure update callback. A deadline prevents new attempts but cannot cancel an already yielding engine call.',
    'Retrying permanent errors or side-effecting operations blindly creates load and duplicate rewards.',
    'Inject transient/permanent failures, budget exhaustion and success after retry; ensure no additional attempt starts after the deadline.',`
return function(operation, retryable, deadline, random)
    local lastError = "DEADLINE"
    for attempt = 1, 4 do
        if os.clock() >= deadline then break end
        local ok, value = pcall(operation)
        if ok then return true, value end
        lastError = value
        if not retryable(value) or attempt == 4 then break end
        local delay = math.min(2 ^ (attempt - 1), 4) * random:NextNumber(0.75, 1.25)
        local remaining = deadline - os.clock()
        if remaining <= 0 then break end
        task.wait(math.min(delay, remaining))
    end
    return false, lastError
end`, 'storage'),
  lesson('IDEMPOTENT_REWARD_COMMIT','중복 보상 차단','PERSISTENCE','reward idempotent transaction duplicate 보상 거래 중복',
    'Store a reward and its trusted operation identity in the same atomic profile transition.',
    'The existing server owner supplies operationId and amount after validation. Use only with its session guard; acknowledge after durable commit. At the ledger bound, stop and migrate rather than deleting deduplication history.',
    'Granting before commit or pruning replayable operation IDs permits duplicate rewards; this function is not a complete payment system.',
    'Replay an operation, interrupt after commit, retry from another server and reach the deduplication capacity.',`
return function(profile, operationId, amount)
    local seen = profile.appliedOperations or {}
    if seen[operationId] then return profile end
    local count = 0
    for _ in pairs(seen) do count += 1 end
    if count >= 256 then return nil end
    local nextProfile = table.clone(profile)
    nextProfile.appliedOperations = table.clone(seen)
    nextProfile.appliedOperations[operationId] = true
    nextProfile.coins = profile.coins + amount
    return nextProfile
end`, 'storage'),
  lesson('REPLICATION_GENERATION_SEQUENCE','복제 순서와 세대','NETWORK','snapshot sequence replication epoch 스냅샷 복제 순서',
    'Reject old presentation snapshots within a server-authenticated actor generation.',
    'Reset this receiver when the existing spawn owner binds a new actor; only authenticated server events provide sequence and payload. Do not infer a new generation from an arbitrary packet.',
    'Accepting every arriving packet rewinds presentation; sequence-only checks cross actor lifetimes.',
    'Deliver duplicates, reversed order and packets for the previous actor generation.',`
return function(expectedGeneration)
    local lastSequence = -1
    return function(generation, sequence, payload)
        if generation ~= expectedGeneration then return nil end
        if typeof(sequence) ~= "number" or sequence ~= sequence then return nil end
        if sequence % 1 ~= 0 or sequence <= lastSequence or sequence > 2147483647 then return nil end
        lastSequence = sequence
        return payload
    end
end`),
  lesson('SNAPSHOT_INTERPOLATION','스냅샷 보간','NETWORK','interpolation snapshot latency network 보간 지연 네트워크',
    'Interpolate presentation between ordered samples using one clock domain.',
    'Use server timestamps and a bounded render delay. Flush on teleport/generation change, hold the newest pose when samples run out, and keep gameplay simulation separate.',
    'Mixing os.clock with server time or extrapolating forever causes drift and overshoot.',
    'Test jitter, missing packets, equal timestamps, teleport and actor replacement at multiple frame rates.',`
return function(older, newer, renderTime)
    if older.generation ~= newer.generation then return newer.pose end
    local span = newer.at - older.at
    if span <= 0 then return newer.pose end
    local alpha = math.clamp((renderTime - older.at) / span, 0, 1)
    return older.pose:Lerp(newer.pose, alpha)
end`),
  lesson('STREAMED_TAG_LIFETIME','스트리밍 오브젝트 수명','WORLD','stream streaming tag collection 스트리밍 태그 수명',
    'Bind local behavior idempotently when a tagged instance appears and remove it when it leaves.',
    'Use a non-yielding bind that returns a non-yielding cleanup function. Connect signals before scanning current tags, scope to workspace, and call returned shutdown during owner teardown.',
    'Assuming the full map is always loaded or binding twice leaks callbacks and stale references.',
    'Stream the same region out/in repeatedly, remove a tag and shut down the owner; every bind has one cleanup.',`
return function(service, tag, bind)
    local owned = {}
    local function remove(item)
        local cleanup = owned[item]
        owned[item] = nil
        if cleanup then cleanup() end
    end
    local function add(item)
        if owned[item] or not item:IsDescendantOf(workspace) then return end
        owned[item] = bind(item)
    end
    local added = service:GetInstanceAddedSignal(tag):Connect(add)
    local removed = service:GetInstanceRemovedSignal(tag):Connect(remove)
    for _, item in ipairs(service:GetTagged(tag)) do add(item) end
    return function()
        added:Disconnect(); removed:Disconnect()
        local items = {}
        for item in pairs(owned) do table.insert(items, item) end
        for _, item in ipairs(items) do remove(item) end
    end
end`, 'tags'),
  lesson('PHYSICS_NETWORK_OWNER','물리 네트워크 소유권','PHYSICS','physics ownership assembly vehicle 물리 소유권 차량',
    'Assign physics ownership deliberately per assembly while preserving server gameplay validation.',
    'Call on the server for a validated assembly root; choose server authority for critical objects and an eligible driver for vehicles. Reevaluate when anchoring, assembly or driver changes.',
    'Owning physics does not authorize damage, rewards or teleport; forcing all physics to the server can harm responsiveness.',
    'Test driver change, anchoring, disconnected assemblies and hostile movement reports in two clients.',`
return function(root, owner)
    if root.Anchored then return false, "ANCHORED" end
    local checked, allowed, reason = pcall(function() return root:CanSetNetworkOwnership() end)
    if not checked or not allowed then return false, reason end
    return pcall(function() root:SetNetworkOwner(owner) end)
end`, 'network'),
  lesson('PROJECTILE_SEGMENT_QUERY','고속 발사체 충돌','COMBAT','projectile sweep raycast bullet 발사체 충돌 레이캐스트',
    'Query the traveled segment rather than relying on discrete endpoint overlap.',
    'Supply finite server-owned positions and RaycastParams excluding the shooter. This is a point-projectile query; thick or curved projectiles need shape queries/substeps and initial-overlap handling. Damage remains with the existing server combat owner.',
    'Fast projectiles tunnel through walls when only endpoints are tested; client hit declarations are not proof.',
    'Test a thin wall at high speed, zero travel, starting overlap and curved motion with fixed seeds.',`
return function(world, previous, proposed, params)
    local travel = proposed - previous
    if travel.Magnitude < 1e-6 then return nil, previous end
    local hit = world:Raycast(previous, travel, params)
    if hit then return hit, hit.Position end
    return nil, proposed
end`, 'query'),
  lesson('PATH_REQUEST_GENERATION','경로 계산 취소와 최신성','AI','pathfinding path compute cancellation 경로 길찾기 취소',
    'A yielded path result must still match the latest navigation request.',
    'Use a fresh Path per request and a shared request generation. Validate the current target after ComputeAsync, separately throttle requests, and integrate blocked-waypoint/timeout handling with the existing controller.',
    'Concurrent ComputeAsync calls on one path or applying an old destination causes wrong-way movement.',
    'Request two destinations while computing, remove the actor and block a future waypoint.',`
return function(service, options, from, destination, generation, isCurrent)
    local path = service:CreatePath(options)
    local ok = pcall(function() path:ComputeAsync(from, destination) end)
    if not ok or not isCurrent(generation) or path.Status ~= Enum.PathStatus.Success then
        path:Destroy()
        return nil
    end
    return path -- existing owner must disconnect signals and Destroy it later
end`, 'path'),
  lesson('AI_STATE_TRANSITIONS','몹 상태 머신','AI','fsm state transition interrupt 몹 상태 전환 중단',
    'Make allowed state transitions explicit and commit through one owner.',
    'Drive this pure decision from server observations. Entry/exit behavior, timers and cancellation stay in the existing AI owner; eliminated actors cannot reenter combat without a new lifecycle.',
    'Independent booleans allow simultaneous attack/dead/patrol states and leave old timers active.',
    'Try every allowed/forbidden edge, interruption during windup and removal during recovery.',`
local edges = {
    Idle = {Chase = true, Dead = true},
    Chase = {Idle = true, Windup = true, Dead = true},
    Windup = {Recover = true, Chase = true, Dead = true},
    Recover = {Chase = true, Dead = true},
    Dead = {},
}
return function(current, requested)
    local allowed = edges[current]
    if allowed and allowed[requested] then return requested, true end
    return current, false
end`),
  lesson('TARGET_HYSTERESIS','타깃 선택 안정화','AI','hysteresis target score threat 타깃 위협 흔들림',
    'Keep a valid current target unless a challenger is meaningfully better.',
    'Use server-computed finite scores with the same scale; expire invalid targets immediately and use a trusted margin. Visibility, role and memory rules remain in the scoring owner.',
    'Distance-only instant reselection creates oscillation; hysteresis must not retain a dead or departed target.',
    'Move two players across the score boundary, remove the incumbent and test equal scores.',`
return function(current, currentScore, challenger, challengerScore, margin)
    if not current then return challenger end
    if not challenger then return current end
    if challengerScore > currentScore + margin then return challenger end
    return current
end`),
  lesson('SPATIAL_HASH_NEIGHBORS','공간 분할 군집 조회','PERFORMANCE','spatial hash grid crowd neighborhood 공간 군집 그리드',
    'Limit candidate neighbors by spatial cells before precise distance checks.',
    'Build or update buckets once under the existing simulation owner, use a positive cell size and inspect every intersecting cell; filter returned candidates by actual radius and validity.',
    'Scanning all actors per actor is quadratic; checking only the current cell misses boundary neighbors.',
    'Compare results to a brute-force oracle at negative coordinates, cell edges and radii larger than a cell.',`
return function(buckets, position, radius, cellSize)
    assert(cellSize > 0 and radius >= 0)
    local found = {}
    local minX, maxX = math.floor((position.X-radius)/cellSize), math.floor((position.X+radius)/cellSize)
    local minZ, maxZ = math.floor((position.Z-radius)/cellSize), math.floor((position.Z+radius)/cellSize)
    for x = minX, maxX do
        for z = minZ, maxZ do
            local key = tostring(x) .. ":" .. tostring(z)
            for _, actor in ipairs(buckets[key] or {}) do table.insert(found, actor) end
        end
    end
    return found
end`),
  lesson('FIXED_STEP_COSMETICS','고정 간격 보조 시뮬레이션','PERFORMANCE','fixed timestep accumulator dt 고정 간격 시뮬레이션',
    'Bound catch-up work for optional cosmetic simulation after a long frame.',
    'Use this only for local decorative motion that may drop backlog. Keep damage, cooldowns and authoritative movement on their existing clocks; do not hide performance regressions by slowing gameplay.',
    'Unlimited catch-up causes a spiral of work; discarding gameplay time changes outcomes.',
    'Replay 30/60/120 FPS and one long stall; measure work cap and verify gameplay state is unaffected.',`
return function(stepSeconds, advance)
    assert(stepSeconds > 0)
    local accumulator = 0
    return function(dt)
        accumulator += math.clamp(dt, 0, stepSeconds * 4)
        local count = 0
        while accumulator >= stepSeconds and count < 4 do
            advance(stepSeconds)
            accumulator -= stepSeconds
            count += 1
        end
        return accumulator / stepSeconds
    end
end`),
  lesson('LOCAL_POSE_COMPOSITION','관절 로컬 포즈 합성','ANIMATION','pose joint cframe blend layer 포즈 관절 합성 블렌딩',
    'Compose rest and bounded local offsets from stable inputs, never from last frame output.',
    'Adapt the returned transform to the existing rig writer and its C0/Transform convention. Use one writer; preserve gameplay root and choose explicit locomotion/action masking.',
    'Multiplying the previous frame repeatedly accumulates drift; writing both C0 and Transform inconsistently double-applies the rest pose.',
    'Repeat thousands of loops, interrupt an action and inspect neutral return, grip and root stability.',`
return function(rest, locomotionOffset, actionOffset, secondaryOffset, weight)
    local actionBlend = CFrame.new():Lerp(actionOffset, math.clamp(weight, 0, 1))
    return rest * locomotionOffset * actionBlend * secondaryOffset
end`),
  lesson('FOOT_CONTACT_TARGET','발 접지와 IK 타깃','ANIMATION','ik foot ground contact slope 발 접지 경사',
    'Derive a bounded foot target from a real ground query while preserving locomotion authority.',
    'Use finite world-space probe inputs and ray parameters excluding the actor; feed the result to the existing IK layer with stance weight and reach limits. Do not teleport the root to solve a foot contact.',
    'Casting against the actor or solving planted and swinging feet identically causes jitter and stretched limbs.',
    'Test stairs, slopes, missing ground, airborne state and actor self-intersection.',`
return function(world, footPosition, upDistance, downDistance, soleOffset, params)
    local origin = footPosition + Vector3.new(0, upDistance, 0)
    local hit = world:Raycast(origin, Vector3.new(0, -(upDistance + downDistance), 0), params)
    if not hit or hit.Normal.Y < 0.35 then return nil end
    return hit.Position + hit.Normal * soleOffset, hit.Normal
end`, 'query'),
  lesson('ACTION_TIMELINE_PRESENTATION','공격 예비·타격·회복 타이밍','ANIMATION','action anticipation windup recovery timing 공격 예비 타격 회복 타이밍',
    'Derive presentation phase from one authoritative action start time.',
    'Use timestamps in the same server time domain and trusted positive durations. Use the phase only to animate; deduplicate impact effects with the existing action identity and keep damage timing server-owned.',
    'Starting a new local clock for each packet shifts impact; frame crossings can duplicate or miss effects.',
    'Receive an event late, duplicate it, interrupt it and compare two clients against the server action.',`
return function(now, startedAt, windup, active, recovery)
    assert(windup > 0 and active > 0 and recovery > 0)
    local t = now - startedAt
    if t < 0 then return "Waiting", 0 end
    if t < windup then return "Windup", t / windup end
    t -= windup
    if t < active then return "Active", t / active end
    t -= active
    if t < recovery then return "Recovery", t / recovery end
    return "Complete", 1
end`),
  lesson('LEASED_EFFECT_REUSE','이펙트 재사용과 오래된 콜백','VFX','pool effect lease generation vfx 이펙트 풀 재사용',
    'An effect lease prevents an old delayed callback from releasing a reused object.',
    'Use this guard inside an existing bounded visual pool. On acquire/release reset emitters, trails, sounds, tweens, transforms and subscriptions through the owner; cap the pool and destroy overflow.',
    'Reusing an object while an old timer still owns it makes new effects disappear or inherit old state.',
    'Release/acquire the same item before a delayed callback fires; only the matching current lease may release it.',`
return function()
    local generation, active = 0, false
    return {
        acquire = function()
            generation += 1
            active = true
            return generation
        end,
        release = function(token)
            if not active or token ~= generation then return false end
            active = false
            return true
        end,
    }
end`),
  lesson('COSMETIC_LOD_HYSTERESIS','장식 LOD와 모바일 예산','VFX','lod mobile quality distance hysteresis 모바일 거리 품질',
    'Reduce optional presentation work by distance with separate enter/exit thresholds.',
    'Use the existing visual owner and measured device budget; keep silhouettes, gameplay telegraphs and collision consistent across tiers.',
    'One threshold flickers at the boundary; disabling distant AI or damage as visual LOD changes gameplay.',
    'Cross thresholds slowly and rapidly on the target mobile scene; inspect readability, frame tails and unchanged server outcomes.',`
return function(currentTier, distance)
    if currentTier == "Near" then
        if distance > 90 then return "Far" end
        return "Near"
    end
    if distance < 70 then return "Near" end
    return "Far"
end`),
  lesson('PARALLEL_PURE_COMPUTE','병렬 계산과 직렬 반영','PERFORMANCE','parallel actor synchronize worker 병렬 액터 계산',
    'Move measured pure computation into an Actor while applying results through one serial owner.',
    'Invoke from that Actor context with a private immutable data snapshot and a non-yielding pure compute callback. Check current generation after synchronization; verify every used engine API thread-safety tag.',
    'Writing shared instances from parallel code or committing obsolete results creates races; Actor overhead can exceed the saved work.',
    'Compare serial/parallel outputs, invalidate a generation during compute and measure actual frame cost.',`
return function(snapshot, generation, compute, isCurrent, commit)
    task.desynchronize()
    local ok, result = pcall(compute, snapshot)
    task.synchronize()
    if not ok then return false, result end
    if not isCurrent(generation) then return false, "SUPERSEDED" end
    commit(result)
    return true
end`, 'parallel'),
  lesson('SCOPED_PROFILING','프로파일 구간과 오류 정리','PERFORMANCE','profile profiler microprofiler measurement 프로파일 측정',
    'Measure a named hot path and close profiling scopes even when it fails.',
    'Use for a synchronous measured section; sample tail frames and resource counts separately on repeatable mobile scenes. Return values and errors must preserve caller behavior.',
    'A fast average hides spikes; leaving a profiling scope open obscures later measurements.',
    'Run success/error paths, inspect balanced markers and compare the same scenario before/after.',`
return function(label, operation)
    debug.profilebegin(label)
    local result = table.pack(pcall(operation))
    debug.profileend()
    if not result[1] then error(result[2], 0) end
    return table.unpack(result, 2, result.n)
end`),
  lesson('DETERMINISTIC_GENERATION','재현 가능한 절차 생성','WORLD','seed procedural random generation 시드 절차 생성',
    'A recorded seed and stable call order make generated candidates reproducible.',
    'Use an isolated Random instance, trusted bounded attempts and stable occupancy queries. Validate connectivity and spawn safety separately; place only approved internal assets after acceptance.',
    'Global RNG consumption and nondeterministic iteration make failures impossible to replay; random placement alone does not prove reachability.',
    'Replay the same seed twice, test a saturated region and verify accepted points remain inside bounds.',`
return function(seed, count, halfWidth, isFree)
    local rng, positions = Random.new(seed), {}
    for _ = 1, count * 8 do
        if #positions >= count then break end
        local p = Vector3.new(rng:NextNumber(-halfWidth, halfWidth), 0, rng:NextNumber(-halfWidth, halfWidth))
        if isFree(p, positions) then table.insert(positions, p) end
    end
    return positions, #positions == count
end`),
  lesson('OWNED_RESOURCE_CLEANUP','연결·타이머·인스턴스 소유권','ARCHITECTURE','cleanup dispose lifetime connection lifecycle 정리 연결 수명',
    'An owner registers cleanup as resources are acquired and disposes once in reverse order.',
    'Register non-yielding closures for connections, cancellation tokens and instances. Add resources only while the owner is alive; continue cleanup after one failure while reporting errors.',
    'Destroying only the visible model leaves listeners and delayed writes alive; one throwing cleanup should not block the rest.',
    'Dispose twice, register after disposal, inject a throwing cleanup and repeat round creation/removal.',`
return function()
    local callbacks, closed = {}, false
    return {
        add = function(cleanup)
            assert(not closed, "OWNER_CLOSED")
            table.insert(callbacks, cleanup)
        end,
        dispose = function()
            if closed then return {} end
            closed = true
            local errors = {}
            for i = #callbacks, 1, -1 do
                local ok, err = pcall(callbacks[i])
                if not ok then table.insert(errors, tostring(err)) end
            end
            table.clear(callbacks)
            return errors
        end,
    }
end`),
  lesson('STUDIO_UNDO_TRANSACTION','스튜디오 편집 도구 Undo','TOOLING','studio plugin undo recording editor 스튜디오 플러그인 편집',
    'Make an editor operation one named undoable recording.',
    'Call only from a Studio plugin after validating selection and internal asset provenance. The non-yielding apply callback must own its edits; on failure retain a committed undo record so the user can revert partial work.',
    'Editing before recording or cancelling history after partial edits can leave untracked scene changes.',
    'Test no recording availability, a successful edit, injected partial failure and Undo/Redo.',`
return function(history, label, apply)
    local recording = history:TryBeginRecording(label)
    if not recording then return false, "RECORDING_UNAVAILABLE" end
    local ok, result = pcall(apply)
    history:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
    return ok, result
end`, 'editor'),
  lesson('INPUT_ACTION_OWNERSHIP','모바일·패드 공통 입력','INPUT_UI','input touch gamepad mobile ui 입력 터치 패드 버튼',
    'Map device inputs to one gameplay intent while the server retains action authority.',
    'Use an owner-unique action name, keyboard/gamepad bindings and a touch button. Gate local intent for chat/modal state, then send through the existing validated action path; unbind on owner teardown.',
    'Multiple input owners double-fire actions; local disabled UI is not server permission.',
    'Test keyboard, touch, controller, modal UI, respawn and repeated equip/unequip.',`
return function(service, name, keys, enabled, request)
    service:BindAction(name, function(_, state)
        if not enabled() then return Enum.ContextActionResult.Pass end
        if state == Enum.UserInputState.Begin then request() end
        return Enum.ContextActionResult.Sink
    end, true, table.unpack(keys))
    return function() service:UnbindAction(name) end
end`, 'input'),
  lesson('CAMERA_FRAME_INDEPENDENT_DAMPING','프레임 독립 카메라 감쇠','CAMERA','camera damping smoothing shake 카메라 감쇠 흔들림',
    'Use time-based decay for presentation smoothing instead of a fixed per-frame lerp fraction.',
    'Apply through the existing camera owner after collision handling. Use a positive trusted response, reset on cuts/teleports and respect reduced-motion settings for shake.',
    'Fixed-alpha smoothing feels different by frame rate; smoothing through a wall or across a teleport is incorrect.',
    'Compare equal elapsed time at 30/60/120 FPS, cuts, walls and reduced-motion mode.',`
return function(current, target, response, dt)
    local alpha = 1 - math.exp(-math.max(0, response) * math.max(0, dt))
    return current:Lerp(target, alpha)
end`),
  lesson('ANIMATION_MARKER_LIFETIME','애니메이션 마커와 재생 수명','ANIMATION','animator marker animationtrack animation priority 마커 애니메이터 재생',
    'Bind animation markers to one track lifetime and one current action identity.',
    'Load approved internal animations through the existing Animator owner with intentional priority/loop settings. This connection emits presentation only; server action state owns damage. Disconnect before track disposal.',
    'Accumulating marker listeners duplicates effects; a local animation marker cannot authorize server damage.',
    'Replay, interrupt, destroy and replace the actor; stale tracks must produce no feedback.',`
return function(track, actionId, isCurrent, showImpact)
    local emitted = false
    local connection = track:GetMarkerReachedSignal("Impact"):Connect(function()
        if emitted or not isCurrent(actionId) then return end
        emitted = true
        showImpact(actionId)
    end)
    return function() connection:Disconnect() end
end`, 'animation'),
  lesson('INTERNAL_ASSET_RESOLUTION','내부 자산 매니페스트 바인딩','ASSETS','asset manifest provenance catalog internal 자산 매니페스트 카탈로그',
    'Resolve presentation from a reviewed internal catalog rather than accepting arbitrary asset identifiers.',
    'The server/build owner supplies the catalog with immutable source hashes and owned templates. Extend through the established asset pipeline; validate rig/scale/material/animation compatibility before publish.',
    'A path or asset ID supplied by a client can bypass provenance and load incompatible or unapproved content.',
    'Reject unknown IDs, stale expected hashes and external entries; verify the cloned asset binds to the actual actor.',`
return function(catalog, key, expectedSourceHash)
    local record = catalog[key]
    if not record or record.provenance ~= "INTERNAL" then return nil, "UNKNOWN_ASSET" end
    if record.sourceHash ~= expectedSourceHash then return nil, "STALE_SOURCE" end
    return record.template
end`),
  lesson('WORLD_CIRCULATION_GRAPH','월드·로비 동선과 연결성','WORLD_DESIGN','world lobby circulation route navigation 월드 로비 동선 연결',
    'Represent intended travel as a graph and verify access before decorating the space.',
    'Build adjacency from reviewed walkable links, compare reachable nodes against required spawn/objective/exit nodes, then verify actual collision and navigation in Studio. Model locked links per progression state.',
    'A connected sketch can still have impassable geometry; decoration can silently block the only route.',
    'Test each spawn, locked-door state, return route and emergency exit; compare graph reachability with native traversal.',`
return function(adjacency, start)
    local visited, queue, head = {[start] = true}, {start}, 1
    while head <= #queue do
        local node = queue[head]; head += 1
        for _, neighbor in ipairs(adjacency[node] or {}) do
            if not visited[neighbor] then
                visited[neighbor] = true
                table.insert(queue, neighbor)
            end
        end
    end
    return visited
end`),
  lesson('LOBBY_SPACE_ALLOCATION','로비 공간 활용과 여백','WORLD_DESIGN','lobby area space allocation density 로비 면적 공간 여백 밀도',
    'Allocate usable space by player activities and reserve circulation before placing props.',
    'Provide measured usable floor area, an explicit circulation reserve and weights for arrival/social/queue/shop/tutorial activities. These are tunable design inputs, not universal ratios; derive dimensions from avatar and peak occupancy.',
    'Filling every empty area removes gathering space and sightlines; equal area does not imply equal capacity.',
    'Simulate peak joins and parties, measure bottlenecks, queue spillover and time to find the next action.',`
return function(usableArea, circulationFraction, weights)
    assert(usableArea > 0 and circulationFraction >= 0 and circulationFraction < 1)
    local total = 0
    for _, weight in pairs(weights) do assert(weight >= 0); total += weight end
    assert(total > 0)
    local areas = {circulation = usableArea * circulationFraction}
    for id, weight in pairs(weights) do
        assert(id ~= "circulation")
        areas[id] = usableArea * (1 - circulationFraction) * weight / total
    end
    return areas
end`),
  lesson('PLACEMENT_CLEARANCE','배치 간격과 통행 여유','WORLD_DESIGN','placement clearance spacing footprint 배치 간격 통행 여유',
    'Reserve collision and interaction clearance around object footprints.',
    'Use conservative world-space axis-aligned bounds including rotated-object extents and avatar clearance; refine accepted candidates with actual overlap/raycast/navigation checks. Keep exits and interaction approach zones reserved.',
    'Checking only prop centers allows intersecting furniture and inaccessible prompts; bounds alone do not prove a walkable floor.',
    'Try touching edges, rotation, narrow corridors, clustered players and an object blocking an exit.',`
return function(a, b, clearance)
    assert(clearance >= 0)
    local separatedX = a.maxX + clearance <= b.minX or b.maxX + clearance <= a.minX
    local separatedZ = a.maxZ + clearance <= b.minZ or b.maxZ + clearance <= a.minZ
    return separatedX or separatedZ
end`),
  lesson('DISTANCE_SCREEN_READABILITY','거리감과 화면상 크기','WORLD_DESIGN','distance scale perspective fov readability 거리감 크기 원근 시야',
    'Evaluate object readability in projected screen space at the actual gameplay camera.',
    'Use the camera vertical FOV, viewport height and positive camera-space depth. This estimate assumes an upright small object; test projected bounds and occlusion for real silhouettes. Keep avatar/world units consistent rather than assuming a fixed real-world scale.',
    'A detailed close-up asset may be unreadable at play distance; perspective and FOV changes alter apparent size.',
    'Inspect spawn, normal play and far views on phone and desktop; identify exits, threats and interactive objects without zooming.',`
return function(worldHeight, depth, verticalFovDegrees, viewportHeight)
    if depth <= 0 or verticalFovDegrees <= 0 or verticalFovDegrees >= 180 then return nil end
    local focalLength = viewportHeight / (2 * math.tan(math.rad(verticalFovDegrees) / 2))
    return worldHeight * focalLength / depth
end`),
  lesson('BALLISTIC_UNITS_AND_TIME','중력·속도·시간의 일관성','PHYSICS','gravity ballistic velocity trajectory 중력 속도 탄도 물리학',
    'Integrate position and velocity using one consistent unit/time convention.',
    'Use trusted initial state and acceleration in studs per second squared, usually derived from the current world gravity. This analytic free-flight model excludes drag and collisions; pair traveled segments with server collision queries.',
    'Multiplying dt twice or mixing per-frame and per-second values changes trajectories by frame rate.',
    'Check t=0, one large interval versus split intervals, gravity sign and collision against a thin wall.',`
return function(origin, velocity, acceleration, elapsed)
    assert(elapsed >= 0)
    local position = origin + velocity * elapsed + acceleration * (0.5 * elapsed * elapsed)
    local nextVelocity = velocity + acceleration * elapsed
    return position, nextVelocity
end`),
  lesson('MASS_AWARE_KNOCKBACK','질량을 고려한 넉백','PHYSICS','impulse mass knockback force 넉백 질량 충격 힘',
    'Choose a bounded velocity change and convert it to impulse using assembly mass.',
    'Call only after an existing server-approved hit on a registered target. Select network ownership deliberately; finite inputs and trusted caps are required. Preserve knockback immunity and crowd-control rules in the combat owner.',
    'A fixed impulse throws light and heavy actors differently; applying it every frame creates runaway force.',
    'Compare different assembly masses, zero direction, anchored actors, repeated hit IDs and immunity.',`
return function(root, direction, deltaSpeed, maxDeltaSpeed)
    if root.Anchored or direction.Magnitude < 1e-6 then return false end
    local speed = math.clamp(deltaSpeed, 0, maxDeltaSpeed)
    root:ApplyImpulse(direction.Unit * root.AssemblyMass * speed)
    return true
end`),
  lesson('UI_NAVIGATION_STACK','메뉴 깊이와 뒤로가기','INPUT_UI','menu stack navigation depth back 메뉴 깊이 뒤로가기 탐색',
    'Use one bounded navigation history with explicit allowed screens and back behavior.',
    'Keep frequent tasks shallow, preserve scroll/selection by screen ID and manage modal focus in the existing UI owner. Depth is a reviewed product choice; refusing a push should show a clear fallback.',
    'Opening panels independently traps focus, duplicates screens and makes back/close inconsistent.',
    'Exercise repeated open, root back, unknown screen, depth limit, touch back and controller focus restoration.',`
return function(rootId, allowed, maxDepth)
    assert(allowed[rootId] and maxDepth >= 1)
    local stack = {rootId}
    local selection = {}
    local modal = false
    return {
        current = function() return stack[#stack] end,
        rememberFocus = function(id)
            if type(id) ~= "string" or #id > 128 then return false end
            selection[stack[#stack]] = id; return true
        end,
        restoreFocus = function(isAvailable, fallback)
            local id = selection[stack[#stack]]
            if id and isAvailable(id) then return id end
            return fallback and isAvailable(fallback) and fallback or nil
        end,
        setModal = function(value) modal = value == true end,
        open = function(id)
            if modal or not allowed[id] or stack[#stack] == id then return false end
            for index, prior in ipairs(stack) do
                if prior == id then for i=#stack,index+1,-1 do table.remove(stack,i) end; return true end
            end
            if #stack >= maxDepth then return false end
            table.insert(stack, id); return true
        end,
        back = function()
            if modal then modal=false; return stack[#stack] end
            if #stack > 1 then table.remove(stack) end
            return stack[#stack]
        end,
    }
end`),
  lesson('RESPONSIVE_UI_GRID','반응형 UI 배치','INPUT_UI','responsive grid layout safearea viewport 반응형 그리드 화면 배치',
    'Derive layout from the usable safe area while preserving a minimum readable/touchable item size.',
    'Feed safe-area width after insets and current scale. Apply through existing UIGridLayout/constraints; if one card cannot fit, use an explicit compact or scroll layout instead of shrinking text indefinitely.',
    'Desktop-fixed dimensions clip on phones; competing constraints and layouts produce unexpected sizes.',
    'Test narrow portrait, landscape, long translated labels, large text and gamepad selection.',`
return function(width, padding, gap, minimumCardWidth, maxColumns)
    assert(padding >= 0 and gap >= 0 and minimumCardWidth > 0 and maxColumns >= 1)
    local available = width - padding * 2
    if available < minimumCardWidth then return {mode = "Compact", columns = 1} end
    local columns = math.clamp(math.floor((available + gap) / (minimumCardWidth + gap)), 1, maxColumns)
    return {mode = "Grid", columns = columns, cardWidth = (available - gap * (columns - 1)) / columns}
end`, 'ui'),
  lesson('MENU_PROGRESSIVE_DISCLOSURE','정보 깊이와 점진적 공개','INPUT_UI','disclosure information menu advanced tutorial 정보 깊이 고급 메뉴 튜토리얼',
    'Expose the next meaningful action first while keeping advanced options discoverable.',
    'Classify options by current player task and explicit advanced-mode preference. Keep costs, consequences and essential controls visible; this presentation filter cannot replace server entitlement checks.',
    'Hiding critical information as advanced content confuses users; showing every option creates search overload.',
    'Observe a new player and an experienced player completing the same task, including discovering and leaving advanced settings.',`
return function(options, showAdvanced, context)
    local visible = {}
    for _, option in ipairs(options) do
        local contextual = option.context == nil or option.context == context
        if contextual and (option.essential or not option.advanced or showAdvanced) then
            table.insert(visible, option)
        end
    end
    return visible
end`),
  lesson('ECONOMY_BALANCED_JOURNAL','게임 경제·회계 원장','ECONOMY','accounting ledger journal economy currency 회계 원장 경제 재화',
    'Represent a transfer as balanced integer entries with a trusted transaction identity.',
    'Use server-resolved accounts and smallest currency units; commit entries, balances and deduplication together through the existing durable owner. Explicit source/sink accounts describe issuance/destruction; this is game telemetry, not financial-accounting compliance.',
    'Updating two wallets independently loses conservation on partial failure; float rounding and replay duplicate currency.',
    'Reject unbalanced, fractional, overflowing and unknown-account entries; replay a committed transaction and simulate interrupted persistence.',`
return function(entries, allowedAccounts)
    if #entries < 2 or #entries > 32 then return false end
    local total = 0
    for _, row in ipairs(entries) do
        local amount = row.amount
        if not allowedAccounts[row.account] or typeof(amount) ~= "number" then return false end
        if amount ~= amount or math.abs(amount) > 1e9 or amount % 1 ~= 0 then return false end
        total += amount
    end
    return total == 0
end`),
  lesson('ECONOMY_SOURCE_SINK_MODEL','재화 유입·소모와 구매 시간','ECONOMY','economy faucet sink inflation afford sources sinks 경제 유입 소모 인플레이션 구매',
    'Model income, spending and affordability explicitly before tuning rewards and prices.',
    'Use measured player segments and session durations; preserve negative projected balances as a design signal. Validate retention and player choice, not just currency removal; simulated expectations are not actual ledger events.',
    'Balancing only average income hides new-player starvation and high-end inflation; arbitrary sinks can feel punitive.',
    'Compare newcomer/median/high-engagement scenarios, repeatable exploits, long sessions and price changes.',`
return function(startBalance, sessions)
    local balance, earned, spent = startBalance, 0, 0
    local history = {}
    for _, session in ipairs(sessions) do
        earned += session.income
        spent += session.cost
        balance += session.income - session.cost
        table.insert(history, balance)
    end
    return {balance = balance, earned = earned, spent = spent, history = history}
end`),
  lesson('DAMAGE_MODIFIER_PIPELINE','데미지 계산 순서','BALANCE','damage armor defense crit multiplier damageformula 데미지 방어 치명타 배율',
    'Specify modifier order and round once at the final authoritative damage boundary.',
    'This illustrative curve uses nonnegative armor and a positive scale constant; the existing server owns finite trusted stats, crit rolls, immunity and target validation. Calibrate the curve to the game rather than copying constants.',
    'Repeated rounding, client-selected crits and inconsistent modifier order create exploits and unexplained outcomes.',
    'Test zero damage, immunity, increasing armor, multiplier bounds and the same hit on two clients; record time-to-defeat distributions.',`
return function(base, outgoingMultiplier, criticalMultiplier, armor, armorScale, immune)
    assert(base >= 0 and outgoingMultiplier >= 0 and criticalMultiplier >= 0 and armorScale > 0)
    if immune then return 0 end
    local mitigation = armorScale / (armorScale + math.max(0, armor))
    local raw = base * outgoingMultiplier * criticalMultiplier * mitigation
    return math.max(0, math.floor(raw + 0.5))
end`),
  lesson('STAT_DIMINISHING_RETURNS','능력치 성장과 한계 효용','BALANCE','stat stats scaling softcap diminishing progression 능력치 성장 소프트캡 밸런스',
    'Use an explicit monotonic curve when investment should have diminishing returns.',
    'Treat cap and half-saturation as tunable server configuration; compare marginal gains, build diversity and interactions with cooldown/crit/defense. Keep displayed and authoritative formulas identical.',
    'Stacking several multipliers can overpower an individually bounded stat; unexplained caps make upgrades feel broken.',
    'Check zero input, monotonicity, near-cap investment, extreme valid builds and displayed rounding.',`
return function(investment, cap, halfSaturation)
    assert(investment >= 0 and cap >= 0 and halfSaturation > 0)
    return cap * investment / (investment + halfSaturation)
end`),
  lesson('ENCOUNTER_BUDGET','몹 배치와 전투 압력','BALANCE','encounter budget spawn placement threat 몹 배치 전투 압력 난이도',
    'Budget encounter pressure while also checking role combinations, space and recovery windows.',
    'Use measured threat costs and a reviewed candidate order; reserve safe spawn/approach areas and visible telegraphs. The cost sum is a planning aid, not proof of difficulty or fairness.',
    'Two control-heavy enemies can be much stronger together than their summed costs; crowded layouts erase counterplay.',
    'Measure damage taken, escape routes, stun chains, time-to-defeat and recovery time across skill levels.',`
return function(candidates, budget)
    local selected, remaining = {}, budget
    for _, candidate in ipairs(candidates) do
        assert(candidate.cost > 0)
        if candidate.cost <= remaining then
            table.insert(selected, candidate.id)
            remaining -= candidate.cost
        end
    end
    return selected, remaining
end`),
  lesson('VISUAL_HIERARCHY_ROLES','미적 구성과 시선 우선순위','ART_DIRECTION','composition focal hierarchy negative space aesthetics 미감 미적 구도 시선 여백',
    'Use a small number of visual roles so the scene communicates a primary focus.',
    'Assign focal/support/background roles to current internal assets; coordinate value, saturation, scale, edge density and lighting. The weights are art-review guidance, not engine material values or automatic beauty scores.',
    'Making every prop bright, sharp and detailed destroys hierarchy; visual focus must still support gameplay clues.',
    'Review the normal gameplay camera in color, grayscale and thumbnail scale; ask viewers to identify threat, objective and route.',`
local roles = {
    Focal = {contrastWeight = 1, detailWeight = 1, accentAllowed = true},
    Support = {contrastWeight = 0.65, detailWeight = 0.6, accentAllowed = false},
    Background = {contrastWeight = 0.35, detailWeight = 0.3, accentAllowed = false},
}
return function(role)
    local profile = roles[role]
    if not profile then return nil end
    return table.clone(profile)
end`),
  lesson('STYLE_GRAMMAR_PROFILES','다양한 화풍의 일관된 제작법','ART_DIRECTION','style art palette painterly watercolor pixel cel lowpoly ink clay 화풍 회화 수채화 픽셀 셀 만화 로우폴리',
    'A style is a coordinated shape, edge, value, texture and lighting grammar, not a random filter.',
    'Apply one selected grammar to approved internal meshes/textures/UI. Cel uses clear value bands; low-poly uses deliberate facets; painterly uses stable brush-scale marks; watercolor uses layered washes; pixel uses a consistent texel grid; ink uses controlled hatching; clay uses broad rounded forms; stylized horror uses quiet surfaces and readable focal contrast. These profiles specify art tasks, not built-in Roblox shaders.',
    'Mixing incompatible texel scales, outline widths and material realism looks accidental; decorative texture cannot fix a weak silhouette.',
    'Produce same-camera comparisons of one prop, one mob and one lobby corner; review silhouette, material consistency, mobile readability and runtime cost before expanding.',`
local styles = {
    Cel = {shape="clean", edge="controlled-outline", value="few-bands", texture="quiet"},
    LowPoly = {shape="deliberate-facets", edge="geometry", value="large-planes", texture="restrained"},
    Painterly = {shape="readable-masses", edge="selective", value="grouped", texture="stable-brush-scale"},
    Watercolor = {shape="simple", edge="soft-selective", value="layered-washes", texture="subtle-paper"},
    Pixel = {shape="grid-aligned", edge="consistent-texels", value="limited-palette", texture="integer-density"},
    Ink = {shape="strong-silhouette", edge="line-weight", value="hatch-groups", texture="directional-marks"},
    Clay = {shape="rounded", edge="broad-bevel", value="soft-gradients", texture="matte"},
    StylizedHorror = {shape="uneasy-readable", edge="focal-sharpness", value="quiet-dark-masses", texture="selective-wear"},
}
return function(name)
    local profile = styles[name]
    if not profile then return nil end
    return table.clone(profile)
end`, 'material'),
  lesson('PALETTE_ROLE_CONSISTENCY','팔레트 역할과 의미 일관성','ART_DIRECTION','palette semantic color contrast accessibility 팔레트 색상 대비 접근성',
    'Assign semantic color roles consistently and carry meaning with shape/text as well.',
    'Provide reviewed palette tokens for background/surface/text/accent/danger/success. Validate text contrast over actual composited backgrounds and color-vision conditions; the mapper itself does not certify accessibility.',
    'Reusing danger color for ordinary decoration or conveying a state only by hue confuses decisions.',
    'Check menus and world indicators in bright/dark scenes, grayscale and color-vision simulations with text/icon alternatives.',`
return function(tokens, role)
    local allowed = {Background=true, Surface=true, Text=true, Accent=true, Danger=true, Success=true}
    if not allowed[role] or tokens[role] == nil then return nil end
    return tokens[role]
end`),
  lesson('DEPTH_LIGHTING_LAYERS','조명·대기감과 공간 깊이','ART_DIRECTION','lighting depth atmosphere fog layers 조명 공간 깊이 대기감 안개',
    'Separate foreground, midground and background while preserving important silhouettes.',
    'Use this monotonic visibility estimate to plan depth contrast, then tune actual Roblox lighting/atmosphere and materials by camera. Density and visibility floor are art parameters, not physical accuracy or native shader settings.',
    'Uniform contrast flattens depth; heavy fog or bloom hides routes and attack telegraphs.',
    'Review near/mid/far landmarks, dark-mode clues and mobile exposure from the same play camera; retain navigation visibility.',`
return function(distance, density, minimumVisibility)
    assert(distance >= 0 and density >= 0 and minimumVisibility >= 0 and minimumVisibility <= 1)
    return math.max(minimumVisibility, math.exp(-density * distance))
end`),
  lesson('IMPORTED_MESH_GROUND_PIVOT','가져온 메시의 지면 피벗','ASSET_LIBRARY','glb pivot spawn grounding float hipheight 스폰 시작위치 공중 지면 피벗',
    'Evaluate transformed mesh bounds and actual rig clearance before placement; a marker cannot be its own support.',
    'Use the existing spawn owner with destination-ground queries, character generation checks and independent contact samples. This function supplies offsets only; it never grants runtime pass.',
    'Using half-height alone ignores off-center pivots; R6 needs leg height plus HipHeight. A delayed operation can place a replaced character.',
    'Test off-center meshes, scale changes, R6/R15, rapid respawns, roof occlusion, blocked clearance and three stable ground samples.',`
return function(minY, scale, groundY, hipHeight, rootHeight, rig, legHeight)
    local function finite(v) return type(v) == "number" and v == v and math.abs(v) < math.huge end
    for _, value in ipairs({minY, scale, groundY, hipHeight, rootHeight}) do if not finite(value) then return nil end end
    if not finite(minY) or not finite(scale) or not finite(groundY) or not finite(hipHeight) or not finite(rootHeight) then return nil end
    if scale <= 0 or rootHeight <= 0 or hipHeight < 0 then return nil end
    if rig ~= "R15" and rig ~= "R6" then return nil end
    if rig == "R6" and (not finite(legHeight) or legHeight <= 0) then return nil end
    local clearance = hipHeight + rootHeight * .5 + (rig == "R6" and legHeight or 0)
    local visualY = groundY - minY * scale
    if not finite(visualY) or not finite(clearance) then return nil end
    return {visualRootY=visualY, characterRootY=groundY+clearance, clearance=clearance}
end`, 'query'),
  lesson('GLTF_PBR_CHANNEL_TRANSFER','플랫폼별 PBR 채널 변환','ASSET_LIBRARY','glb gltf pbr roughness metallic smoothness material 플랫폼 재질 러프니스 메탈니스',
    'Keep base color in sRGB and material data linear. glTF roughness is G, metalness is B; Unity Lit uses smoothness, while Roblox requires separate supported maps.',
    'Apply these decoded values in the existing material/import owner, bind the actual material slot and source hash, and inspect native neutral lighting. Never write a BasePart Roughness property.',
    'Swapping G and B makes stone metallic; copying roughness into smoothness reverses highlight behavior. Gamma correction must not alter data channels.',
    'Use known texels, factor extremes and invalid inputs, then compare the same asset/camera/light on web, Roblox and Unity.',`
return function(green, blue, roughnessFactor, metallicFactor)
    local function unit(v) return type(v)=="number" and v==v and v>=0 and v<=1 end
    if not unit(green) or not unit(blue) or not unit(roughnessFactor) or not unit(metallicFactor) then return nil end
    local roughness=green*roughnessFactor
    local metallic=blue*metallicFactor
    return {web={roughness=roughness,metalness=metallic},roblox={roughness=roughness,metalness=metallic},unity={smoothness=1-roughness,metallic=metallic}}
end`, 'material'),
  lesson('REGRESSION_ACCEPTANCE_MATRIX','소스·실행·회귀 증거 연결','QA','regression evidence artifact revision acceptance 회귀 검증 증거',
    'A release decision needs matching source/artifact identities and independently executed behavior checks.',
    'Use only evidence from the existing trusted QA producers. This pure comparison is an illustrative consumer, not an evidence producer or a substitute release gate.',
    'Self-reported booleans, fixture success or a green workflow wrapper cannot prove native gameplay quality.',
    'Reject missing evidence, changed revision, stale artifact, failed negative cases and unmatched native captures.',`
return function(expected, observed)
    if observed.sourceRevision ~= expected.sourceRevision then return false, "REVISION" end
    if observed.artifactIdentity ~= expected.artifactIdentity then return false, "ARTIFACT" end
    for _, check in ipairs(expected.requiredChecks) do
        if observed.checks[check] ~= "PASS" then return false, check end
    end
    return true
end`),
]);

export function studioLessonMetadata(row){
  const {exampleCode,...metadata}=row;
  return {...metadata,exampleReference:{path:'tools/vibe3-roblox-studio-lessons.mjs',id:row.id,sha256:crypto.createHash('sha256').update(exampleCode).digest('hex')},rawCodeStored:false};
}

export function selectRobloxStudioLessons(goal,{limit=2,maxCodeBytes=3200,domains=null}={}){
  const boundedLimit=Math.max(0,Math.min(2,Math.floor(Number(limit)||0)));
  if(!boundedLimit)return [];
  const text=String(goal??'').slice(0,2000).toLowerCase();
  const ranked=ROBLOX_STUDIO_LESSONS.filter(row=>!domains||domains.includes(row.domain)).map((row,index)=>({row,index,score:row.terms.split(' ').filter(term=>/^[a-z]+$/.test(term)?new RegExp('\\b'+term+'\\b').test(text):text.includes(term)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
  const selected=[];let bytes=0;
  for(const {row} of ranked){
    const size=Buffer.byteLength(row.exampleCode);
    if(bytes+size>maxCodeBytes)continue;
    selected.push(row);bytes+=size;
    if(selected.length>=boundedLimit)break;
  }
  return selected;
}
