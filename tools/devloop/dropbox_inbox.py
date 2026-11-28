#!/usr/bin/env python3
"""드롭박스 → mare-essentia 자동 자산 인입 (2026-11-28 오너 지시: 모든 그림+3D 모델, 자동 검사 통과 시 바로 등록·배치).

드롭박스 폴더 규칙:  /Vibe2Transfer/inbox/<종류>/<이름>.<확장자>
  그림:  CardArt · Icons · Portraits · Goods · Materials       (.png .jpg .jpeg)
  모델:  Animals · Terrain · Relics · Town · Castle · Naval · People · Monsters · Interior · Cargo   (.glb 만 — FBX 는 저장소 대용량(LFS) 규칙 때문에 GLB 로 바꿔서 올린다)
  이름:  소문자·숫자·밑줄·하이픈만 (예: eu_05.png, menu_harbor_02.jpg, zoo_tiger.glb)

자동 검사(하나라도 실패하면 등록 안 함, 이유를 보고서에 기록):
  - 확장자·이름 규칙, 크기(그림 4096px 이하, 128px 이상 / 모델 20MB 이하), 파일 머리(PNG·JPG·glTF·FBX)
  - 256색 금지(팔레트·감색) — asset_color_check.color_problem
  - 대륙 카드(eu_/ea_/me_/nw_/af_/sa_ 숫자)는 세로 7:10, 1049×1499 이상 → 1400×2000 RGB 로 맞춤
  - 저장소에 같은 바이트가 이미 있으면 중복으로 건너뜀
통과하면 assets/inbox/<종류>/ + .license.json(PROJECT_ORIGINAL_ART, 오너 드롭박스) → 기존 register_asset.py 로 정식 폴더 이동.
처리 기록은 roblox-games/mare-essentia/assets/dropbox-imported.json (드롭박스 content_hash 기준, 같은 파일 재처리 안 함).
비밀값은 환경변수(DROPBOX_APP_KEY / DROPBOX_APP_SECRET / DROPBOX_REFRESH_TOKEN)로만 받고 출력하지 않는다.
사용: dropbox_inbox.py [--dry-run] [--local <폴더>]   (--local: 드롭박스 대신 로컬 폴더로 시험)
"""
import base64, datetime, hashlib, io, json, os, re, subprocess, sys, urllib.error, urllib.parse, urllib.request

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GAME = os.path.join(REPO, "roblox-games", "mare-essentia")
STATE = os.path.join(GAME, "assets", "dropbox-imported.json")
APPROVED = os.path.join(GAME, "assets", "APPROVED_IMAGES.json")
ROOT_FOLDER = "/Vibe2Transfer/inbox"
IMAGE_KINDS = {"CardArt", "Icons", "Portraits", "Goods", "Materials"}
MODEL_KINDS = {"Animals", "Terrain", "Relics", "Town", "Castle", "Naval", "People", "Monsters", "Interior", "Cargo"}
NAME = re.compile(r"^[a-z0-9][a-z0-9_\-]{1,60}\.(png|jpg|jpeg|glb)$")
CONTINENT = re.compile(r"^(eu|ea|me|nw|af|sa)_(0[1-9]|[1-4][0-9])\.png$")
MAX_MODEL = 20 * 1024 * 1024
MAX_IMAGE = 25 * 1024 * 1024

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_color_check import color_problem  # noqa: E402


def log(*a):
    print(*a, flush=True)


# ---------- 드롭박스 ----------
class Dropbox:
    def __init__(self):
        key, secret, refresh = (os.environ.get(k, "") for k in ("DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN"))
        if not (key and secret and refresh):
            raise SystemExit("DROPBOX_AUTH_NOT_CONFIGURED")
        basic = base64.b64encode((key + ":" + secret).encode()).decode()
        body = urllib.parse.urlencode({"grant_type": "refresh_token", "refresh_token": refresh}).encode()
        tok = json.loads(self._req("https://api.dropboxapi.com/oauth2/token", {"Authorization": "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded"}, body, 65536))
        self.token = tok.get("access_token") or ""
        if not self.token:
            raise SystemExit("DROPBOX_ACCESS_TOKEN_MISSING")

    @staticmethod
    def _req(url, headers, data, limit):
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read(limit + 1)
        except urllib.error.HTTPError as e:
            raise RuntimeError("DROPBOX_HTTP_" + str(e.code)) from None
        except urllib.error.URLError:
            raise RuntimeError("DROPBOX_NETWORK_ERROR") from None
        if len(raw) > limit:
            raise RuntimeError("DROPBOX_RESPONSE_LIMIT")
        return raw

    def rpc(self, endpoint, arg):
        return json.loads(self._req("https://api.dropboxapi.com/2/" + endpoint, {"Authorization": "Bearer " + self.token, "Content-Type": "application/json"}, json.dumps(arg).encode(), 8 * 1024 * 1024))

    def list(self):
        out = []
        try:
            res = self.rpc("files/list_folder", {"path": ROOT_FOLDER, "recursive": True, "limit": 2000})
        except RuntimeError as e:
            if "HTTP_409" in str(e):  # 폴더 없음
                log("DROPBOX_INBOX_FOLDER_MISSING", ROOT_FOLDER)
                return []
            raise
        while True:
            out += [e for e in res.get("entries", []) if e.get(".tag") == "file"]
            if not res.get("has_more"):
                break
            res = self.rpc("files/list_folder/continue", {"cursor": res["cursor"]})
        return out

    def download(self, path, limit):
        return self._req("https://content.dropboxapi.com/2/files/download", {"Authorization": "Bearer " + self.token, "Dropbox-API-Arg": json.dumps({"path": path})}, None, limit)

    def move(self, src, dst):
        try:
            self.rpc("files/move_v2", {"from_path": src, "to_path": dst, "autorename": True})
            return True
        except RuntimeError:
            return False  # 쓰기 권한이 없으면 기록만으로 재처리 방지


class Local:
    """시험용: 로컬 폴더를 드롭박스처럼 읽는다(<폴더>/<종류>/<파일>)."""
    def __init__(self, base):
        self.base = base

    def list(self):
        out = []
        for kind in sorted(os.listdir(self.base)):
            d = os.path.join(self.base, kind)
            if os.path.isdir(d) and not kind.startswith("_"):
                for fn in sorted(os.listdir(d)):
                    p = os.path.join(d, fn)
                    if os.path.isfile(p):
                        h = hashlib.sha256(open(p, "rb").read()).hexdigest()
                        out.append({"path_display": f"{ROOT_FOLDER}/{kind}/{fn}", "content_hash": h, "size": os.path.getsize(p), "_local": p})
        return out

    def download(self, path, limit):
        kind, fn = path[len(ROOT_FOLDER) + 1:].split("/", 1)
        return open(os.path.join(self.base, kind, fn), "rb").read()

    def move(self, src, dst):
        return False


# ---------- 검사 ----------
def check_image(kind, fn, raw, tmp):
    from PIL import Image
    if fn.endswith(".png") and raw[:8] != b"\x89PNG\r\n\x1a\n":
        return None, "PNG 머리가 아님"
    if fn.endswith((".jpg", ".jpeg")) and raw[:3] != b"\xff\xd8\xff":
        return None, "JPG 머리가 아님"
    open(tmp, "wb").write(raw)
    why = color_problem(tmp)
    if why:
        return None, why
    im = Image.open(io.BytesIO(raw))
    w, h = im.size
    if max(w, h) > 4096 or min(w, h) < 128:
        return None, f"크기 {w}×{h} (128~4096px)"
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.mode else "RGB")
    out_name, data = fn, raw
    if kind == "CardArt" and CONTINENT.match(fn):
        if w < 1049 or h < 1499 or abs(w * 10 - h * 7) > h * 0.05:
            return None, f"대륙 카드는 세로 7:10, 1049×1499 이상 (지금 {w}×{h})"
        buf = io.BytesIO()
        im.convert("RGB").resize((1400, 2000), Image.LANCZOS).save(buf, "PNG", optimize=True)
        data = buf.getvalue()
    elif kind == "CardArt" and fn.endswith(".png") and not fn.startswith("ui_"):
        # 기존 등록기는 그 밖의 카드 그림을 JPG 로 받는다(대륙 카드·UI 만 PNG)
        buf = io.BytesIO()
        im.convert("RGB").save(buf, "JPEG", quality=92, optimize=True)
        data, out_name = buf.getvalue(), fn[:-4] + ".jpg"
    return (out_name, data), None


def check_model(fn, raw):
    if len(raw) > MAX_MODEL:
        return None, f"모델 {len(raw)//1048576}MB (20MB 이하)"
    if fn.endswith(".glb") and raw[:4] != b"glTF":
        return None, "glTF(GLB) 머리가 아님"
    if fn.endswith(".fbx") and not raw.startswith(b"Kaydara FBX Binary"):
        return None, "바이너리 FBX 가 아님"
    return (fn, raw), None


def repo_hashes():
    """저장소에 이미 있는 파일의 git blob 해시(내용을 내려받지 않고 색인에서 읽는다)."""
    known = {}
    out = subprocess.run(["git", "-C", REPO, "ls-files", "-s", "--", "roblox-games/mare-essentia/assets"], capture_output=True, text=True).stdout
    for line in out.splitlines():
        meta, path = line.split("\t", 1)
        if "/inbox-hold/" in path or not path.lower().endswith((".png", ".jpg", ".jpeg", ".glb")):
            continue
        known[meta.split()[1]] = path
    return known


def blob_sha(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def main():
    dry = "--dry-run" in sys.argv
    local = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--local"), None)
    src = Local(local) if local else Dropbox()
    state = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {"_안내": "드롭박스 자동 인입 기록. 같은 content_hash 는 다시 받지 않는다.", "files": {}}
    known = repo_hashes()
    approved_doc = json.load(open(APPROVED, encoding="utf-8"))
    accepted, rejected = [], []
    tmpdir = os.path.join(os.environ.get("RUNNER_TEMP", "/tmp"), "dropbox_inbox")
    os.makedirs(tmpdir, exist_ok=True)
    for e in src.list():
        path = e["path_display"]
        rel = path[len(ROOT_FOLDER) + 1:]
        if "/" not in rel or rel.startswith("_"):
            continue
        kind, fn = rel.split("/", 1)
        prev = state["files"].get(path)
        if prev and prev.get("content_hash") == e.get("content_hash"):
            continue
        rec = {"content_hash": e.get("content_hash"), "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "kind": kind}
        why, result = None, None
        if kind not in IMAGE_KINDS | MODEL_KINDS:
            why = f"모르는 종류 폴더 '{kind}'"
        elif "/" in fn or not NAME.match(fn):
            why = "이름 규칙 위반(소문자·숫자·_·- , png/jpg/glb)"
        elif kind in IMAGE_KINDS and not fn.endswith((".png", ".jpg", ".jpeg")):
            why = "그림 폴더에는 png/jpg 만"
        elif kind in MODEL_KINDS and not fn.endswith(".glb"):
            why = "모델 폴더에는 glb 만(FBX 는 GLB 로 바꿔서)"
        else:
            try:
                raw = src.download(path, MAX_IMAGE if kind in IMAGE_KINDS else MAX_MODEL)
            except RuntimeError as err:
                why = str(err)
                raw = None
            if raw is not None:
                if kind in IMAGE_KINDS:
                    result, why = check_image(kind, fn, raw, os.path.join(tmpdir, fn))
                else:
                    result, why = check_model(fn, raw)
        if result and not why:
            out_name, data = result
            digest = hashlib.sha256(data).hexdigest()
            if blob_sha(data) in known:
                why = f"중복(이미 {known[blob_sha(data)]})"
            else:
                rec.update(status="accepted", file=out_name, sha256=digest)
                accepted.append((kind, out_name, data, digest, path))
        if why:
            rec.update(status="rejected", reason=why)
            rejected.append((path, why))
        state["files"][path] = rec
    log(f"DROPBOX_INBOX accepted={len(accepted)} rejected={len(rejected)}")
    for p, why in rejected:
        log("  거부:", p, "—", why)
    if dry:
        return
    for kind, name, data, digest, path in accepted:
        d = os.path.join(GAME, "assets", "inbox", kind)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, name), "wb").write(data)
        json.dump({
            "license": "PROJECT_ORIGINAL_ART", "author": "hans1177 (owner)",
            "source": "dropbox:" + path, "sha256": digest,
            "note": "오너 드롭박스 자동 인입(dropbox_inbox.py) — 자동 검사 통과",
        }, open(os.path.join(d, name + ".license.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        r = subprocess.run([sys.executable, os.path.join(REPO, "tools", "devloop", "register_asset.py"), GAME, "--kind=" + kind, "--prefix=" + name], capture_output=True, text=True)
        log(r.stdout.strip()[-400:])
        if r.returncode != 0 or os.path.exists(os.path.join(d, name)):
            state["files"][path].update(status="rejected", reason="등록기 거부: " + (r.stdout + r.stderr).strip()[-200:])
            for f in (name, name + ".license.json"):
                if os.path.exists(os.path.join(d, f)):
                    os.remove(os.path.join(d, f))
            continue
        if kind == "CardArt":
            approved_doc.setdefault("approved", {})["CardArt/" + os.path.splitext(name)[0]] = digest
        src.move(path, path.replace(ROOT_FOLDER + "/", ROOT_FOLDER + "/_done/", 1))
    for path, why in rejected:
        src.move(path, path.replace(ROOT_FOLDER + "/", ROOT_FOLDER + "/_rejected/", 1))
    json.dump(approved_doc, open(APPROVED, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(APPROVED, "a", encoding="utf-8").write("\n")
    json.dump(state, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    report = os.path.join(GAME, "docs", "assets", "dropbox_inbox_report.md")
    lines = ["# 드롭박스 자동 인입 최근 결과", "", f"갱신: {datetime.datetime.now(datetime.timezone.utc):%Y-%m-%d %H:%M} UTC", ""]
    rows = sorted(state["files"].items(), key=lambda kv: kv[1].get("at", ""), reverse=True)[:80]
    lines += ["| 시각 | 파일 | 결과 | 이유 |", "|---|---|---|---|"]
    for p, r in rows:
        lines.append(f"| {r.get('at','')} | `{p}` | {'등록' if r.get('status')=='accepted' else '거부'} | {r.get('reason','')} |")
    open(report, "w", encoding="utf-8").write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
