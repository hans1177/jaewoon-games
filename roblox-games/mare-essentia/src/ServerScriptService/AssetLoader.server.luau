--!nonstrict
-- 파일명: AssetLoader.server.luau
-- 등록된 상업 이용 가능 모델을 기존 MareAssets 라이브러리에 로드한다.
-- 역할: 항구·시장 필수 모델을 우선, 동시 InsertService 호출을 제한한다.

local InsertService = game:GetService("InsertService")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local library = ReplicatedStorage:WaitForChild("MareAssets")
local ok, ids = pcall(function()
	return require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("AssetIds"))
end)
if not ok or type(ids) ~= "table" then
	warn("[MareEssentia] 자산 등록번호를 불러올 수 없음")
	ReplicatedStorage:SetAttribute("MareAssetsReady", true)
	return
end

-- [승인된 무료 PBR 원본] 등록 Image ID가 모두 확인된 경우에만 원본 UV 메시의 표면을 보강한다.
-- 원래 TextureID/SurfaceAppearance/MaterialVariant가 있는 메시, 복식 UV 없는 GLB는 손대지 않는다.
-- 모델을 기존 MareAssets에 넣기 전 1회 적용하므로 클론·NPC 거리 갱신 비용은 증가하지 않는다.
local MATERIAL_FINISHES = {
	["Town/house"] = { normal = "mat_wall_plaster_beige_n", rough = "mat_wall_plaster_beige_r" },
	["Town/bench_A"] = { color = "mat_wood_planks_worn_bc", normal = "mat_wood_planks_worn_n", rough = "mat_wood_planks_worn_r" },
	["Town/bench_B"] = { color = "mat_wood_planks_worn_bc", normal = "mat_wood_planks_worn_n", rough = "mat_wood_planks_worn_r" },
	["Town/cobblestones"] = { color = "mat_stone_paving_historic_bc", normal = "mat_stone_paving_historic_n", rough = "mat_stone_paving_historic_r" },
	["Terrain/bridge-stone"] = { normal = "mat_stone_paving_historic_n", rough = "mat_stone_paving_historic_r" },
}

-- [로블록스 선박 재질 복구] 등록된 36척의 원본·모바일 GLB는 같은 팔레트와 재질별 메시를 사용한다.
-- 수입기가 GLB의 baseColorFactor를 흰색으로 놓쳐도 메시 이름 끝의 원본 재질명으로 복원한다.
-- 원본 모델, 기존 텍스처 맵, 자산번호, 외부 업로드 경로는 변경하지 않는다.
local SHIP_V5_COLORS = {
	hull = Color3.fromRGB(98, 59, 36),
	hull2 = Color3.fromRGB(124, 73, 43),
	darkwood = Color3.fromRGB(62, 39, 29),
	wood = Color3.fromRGB(162, 105, 58),
	pine = Color3.fromRGB(189, 138, 81),
	pale = Color3.fromRGB(222, 181, 108),
	deck = Color3.fromRGB(178, 124, 74),
	decklight = Color3.fromRGB(199, 150, 91),
	seam = Color3.fromRGB(83, 55, 35),
	rope = Color3.fromRGB(110, 86, 57),
	rig = Color3.fromRGB(91, 68, 48),
	iron = Color3.fromRGB(67, 76, 81),
	black = Color3.fromRGB(31, 41, 43),
	bronze = Color3.fromRGB(168, 112, 53),
	gold = Color3.fromRGB(223, 178, 78),
	lightgold = Color3.fromRGB(245, 211, 130),
	sail = Color3.fromRGB(241, 220, 173),
	sail2 = Color3.fromRGB(226, 193, 137),
	sailbright = Color3.fromRGB(250, 235, 200),
	ivory = Color3.fromRGB(241, 228, 200),
	sailshade = Color3.fromRGB(194, 169, 133),
	red = Color3.fromRGB(146, 52, 43),
	red2 = Color3.fromRGB(190, 76, 51),
	vermillion = Color3.fromRGB(179, 66, 38),
	blue = Color3.fromRGB(56, 104, 121),
	blue2 = Color3.fromRGB(85, 154, 166),
	teal = Color3.fromRGB(29, 114, 126),
	turquoise = Color3.fromRGB(65, 171, 173),
	mint = Color3.fromRGB(122, 210, 193),
	olive = Color3.fromRGB(80, 100, 73),
	cream = Color3.fromRGB(242, 228, 183),
	ghost = Color3.fromRGB(97, 157, 143),
	ghostdark = Color3.fromRGB(38, 66, 72),
	window = Color3.fromRGB(211, 173, 95),
	reed = Color3.fromRGB(179, 153, 93),
	reed2 = Color3.fromRGB(208, 183, 110),
	white = Color3.fromRGB(245, 241, 224),
	silver = Color3.fromRGB(171, 187, 190),
}
local SHIP_V5_MATERIALS = {
	-- [선체·갑판] 나뭇결과 판재의 미세한 무늬를 Roblox 기본 재질로 표현한다.
	hull = Enum.Material.WoodPlanks, hull2 = Enum.Material.WoodPlanks,
	darkwood = Enum.Material.WoodPlanks, wood = Enum.Material.WoodPlanks,
	pine = Enum.Material.WoodPlanks, pale = Enum.Material.Wood,
	deck = Enum.Material.WoodPlanks, decklight = Enum.Material.WoodPlanks,
	seam = Enum.Material.Wood, reed = Enum.Material.Wood, reed2 = Enum.Material.Wood,
	-- [돛·밧줄] 금속 광택 대신 거친 캔버스·직물 표면을 사용한다.
	sail = Enum.Material.Fabric, sail2 = Enum.Material.Fabric,
	sailbright = Enum.Material.Fabric, sailshade = Enum.Material.Fabric,
	ivory = Enum.Material.Fabric, white = Enum.Material.Fabric,
	cream = Enum.Material.Fabric, rope = Enum.Material.Fabric, rig = Enum.Material.Wood,
	-- [함포·장식] 색이 유지되는 단단한 주조 금속 표면.
	iron = Enum.Material.Metal, black = Enum.Material.Metal,
	bronze = Enum.Material.Metal, gold = Enum.Material.Metal,
	lightgold = Enum.Material.Metal, silver = Enum.Material.Metal,
	window = Enum.Material.Glass,
}
local function restoreShipV5Materials(model, assetName)
	-- [72척 원본·경량판만] 기존 선박·교역품·항구·인물·건물 재질은 건드리지 않는다.
	if not (assetName:match("%-v5$") or assetName:match("%-v5%-mobile$")) then return 0, 0 end
	local restored, unrecognized = 0, 0
	for _, piece in model:GetDescendants() do
		if piece:IsA("MeshPart") then
			-- 원본 제작기는 '선박ID_역할_재질'로 모든 개별 메시의 이름을 지정한다.
			local material = piece.Name:lower():match("_([%w]+)$")
			if not SHIP_V5_COLORS[material] and piece.Parent then
				material = piece.Parent.Name:lower():match("_([%w]+)$")
			end
			local color = SHIP_V5_COLORS[material]
			if color then
				piece.Color = color
				local surface = piece:FindFirstChildOfClass("SurfaceAppearance")
				local textured = piece.TextureID ~= "" or (surface and surface.ColorMap ~= "")
				-- [질감 보존] 승인된 PBR ColorMap은 제거하거나 새로 덮지 않는다.
				-- 맵 없는 모델은 목재·천·금속의 기본 재질로 구분해 회색 평면처럼 보이지 않게 한다.
				if not textured then
					local finish = SHIP_V5_MATERIALS[material]
					if not finish and (material == "red" or material == "red2" or material == "vermillion"
						or material == "blue" or material == "blue2" or material == "teal" or material == "turquoise"
						or material == "mint" or material == "olive" or material == "ghost" or material == "ghostdark") then
						local n = piece.Name:lower()
						finish = if n:find("_flags_", 1, true) or n:find("_rigging_", 1, true) then Enum.Material.Fabric
							else Enum.Material.WoodPlanks
					end
					if finish then piece.Material = finish end
					if surface then surface.Color = color end
				end
				restored += 1
			else
				unrecognized += 1
			end
		end
	end
	return restored, unrecognized
end

-- 메인 화면에서 쓰는 모델부터 로드하고, 나머지는 기존 폴더로 계속 채운다.
local order = { Town = 1, Naval = 2, Cargo = 3, Interior = 4, Terrain = 5, Castle = 6, Relics = 7, People = 8 }
-- [항구·탐험 초반 조경] 먼저 등록된 승인 메시만 기존 로딩 큐의 맨 앞에서 수입한다.
-- 별도 작업 큐나 임시 모델을 만들지 않고, 기존 우선 선박 두 종 다음에 배치한다.
local earlyScenery = { ["Terrain/Grass_Small"] = true, ["Terrain/Bush_Small"] = true, ["Terrain/Rock_2"] = true }
-- [R15 실물 복식] 현재 주민·동료 프로필이 실제 사용하는 People 메시만 기존 로더에서 앞당긴다.
-- 장면 진입 후 지연 로드 재장착도 유지하며, 새 큐·모델·다운로드 경로를 만들지 않는다.
local earlyMobParts = {
	["People/male_ranger_body"] = true,
	["People/female_ranger_body"] = true,
	["People/male_ranger_head_hood"] = true,
	["People/female_ranger_head_hood"] = true,
	["People/male_ranger_acc_pauldron"] = true,
	["People/female_ranger_acc_pauldrons"] = true,
	["People/male_peasant_body"] = true,
	["People/female_peasant_body"] = true,
	["People/hair_beard"] = true,
	["People/hair_buns"] = true,
	["People/hair_long"] = true,
	["People/hair_simpleparted"] = true,
	["People/hair_buzzed"] = true,
	["People/hair_buzzedfemale"] = true,
	-- [신규 승인 3D 머리·액세서리] AssetIds에 등록된 경우에만 기존 우선 로딩 큐에 들어간다.
	["People/hair_braided_crown"] = true,
	["People/hair_low_bun"] = true,
	["People/hair_sailor_ponytail"] = true,
	["People/hair_side_braid"] = true,
	["People/hair_shoulder_waves"] = true,
	["People/hair_court_curls"] = true,
	["People/acc_sailor_headband"] = true,
	["People/acc_pearl_hairpin"] = true,
	["People/acc_ribbon_bow"] = true,
	["People/acc_feather_hat"] = true,
	["People/acc_guild_badge"] = true,
	-- [직업용 소지품 선입고] 35개 직업의 22종 등록된 원본 도구를 기존 큐의 People 복식과 함께 적재한다.
	["Cargo/corn"] = true,
	["Relics/rope-bundle-b"] = true,
	["Relics/rope-bundle-a"] = true,
	["Cargo/bag"] = true,
	["Cargo/bucket"] = true,
	["Relics/drafting-compass"] = true,
	["Relics/handplane"] = true,
	["Relics/hammer"] = true,
	["Cargo/linen"] = true,
	["Cargo/bread"] = true,
	["Relics/saw"] = true,
	["Relics/chisel"] = true,
	["Cargo/fish"] = true,
	["Relics/compass-base"] = true,
	["Relics/weapon-spear"] = true,
	["Relics/weapon-sword"] = true,
	["Relics/journal-open"] = true,
	["Relics/key"] = true,
	["Relics/journal-closed"] = true,
	["Relics/magnifying-glass"] = true,
	["Relics/map-rolled"] = true,
	["Cargo/plate"] = true,
	-- [직접 제작 유럽풍 의상] 로블록스 등록된 3D 재단복만 기존 People 큐에서 로드.
	["People/outfit_vest"] = true,
	["People/outfit_coat"] = true,
	["People/outfit_guard"] = true,
	["People/outfit_apron"] = true,
	["People/outfit_sash"] = true,
	["People/outfit_belt"] = true,
	["People/outfit_cuff"] = true,
	["People/outfit_boot"] = true,
	["People/outfit_stole"] = true,
}
local queue = {}
for key, assetId in ids do
	local kind, name = string.match(key, "^(%w+)/(.+)$")
	-- UI 이미지(메뉴·교역품·초상화·도감/이벤트 원화)는 모델이 아니므로 InsertService에서 제외한다.
	if kind and name and kind ~= "Menu" and kind ~= "Goods" and kind ~= "Portraits" and kind ~= "CardArt" and kind ~= "Materials" and type(assetId) == "number" and assetId > 0 then
		table.insert(queue, { kind = kind, name = name, id = assetId, key = key })
	end
end
-- 시작 프롤로그에서 사용하는 승인된 실물 범선을 먼저 로드한다.
-- 항구 필수 모델을 제외하거나 기존 큐·동시성 구조를 변경하지 않는다.
table.sort(queue, function(a, b)
	local ap = if a.key == "Naval/ship-large" then -1 elseif a.key == "Naval/ship-medium" then 0 elseif earlyScenery[a.key] then 0.5
		elseif a.kind == "Relics" and string.match(a.name, "^weapon%-") then 0.75
		elseif earlyMobParts[a.key] then 0.8 else order[a.kind] or 99
	local bp = if b.key == "Naval/ship-large" then -1 elseif b.key == "Naval/ship-medium" then 0 elseif earlyScenery[b.key] then 0.5
		elseif b.kind == "Relics" and string.match(b.name, "^weapon%-") then 0.75
		elseif earlyMobParts[b.key] then 0.8 else order[b.kind] or 99
	if ap ~= bp then return ap < bp end
	return a.key < b.key
end)

local cursor = 1
local pending, loaded, failed = #queue, 0, 0
local shipColorModels, shipColorParts, shipUnknownParts, shipColorExpected = 0, 0, 0, 0
-- [스튜디오 실물 재질 점검] 등록 원본 9종을 한 번만 집계한다. 게임 저장/선적/재질은 건드리지 않는다.
local outfitModels, outfitParts, outfitWhite, outfitMapped, outfitMaterialized = 0, 0, 0, 0, 0
local outfitColorMaps, outfitNormalMaps, outfitRoughnessMaps, outfitMetalnessMaps = 0, 0, 0, 0
local outfitMissing = {}
for _, item in queue do
	if item.kind == "Naval" and (item.name:match("%-v5$") or item.name:match("%-v5%-mobile$")) then
		shipColorExpected += 1
	end
end
-- [Studio QA] 등록 모델 전체의 실제 로딩 성공·실패를 카운트하며 라이브 저장/동작은 건드리지 않는다.
local studioAudit = RunService:IsStudio()
local failedKeys = {}
-- [3D 품질 자동 검사] 로딩된 승인 모델의 실측 공간 크기만 Studio에서 감사한다.
-- 원본 메시/UV/PBR, AssetId, 게임 진행 데이터, 실서버 성능은 변경하지 않는다.
local geometryChecked, geometryInvalid = 0, 0
local geometryIssues = {}
if studioAudit then
	ReplicatedStorage:SetAttribute("MareModelGeometryAuditState", "RUNNING")
	ReplicatedStorage:SetAttribute("MareModelAuditState", "RUNNING")
	ReplicatedStorage:SetAttribute("MareModelAuditTotals", "")
	ReplicatedStorage:SetAttribute("MareOutfitMaterialAuditState", "RUNNING")
end
local priorityPending = 0
for _, asset in queue do
	if (order[asset.kind] or 99) <= 3 or earlyScenery[asset.key] then priorityPending += 1 end
end

if studioAudit and #queue == 0 then
	ReplicatedStorage:SetAttribute("MareModelAuditTotals", HttpService:JSONEncode({registered = 0, loaded = 0, failed = 0, errors = { "NO_REGISTERED_MODELS" }}))
	ReplicatedStorage:SetAttribute("MareModelAuditState", "FAIL")
	ReplicatedStorage:SetAttribute("MareModelGeometryAuditState", "FAIL")
	ReplicatedStorage:SetAttribute("MareOutfitMaterialAuditState", "FAIL")
end
for _ = 1, 12 do
	task.spawn(function()
		while cursor <= #queue do
			local item = queue[cursor]
			cursor += 1
			local good, container = pcall(InsertService.LoadAsset, InsertService, item.id)
			if good and container then
				local model = container:FindFirstChildWhichIsA("Model") or container
				local group = library:FindFirstChild(item.kind)
				if model:IsA("Model") and model:FindFirstChildWhichIsA("BasePart", true) and group then
					-- [기존 원본 품질 검사] 등록된 모델의 실제 3축 크기만 스튜디오에서 확인.
					-- 메시를 합성하거나 텍스처/스케일을 임의 수정하지 않는다.
					if studioAudit then
						geometryChecked += 1
						local boundsOk, _, bounds = pcall(model.GetBoundingBox, model)
						local valid = boundsOk and bounds
							and bounds.X > 0.0001 and bounds.Y > 0.0001 and bounds.Z > 0.0001
							and bounds.X < math.huge and bounds.Y < math.huge and bounds.Z < math.huge
						if not valid then
							geometryInvalid += 1
							if #geometryIssues < 24 then table.insert(geometryIssues, item.key) end
						end
					end
					-- [항구 우물] Studio 실측에서 콘텐츠 표현이 없는 5개 TextureID만 제거한다.
					-- CC0 원본 모델의 메시·스케일·구조는 보존하며, 라이브러리 복제 전에 재질을 복구한다.
					if item.key == "Town/village-well" then
						local unavailable = {
							["131733628065975"] = true, ["111140593310889"] = true,
							["134307586169558"] = true, ["139141388446795"] = true,
							["118471529732548"] = true,
						}
						local repaired = 0
						for _, mesh in model:GetDescendants() do
							if mesh:IsA("MeshPart") and unavailable[mesh.TextureID:match("%d+") or ""] then
								mesh.TextureID = ""
								mesh.MaterialVariant = ""
								local name = mesh.Name:lower()
								if name:find("stone ring", 1, true) then
									mesh.Material = Enum.Material.Slate
									mesh.Color = Color3.fromRGB(120, 119, 110)
								elseif name:find("bail", 1, true) then
									mesh.Material = Enum.Material.CorrodedMetal
									mesh.Color = Color3.fromRGB(105, 105, 99)
								elseif name:find("rope", 1, true) then
									mesh.Material = Enum.Material.Fabric
									mesh.Color = Color3.fromRGB(161, 148, 117)
								else
									mesh.Material = Enum.Material.Wood
									mesh.Color = Color3.fromRGB(119, 95, 70)
								end
								repaired += 1
							end
						end
						print("[MareEssentia] village-well unavailable textures removed=" .. repaired)
					end
					-- [36척 선체 색상] 수입 모델을 라이브러리에 넣기 전 한 번만 색·질감을 복원한다.
					-- 항구/해전/조선소는 기존 템플릿을 복제하므로 추가 처리 비용이 없다.
					if item.kind == "Naval" and (item.name:match("%-v5$") or item.name:match("%-v5%-mobile$")) then
						local colored, unknown = restoreShipV5Materials(model, item.name)
						if colored > 0 then shipColorModels += 1 end
						shipColorParts += colored
						shipUnknownParts += unknown
					end
					-- [실제 수입 재질 감사] GLB 9종이 Roblox에 들어온 상태 그대로 판별한다.
					-- Runtime 모델에 임의 색을 칠하지 않으며 오직 Studio 진단값만 수집한다.
					if studioAudit and item.kind == "People"
						and string.sub(item.name, 1, 7) == "outfit_" then
						outfitModels += 1
						for _, piece in model:GetDescendants() do
							if piece:IsA("MeshPart") then
								outfitParts += 1
								local color = piece.Color
								if color.R > 0.94 and color.G > 0.94 and color.B > 0.94 then
									outfitWhite += 1
								end
								if piece.Material == Enum.Material.Metal or piece.Material == Enum.Material.Fabric
									or piece.Material == Enum.Material.Leather then
									outfitMaterialized += 1
								end
								local surface = piece:FindFirstChildOfClass("SurfaceAppearance")
								if piece.TextureID ~= "" or (surface and surface.ColorMap ~= "") then
									outfitMapped += 1
								end
								-- [실물 재질 4종] 색만 입힌 플라스틱이 아닌 원본 256px 텍스처 여부를 확인한다.
								if surface then
									if surface.ColorMap ~= "" then outfitColorMaps += 1 end
									if surface.NormalMap ~= "" then outfitNormalMaps += 1 end
									if surface.RoughnessMap ~= "" then outfitRoughnessMaps += 1 end
									if surface.MetalnessMap ~= "" then outfitMetalnessMaps += 1 end
								end
							end
						end
					end
					-- [원본 PBR 보존] 로블록스 서버 실행 중 SurfaceAppearance 맵 쓰기는 권한 오류를 낸다.
					-- 기존 등록 모델의 원본 맵/MaterialVariant는 보존하며 런타임에 새 맵을 만들지 않는다.
					-- 승인된 재질 맵 연결은 기존 자산 제작·재등록 경로에서 완료해야 한다.
					if MATERIAL_FINISHES[item.key] then
						local authoredFinish = false
						for _, mesh in model:GetDescendants() do
							if mesh:IsA("MeshPart") and (mesh.TextureID ~= "" or mesh.MaterialVariant ~= ""
								or mesh:FindFirstChildOfClass("SurfaceAppearance")) then
								authoredFinish = true
								break
							end
						end
						if not authoredFinish then
							model:SetAttribute("PBRFinishPending", item.key)
						end
					end
					model.Name = item.name
					model.Parent = group
					if model ~= container then container:Destroy() end
					loaded += 1
				else
					container:Destroy()
					failed += 1
					if #failedKeys < 24 then table.insert(failedKeys, item.key .. ":INVALID_MODEL") end
					warn("[MareEssentia] 자산 모델 형식 오류", item.key, item.id)
				end
			else
				failed += 1
				if #failedKeys < 24 then table.insert(failedKeys, item.key .. ":LOAD_FAILED") end
				warn("[MareEssentia] 모델 불러오기 실패", item.key, item.id, container)
			end
			pending -= 1
			if (order[item.kind] or 99) <= 3 or earlyScenery[item.key] then priorityPending -= 1 end
			if studioAudit and pending == 0 then
				-- [원본 복식 수입 상태] 재질·텍스처 맵이 실제로 살아 있는지 검증한다.
				-- 9종이 모두 로드돼도 색상이 흰색으로 유실됐다면 성공으로 보고하지 않는다.
				local importedPeople = library:FindFirstChild("People")
				for _, garment in { "outfit_vest", "outfit_coat", "outfit_guard", "outfit_apron",
					"outfit_sash", "outfit_belt", "outfit_cuff", "outfit_boot", "outfit_stole" } do
					if not importedPeople or not importedPeople:FindFirstChild(garment) then
						table.insert(outfitMissing, garment)
					end
				end
				ReplicatedStorage:SetAttribute("MareOutfitMaterialAudit", HttpService:JSONEncode({
					expected = 9, loaded = outfitModels, meshParts = outfitParts,
					whiteParts = outfitWhite, mappedParts = outfitMapped,
					colorMaps = outfitColorMaps, normalMaps = outfitNormalMaps,
					roughnessMaps = outfitRoughnessMaps, metalnessMaps = outfitMetalnessMaps,
					nativeMaterialParts = outfitMaterialized, missing = outfitMissing,
				}))
				ReplicatedStorage:SetAttribute("MareOutfitMaterialAuditState",
					if outfitModels == 9 and outfitParts >= 9 and outfitWhite == 0
						and outfitColorMaps >= 9 and outfitNormalMaps >= 9 and outfitRoughnessMaps >= 9
						and outfitMetalnessMaps >= 1 then "PASS" else "FAIL")
				-- [스튜디오 독립 진단] 미복원 메시가 남았는지 확인할 수 있도록 집계만 기록한다.
				ReplicatedStorage:SetAttribute("MareShipV5ColorAudit", HttpService:JSONEncode({
					expected = shipColorExpected, models = shipColorModels,
					restoredParts = shipColorParts, unnamedParts = shipUnknownParts,
				}))
				ReplicatedStorage:SetAttribute("MareShipV5ColorAuditState",
					if shipColorExpected == 72 and shipColorModels == 72 and shipColorParts > 0 and shipUnknownParts == 0 then "PASS" else "FAIL")
				ReplicatedStorage:SetAttribute("MareModelGeometryAudit", HttpService:JSONEncode({
					checked = geometryChecked, invalid = geometryInvalid, affected = geometryIssues,
				}))
				ReplicatedStorage:SetAttribute("MareModelGeometryAuditState",
					if geometryInvalid == 0 and geometryChecked == #queue then "PASS" else "FAIL")
				ReplicatedStorage:SetAttribute("MareModelAuditTotals", HttpService:JSONEncode({registered = #queue, loaded = loaded, failed = failed, errors = failedKeys}))
				ReplicatedStorage:SetAttribute("MareModelAuditState", if failed == 0 and loaded == #queue then "PASS" else "FAIL")
			end
		end
	end)
end

local deadline = os.clock() + 30
while priorityPending > 0 and os.clock() < deadline do
	task.wait(0.25)
end
if priorityPending > 0 then
	warn("[MareEssentia] 우선 모델 불러오기 제한시간 도달", priorityPending)
end
print(string.format("[MareEssentia] 모델 초기 로드 %d개, 실패 %d개, 대기 %d개", loaded, failed, pending))
ReplicatedStorage:SetAttribute("MareAssetsReady", true)

