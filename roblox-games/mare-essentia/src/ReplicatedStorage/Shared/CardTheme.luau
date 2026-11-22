--!strict
-- CardTheme.luau
-- 카드 전투와 보관함에서 공유하는 재질 색. 카드 지역색과 희귀도는 각 화면에서 표시한다.
-- [카드 비율] 모바일 그웬트식 세로 7:10. 모든 카드 틀이 이 비율을 공유한다(화면에 맞춰 자동 조절).
local CARD_RATIO = 0.7
return {
	cardRatio = CARD_RATIO,
	cardW = 100,
	cardH = 143, -- 100 / 0.7
	regionFrames = {
		eu = "CardArt/ui_frame_europe", ea = "CardArt/ui_frame_east_asia",
		me = "CardArt/ui_frame_middle_east", nw = "CardArt/ui_frame_new_world",
		af = "CardArt/ui_frame_africa", sa = "CardArt/ui_frame_southeast_asia",
	},
	leather = Color3.fromRGB(21, 29, 39),
	panel = Color3.fromRGB(30, 42, 54),
	inset = Color3.fromRGB(13, 22, 32),
	brass = Color3.fromRGB(169, 129, 75),
	parchment = Color3.fromRGB(224, 205, 163),
	ink = Color3.fromRGB(45, 33, 25),
	cream = Color3.fromRGB(250, 236, 200),
	gold = Color3.fromRGB(241, 207, 144),
	allied = Color3.fromRGB(27, 57, 64),
	rival = Color3.fromRGB(71, 42, 39),
	confirm = Color3.fromRGB(45, 76, 67),
	danger = Color3.fromRGB(112, 57, 48),
}
