# 지식카드 분류 (대분류 → 중분류 → 소분류)

- **대분류 (7)** `KnowledgeTree.Domains`: 형식학문 · 자연과학 · 응용·공학·의약 · 인문학 · 사회과학 · 예술 · 실용·생활
- **중분류 (학문)** `KnowledgeTree.Disciplines`: 카드의 `Field` 와 1:1 연결 (`KnowledgeTaxonomy.DisciplineOfField`)
- **소분류 (세부 학문)** `KnowledgeTree.Planned` 의 id. 카드마다 `KnowledgeTaxonomy.SubOf[카드id]` 에 선택으로 지정

`KnowledgeTaxonomy.path(카드id)` → `{ domain, discipline, sub }`. 점검은 `KnowledgeTaxonomy.audit()` (테스트에 포함).

## 새 카드 추가 순서
1. 카드의 학문(`Field`)을 정한다. 기존 학문이면 `KnowledgeCards.luau` Rows 에 한 줄 추가.
2. (선택) 세부 분야가 있으면 `SubOf` 에 `카드id = "소분류id"` 추가. 소분류 id 는 `K.Planned` 에서 고른다.
3. 새 학문이 필요하면: `Fields.luau` 에 Field → `KnowledgeTree.Disciplines` + 노드 → `K.DomainOf` 에 대분류 → `KnowledgeBattle`/`CardBook` 의 줄(row)·능력·특수 맵 → 필요시 `Quests.luau` 수집 퀘스트.
4. 테스트 실행: `LUAU_DIR=/tmp/luau bash tests/run.sh` — 분류 점검이 빠진 연결을 알려 준다.
