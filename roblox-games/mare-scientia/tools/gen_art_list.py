"""모든 카드의 그림 목록 양식(CSV)을 만든다. file/credit/license 칸만 채워서 prepare_card_art.py에 넣는다."""
import re, csv, sys
src = open("src/ReplicatedStorage/Shared/KnowledgeCards.luau", encoding="utf-8").read()
rows = re.findall(r'^\tcard\("([^"]+)", "([^"]+)", "(\w+)", "(\w+)"', src, flags=re.M)
w = csv.writer(open(sys.argv[1] if len(sys.argv) > 1 else "art_list_template.csv", "w", newline="", encoding="utf-8"))
w.writerow(["card_id", "file", "credit", "license", "name", "field"])
for cid, name, field, _ in rows:
    w.writerow([cid, "", "", "", name, field])
print(len(rows), "cards")
