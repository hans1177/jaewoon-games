# 지식카드 분류 · 세계 백과사전

## 분류 원칙
- **오브젝트 소재:** 기존 지구·인류 7대 영역과 17개 소재를 유지하고, 무형 지식 5종(언어·종교·정치·법·관습)을 더한 총 22개.
- **학문:** 기존 7대 학문 분야, 21개 뿌리 학문, 기존 활성 세부 학문 31개에 문헌학·윤리학·종교학·법학·정치학 5개를 더해 총 57개 활성 학문.
- **카드 주학문:** `KnowledgeCards.Rows`의 `meta.discipline` 지정 시 해당 학문 우선, 없으면 `Field`에 연결된 학문. 다른 학문에는 `meta.relatedDisciplines`와 `KnowledgeTree.CardRelatedDisciplines`로 교차 연결. 보상·보고 회수는 카드당 최초 1회.
- **세부 학문:** `KnowledgeTaxonomy.SubOf` 에 지정. 학문 자체의 `parent`는 연구 계통도를 뜻하며 카드 소재 분류와 별개.
- **존재 형태:** `meta.entityType` (실물·장소·문헌·무형 개념·제도·의례 등). 시대 `meta.era`, 지역 `meta.region`, 별명·표지·연관 대상 `meta.relations`은 서로 독립. 등장·연구 가능 시기 제한은 기존 `fromYear`만 사용.
- **선행 지식:** `research.found` 는 발견, `research.reported` 는 학자 보고 완료를 요구. `KnowledgeTree.autofill`이 보고 선행 관계를 지식트리에 연결. 기존 `state.discovered`·`state.reported`를 재사용하고 새 저장 키는 만들지 않는다.

## 무형 지식 획득 예시

| 소재 | 1단계: 발견 | 2단계: 조사 | 3단계: 비교 연구 | 연관 학문 |
|---|---|---|---|---|
| 언어 | 항구 현지어 대화 | 문헌 해독 | 다국어 번역 연구 | 언어학·문헌학·상업학 |
| 종교 | 의례 관찰 | 전례 문헌 조사 | 신앙 비교 연구 | 종교학·역사학·인류학 |
| 정치 | 역사 사건·의회 관찰 | 국가 제도 조사 | 정치사상 비교 | 정치학·역사학·법학 |
| 법률 | 조약 기록 발견 | 해상법전 해독 | 법학 비교 연구 | 법학·정치학·윤리학 |
| 문화·관습 | 지역 축제 관찰 | 구술 전통 기록 | 지역 문화 비교 | 인류학·언어학·종교학 |

1단계는 해당 항구의 기존 입항 발견 경로에서 등록한다. 2·3단계는 앞 카드의 **발견과 학자 보고가 모두 끝난 뒤**, 같은 항구의 기존 `Discovery.grantVisitCards`로 등록한다. `Knowledge.ReportKnowledge`는 보고 후 후속 카드를 점검한다. 기존 퀘스트·동료·탐험·드롭과 연동 규칙은 변경하지 않는다.

## 카드 추가 방법
1. `src/ReplicatedStorage/Shared/KnowledgeCards.luau`의 `Rows`에 카드와 고유 id 추가. 물건·문헌·현상·관념을 한 카드로 섞지 않는다.
2. `meta.kind`, `meta.discipline`, `meta.entityType`, `meta.era`, `meta.region`, `meta.relatedDisciplines`, `meta.relations`을 실제 근거에 따라 기록한다.
3. 연구 카드면 `research.found` 및 `research.reported`로 선행 경로를 지정한다. 신규 학문이 필요하면 기존 `KnowledgeTree.Disciplines`/기존 예정 학문 승격, `Fields.luau`, `KnowledgeBattle.luau` 연결을 검토한다.
4. `KnowledgeTaxonomy.path(id)`가 `{ domain, discipline, sub, entityType, era, region, relatedDisciplines, prerequisites }`를 반환한다. `KnowledgeTaxonomy.audit()`와 `tests/run.sh`로 검증한다. Luau CLI 경로는 `LUAU_DIR`로 지정할 수 있다.

기존 저장 키, 항구·선박·전투 능력치, 배율, 교역품 값 및 카드별 보상은 별도 승인 없이 수정하지 않는다.
