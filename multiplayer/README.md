# 재운게임즈 멀티 환경

## 모든 새 게임의 간편 멀티 기본 규칙

- 기본 입장은 **이메일 없는 방 만들기 / 방 참가** 두 버튼만 표시한다.
- 초대 번호는 **0~9 한 자리 숫자**이며 각 게임마다 번호 공간이 독립적이다.
- 같은 게임에서 사용 중인 번호는 중복 생성하지 않고, 사용자가 방을 떠나거나 제한 시간이 지나면 다시 사용할 수 있다.
- 푸른 항로·파티 RPG·보석 생존전은 방 최대 4명, 포근섬 성채 대전은 기존 규칙에 맞게 2명이다.
- 입장 서버는 기존 `multiplayer/worker.js`의 `Matchmaker`와 `GameRoom`, 클라이언트는 기존 `multiplayer-client.js`를 계속 사용한다. 독립 서버나 우회 로그인, 새 저장 구조를 추가하지 않는다.
- 접속/방 인원·동기화·연결 끊김·나가기·권한 검증을 별도로 테스트한다. **동일 방 접속 성공과 게임 전체 동기화 완료는 별개의 검증 항목**이다.
- 기존 게임의 체력·공격력·보상·진행·저장키는 변경하지 않고, 미구현 협동 전투를 완료된 것으로 표시하지 않는다.

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
- `POST /matchmake` Bearer 토큰 + `{mode:"coop"|"pvp", gameId}`
- `POST /friend/create` Bearer 토큰 + `{mode:"coop"|"pvp", gameId}`
- `POST /friend/join` Bearer 토큰 + `{inviteCode}`
- `GET /room/<roomId>?token=<access_token>` WebSocket

## Godot 공통 클라이언트
`multiplayer/multiplayer_client.gd`는 Godot 4용 공통 멀티 클라이언트입니다.

주요 기능:
- 가입 / 로그인 / 세션 갱신
- 협동 자동매칭 `match_coop()` / 게임별 `match_coop_for_game(game_id)`
- 대전 자동매칭 `match_pvp()` / 게임별 `match_pvp_for_game(game_id)`
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

## 게임별 매칭 분리
여러 게임이 같은 멀티 서버를 쓰기 때문에 실제 게임에서는 반드시 고유한 `gameId`를 사용합니다. 예: `crystal-defense`, `monster-adventure`. 같은 `mode`라도 `gameId`가 다르면 서로 매칭되지 않습니다. 기존 호출은 호환성을 위해 `default` 게임으로 처리됩니다.

Godot: `await MultiplayerClient.match_coop_for_game("crystal-defense")`

Web: `await multiplayer.matchCoopForGame('crystal-defense')`

## 무료 플랜 배포 (Cloudflare Workers Free)
- `multiplayer/wrangler.toml`의 `workers_dev = true`를 사용해 별도 유료 도메인 없이 `*.workers.dev` 주소로 배포합니다.
- `MATCHMAKER`, `ROOMS`는 기존 `new_sqlite_classes` 마이그레이션으로 SQLite Durable Objects를 사용합니다. 유료 전용 KV-backed Durable Objects로 변경하지 않습니다.
- 기존 `GameRoom`은 `ctx.acceptWebSocket`을 사용하여 WebSocket 연결의 유휴 절전(hibernation)을 지원합니다. 유휴 폴링 타이머를 추가하지 않습니다.
- Cloudflare 계정은 반드시 **Workers Free 플랜**에서 설정해야 하며, 무료 사용량 제한 초과 시 요청이 제한될 수 있습니다. 이 저장소 설정만으로 계정이 자동으로 무료 플랜으로 변경되지는 않습니다.
- **정적 코드 작업 완료 기준:** Worker 문법·Wrangler 무료 플랜 설정·기존 독립 게임 개발 워크플로 분리 검증 및 main 병합. WebSocket 실접속 테스트와 원격 배포는 이 정적 완료 기준의 필수 차단 단계가 아닙니다.
- **멀티플레이 배포 완료 기준:** Worker 정적 코드 검사와 빌드 성공, 실제 Wrangler 배포 명령의 성공 응답으로 배포 완료를 판정합니다. WebSocket 실접속·2명 동기화 검증은 배포 완료의 필수 차단 단계가 아닙니다. 실제 배포 증거가 없거나 빌드가 실패하면 배포 성공으로 기록하지 않습니다.
- **프로젝트의 멀티플레이어 기능 완료 판정:** Worker 문법, 필수 WebSocket 처리 및 방/매칭 코드의 정적 검사, 무료 Wrangler 설정과 독립 개발 흐름 검사만 통과하면 `MULTIPLAYER_STATIC_PASS`로 완료 판정합니다. 사람 또는 가상 플레이어의 실접속·동기화 테스트는 필수 요구사항이 아닙니다.
- **증거 범위:** 정적 완료 판정은 실제 접속 성공을 입증하지 않으므로 실접속을 수행하지 않았다면 `MULTIPLAYER_RUNTIME_UNVERIFIED`를 별도 기록합니다. 기존 보안·중앙정책 검사와 실제 배포 성공 응답 요건은 그대로 유지합니다.
- Supabase Auth도 무료 플랜 한도를 확인해야 합니다. 기존 프로젝트 키는 변경하지 않습니다.

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
