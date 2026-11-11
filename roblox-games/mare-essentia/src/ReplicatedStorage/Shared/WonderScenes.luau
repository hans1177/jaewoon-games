--!strict
-- 원더 연출: 세계의 큰 유적·지형·건축물 카드를 처음 발견하면 약 10초 동안 큰 원화가 스스로 그려지듯 나타나고,
-- 그 장면에 맞는 음악이 흐른다 (문명 시리즈의 원더 영상처럼). 카드 id → 큰 원화(event_*)와 자막.
-- 자막의 설명은 일반적인 역사 상식이며 구현 전 출처 확인이 필요하다 (docs/CATALOG.md).
-- mood: nature(자연·산·사막) → 바다 음악 + 바람 소리, temple(사원·유적) → 항구 음악 + 종소리

export type Scene = { art: string, title: string, lines: { string }, mood: string }

local W = {}

W.Duration = 10 -- 초

W.Scenes = {
	site_stonehenge = { art = "event_stonehenge", title = "스톤헨지", mood = "nature",
		lines = { "솔즈베리 평원에 선 거대한 돌의 고리.", "오래전 사람들이 해와 계절을 읽으려 세웠다고 전해진다.", "누가, 어떻게 돌을 옮겼는지는 아직도 수수께끼다." } },
	site_petra = { art = "event_petra", title = "페트라", mood = "temple",
		lines = { "붉은 사암 절벽을 깎아 만든 사막의 도시.", "향료와 비단이 오가던 대상 무역의 길목이었다.", "좁은 협곡을 지나야 그 모습이 드러난다." } },
	site_pyramid = { art = "event_giza", title = "기자의 대피라미드", mood = "temple",
		lines = { "수천 년을 버텨 온 왕의 돌산.", "수많은 사람의 손으로 돌을 하나하나 쌓아 올렸다.", "바다를 건넌 나그네도 먼 길에서 그 윤곽을 알아본다." } },
	site_angkor = { art = "event_angkor", title = "앙코르 와트", mood = "temple",
		lines = { "밀림 속에 솟은 거대한 사원의 도시.", "물길과 사원이 하나의 도시를 이루었다.", "탑 끝마다 아침 안개가 걸린다." } },
	site_great_wall = { art = "event_great_wall", title = "만리장성", mood = "nature",
		lines = { "산등성이를 따라 끝없이 이어진 성벽.", "여러 왕조가 오랜 세월에 걸쳐 쌓고 고쳤다.", "북쪽 바람이 늘 성벽을 스쳐 간다." } },
	site_chichen_itza = { art = "event_chichen", title = "치첸이트사 엘카스티요", mood = "temple",
		lines = { "마야의 계단식 피라미드.", "해의 움직임에 맞추어 설계되었다고 전해진다.", "정글 한가운데에서 별과 계절을 셌다." } },
	pac_moai = { art = "event_moai", title = "라파누이의 모아이", mood = "nature",
		lines = { "먼 바다 외딴 섬에 선 거대한 돌 얼굴들.", "바다를 등지고 마을을 굽어본다.", "누가 왜 세웠는지 섬은 말이 없다." } },
	site_machu_picchu = { art = "event_machu_picchu", title = "마추픽추", mood = "nature",
		lines = { "안데스 산마루, 구름 위의 석조 도시.", "돌을 정교하게 맞춰 쌓은 계단밭과 집터가 남았다.", "산새만이 옛 광장을 지킨다." } },
	site_uluru = { art = "event_uluru", title = "울루루", mood = "nature",
		lines = { "붉은 사막 한가운데 솟은 거대한 바위.", "이 땅의 원주민에게 오래전부터 신성한 곳이다.", "해가 지면 바위가 불꽃처럼 물든다." } },
} :: { [string]: Scene }

W.Moods = {
	nature = { music = "music_sea", sfx = "sfx_wind" },
	temple = { music = "music_harbor", sfx = "sfx_bell" },
} :: { [string]: { music: string, sfx: string } }

return W
