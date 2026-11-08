"""도감 카드 그림 자동 업로드 (Roblox Open Cloud Assets API).

준비한 PNG(prepare_card_art.py 결과)를 Decal 에셋으로 올리고, CardArt.luau에 붙일 줄을 만들어 준다.
API 키는 대화나 코드에 적지 말고 환경변수로만 넣는다.

  export ROBLOX_API_KEY=...        # Creator Hub > Open Cloud > API Keys (Assets: Read, Write)
  export ROBLOX_USER_ID=123456     # 내 사용자 ID (그룹 소유로 올리려면 ROBLOX_GROUP_ID)
  python3 tools/upload_card_art.py 출력폴더 목록.csv [--dry-run]

목록.csv: card_id,file,credit,license  (prepare_card_art.py와 같은 파일)
- 이미 올린 카드는 출력폴더/uploaded.json에 기록되어 다시 올리지 않는다 (중간에 끊겨도 이어서 실행).
- 이미지는 자동 검수를 거친다. 승인되기 전에는 게임에서 안 보일 수 있다.
- 게임에서는 Decal ID를 rbxthumb 주소로 불러온다 (ImageLabel이 Decal id를 직접 못 읽는 문제를 피한다).
"""
import csv, json, os, sys, time
import requests

API = "https://apis.roblox.com/assets/v1"

def creator():
    if os.environ.get("ROBLOX_GROUP_ID"):
        return {"groupId": os.environ["ROBLOX_GROUP_ID"]}
    return {"userId": os.environ["ROBLOX_USER_ID"]}

def upload(path, name, desc, key):
    meta = {"assetType": "Decal", "displayName": name[:50], "description": desc[:1000],
            "creationContext": {"creator": creator()}}
    with open(path, "rb") as f:
        r = requests.post(API + "/assets", headers={"x-api-key": key},
                          data={"request": json.dumps(meta)},
                          files={"fileContent": (os.path.basename(path), f, "image/png")}, timeout=60)
    r.raise_for_status()
    op = r.json()["path"]  # operations/<id>
    for _ in range(60):
        time.sleep(2)
        o = requests.get("https://apis.roblox.com/assets/v1/" + op, headers={"x-api-key": key}, timeout=30)
        o.raise_for_status()
        j = o.json()
        if j.get("done"):
            if "error" in j:
                raise RuntimeError(j["error"])
            return j["response"]["assetId"]
    raise TimeoutError(op)

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    out, table = sys.argv[1], sys.argv[2]
    dry = "--dry-run" in sys.argv
    key = os.environ.get("ROBLOX_API_KEY")
    if not dry and (not key or not (os.environ.get("ROBLOX_USER_ID") or os.environ.get("ROBLOX_GROUP_ID"))):
        sys.exit("ROBLOX_API_KEY 와 ROBLOX_USER_ID(또는 ROBLOX_GROUP_ID) 환경변수가 필요해요.")
    done_path = os.path.join(out, "uploaded.json")
    done = json.load(open(done_path)) if os.path.exists(done_path) else {}
    lines = []
    with open(table, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            cid = row["card_id"]
            png = os.path.join(out, cid + ".png")
            if cid not in done:
                if not os.path.exists(png):
                    print("건너뜀(PNG 없음):", cid); continue
                if dry:
                    print("[dry-run] 올릴 예정:", cid); continue
                try:
                    done[cid] = upload(png, "MareEssentia " + cid, "Card art. " + row["credit"] + " / " + row["license"], key)
                except Exception as e:
                    print("실패:", cid, e); continue
                json.dump(done, open(done_path, "w"))
                print("올림:", cid, done[cid])
                time.sleep(1)
            if cid in done:
                lines.append('\t%s = { image = "rbxthumb://type=Asset&id=%s&w=420&h=420", credit = "%s", license = "%s" },\n'
                             % (cid, done[cid], row["credit"].replace('"', "'"), row["license"]))
    if lines:
        open(os.path.join(out, "CardArt.entries.luau"), "w", encoding="utf-8").write("".join(lines))
        print("CardArt.entries.luau 생성 — src/ReplicatedStorage/Shared/CardArt.luau 의 Art 표 안에 붙여 넣으세요.")

if __name__ == "__main__":
    main()
