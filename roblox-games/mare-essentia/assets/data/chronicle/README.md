# 세계 연대기 대량 입력

`*.csv` 파일에 한 줄이 사건 하나. 머리글은 아래와 같고, 쉼표가 들어간 칸은 큰따옴표로 감싼다.

```
id,year,month,ports,voice,kind,disc,title,scholar,fact,lore,loreTag
c_example,1650,3,"venice;trieste",europe,nature,medicine,제목,학자 이름,기록으로 확인된 사실,당시 사람들의 소문(없으면 비움),미신
```

- `ports`: 항구 id 를 `;` 로 구분 (src/ReplicatedStorage/Shared/Ports.luau 의 id)
- `voice`: europe | islam | china | japan | india | americas | sea
- `kind`: sci | nature | war | politics | trade | faith
- `disc`: 연결할 학문 id (philosophy physics astronomy chemistry geography medicine botany zoology architecture shipbuilding mineralogy meteorology linguistics archaeology mythology navigation commerce history art). 비우면 history
- `lore`/`loreTag` 는 비워도 된다. 소문은 사실과 분리해서 보여 준다.
- 사실(fact)은 출처가 분명한 내용만 쓴다.

변환: `python3 tools/chronicle_import.py` → `src/ReplicatedStorage/Shared/WorldChronicleBulk.luau`
