# 재운게임즈 멀티 환경

## 구성
- 게임 클라이언트: Godot / 웹게임
- 인증: Supabase Auth (이메일 가입, 로그인, 비밀번호 재설정)
- 매칭/실시간 서버: Cloudflare Workers + Durable Objects + WebSocket
- 협동: 최대 4인
- 대전: 기본 2인
- 친구 플레이: 초대 코드 기반 비공개 세션
- 빠른 매칭: 공개 세션 자동 참가/생성
- 재전: 같은 세션 참가자 전원 동의 시 재전 신호

## API
- `POST /auth/signup` `{email,password,nickname}`
- `POST /auth/login` `{email,password}`
- `POST /auth/refresh` `{refresh_token}`
- `POST /auth/recover` `{email}`
- `GET /auth/me` Bearer 토큰
- `POST /matchmake` Bearer 토큰 + `{mode:"coop"|"pvp"}`
- `POST /friend/create` Bearer 토큰 + `{mode:"coop"|"pvp"}`
- `POST /friend/join` Bearer 토큰 + `{inviteCode}`
- `GET /room/<roomId>?token=<access_token>` WebSocket

## Godot 공통 클라이언트
`multiplayer/multiplayer_client.gd`는 Godot 4용 공통 멀티 클라이언트입니다.

주요 기능:
- 가입 / 로그인 / 세션 갱신
- 협동 자동매칭 `match_coop()`
- 대전 자동매칭 `match_pvp()`
- 친구방 생성 / 참가
- 매칭 완료 후 WebSocket 방 자동 입장
- `state`, `event`, `ready`, `rematch` 메시지 전송
- 플레이어 입장 / 퇴장 신호
- 연결 끊김 감지 및 자동 재접속

게임 프로젝트에서는 이 스크립트를 Autoload로 등록하거나 Node에 붙여 공통으로 사용합니다.

예시:
```gdscript
var result = await MultiplayerClient.login(email, password)
if result.ok:
    await MultiplayerClient.match_coop()

MultiplayerClient.player_joined.connect(_on_player_joined)
MultiplayerClient.message_received.connect(_on_multiplayer_message)
```

`match_coop()`와 `match_pvp()`는 기본값으로 매칭된 `roomId`에 자동 WebSocket 접속합니다. 필요하면 `false`를 넘겨 자동 접속을 끌 수 있습니다.

## 웹게임 공통 클라이언트
`multiplayer/multiplayer-client.js`는 웹게임에서 공통으로 사용하는 ES module 클라이언트입니다.

주요 기능:
- 가입 / 로그인 / 세션 갱신
- 협동 자동매칭 `matchCoop()`
- 대전 자동매칭 `matchPvp()`
- 친구방 생성 / 참가
- 매칭 완료 후 WebSocket 방 자동 입장
- `state`, `event`, `ready`, `rematch` 메시지 전송
- 플레이어 입장 / 퇴장 이벤트
- 연결 끊김 감지 및 자동 재접속

예시:
```html
<script type="module">
  import { JaewoonMultiplayerClient } from '/multiplayer/multiplayer-client.js';

  const multiplayer = new JaewoonMultiplayerClient();

  multiplayer.on('player_joined', (event) => {
    console.log('player joined', event.detail);
  });

  multiplayer.on('message_received', (event) => {
    console.log('multiplayer message', event.detail);
  });

  const login = await multiplayer.login(email, password);
  if (login.ok) {
    await multiplayer.matchCoop();
  }
</script>
```

`matchCoop()`와 `matchPvp()`는 기본값으로 매칭된 `roomId`에 자동 WebSocket 접속합니다. 필요하면 두 번째 인수로 `false`를 넘겨 자동 접속을 끌 수 있습니다.

## Cloudflare 설정
`multiplayer/`에서 Wrangler로 Worker를 배포합니다.

필수 환경값:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

`SUPABASE_PUBLISHABLE_KEY`는 Supabase의 publishable/anon 계열 공개 클라이언트 키이며 서비스 역할 키를 사용하지 않습니다.

예시 설정:
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler deploy
```

## Supabase 설정
1. 새 프로젝트 생성
2. Authentication에서 Email/Password 활성화
3. Site URL을 `https://jaewoon-games.pages.dev`로 설정
4. Redirect URLs에도 위 사이트 주소를 허용
5. Project URL과 publishable key를 Cloudflare Worker secret으로 등록

## 게임에서의 기본 흐름
1. 가입/로그인 후 access token 확보
2. 협동은 `mode=coop`, 대전은 `mode=pvp`로 `/matchmake` 호출
3. 받은 `roomId`로 WebSocket 접속
4. 위치/공격/체력 등의 게임 이벤트는 WebSocket 메시지로 교환
5. 서버 권한 판정이 필요한 게임은 게임별로 `GameRoom` 검증 로직을 추가

## 주의
현재 파일은 공통 멀티 기반입니다. 각 게임의 실제 위치/전투/적/점수 동기화 규칙은 게임을 멀티화할 때 별도로 연결해야 합니다. 기존 게임 수치와 저장키는 변경하지 않습니다.
