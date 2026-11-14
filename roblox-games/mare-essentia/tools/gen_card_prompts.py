#!/usr/bin/env python3
"""지식카드 그림 프롬프트 목록 생성. 사용: python3 tools/gen_card_prompts.py > docs/card_art_prompts.csv
KnowledgeCards.luau 의 카드(id, 이름, 분야, 설명)를 읽어 카드마다 복붙용 프롬프트를 만든다."""
import csv, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "src/ReplicatedStorage/Shared/KnowledgeCards.luau").read_text(encoding="utf-8")
rows = re.findall(r'\{ "(\w+)", "([^"]+)", "(\w+)", "(\w+)", "([^"]*)"', src)
HINT = {
    "Botany": "식물 도감 도판처럼, 꽃·잎·열매가 또렷한 식물 한 종",
    "Zoology": "동물 도감 도판처럼, 몸 전체가 보이는 동물 한 마리",
    "Mineral": "광물 표본 한 점, 질감이 또렷하게",
    "Relic": "박물관 유물 한 점, 정면에서",
    "Site": "유적·건축물 전경, 옛 여행기 삽화처럼",
    "Astronomy": "천체 관측 도판처럼, 어두운 배경",
    "Chemistry": "옛 연금술·실험 도구와 물질",
    "Physics": "옛 과학 실험 장치",
    "Geography": "옛 지도·지형 도판",
    "Philosophy": "고전 학자의 서재 장면",
    "Medicine": "옛 의학 도판, 약초·도구",
}
STYLE = ("17세기 동판화 도판 느낌의 세피아 톤 그림, 낡은 양피지 질감, 가는 선 음영, "
         "4:3 가로 구도, 글자·숫자·서명·워터마크 절대 없음, 테두리 없음")
w = csv.writer(sys.stdout)
w.writerow(["card_id", "name", "field", "prompt"])
for cid, name, field, rarity, desc in rows:
    w.writerow([cid, name, field, f"{name}. {desc} {HINT.get(field, '')}. {STYLE}"])
