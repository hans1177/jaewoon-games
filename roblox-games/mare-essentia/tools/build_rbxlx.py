#!/usr/bin/env python3
"""src/ 를 Roblox Studio 에서 바로 열 수 있는 .rbxlx 장소 파일로 묶는다 (Rojo 없이 쓰는 대안).

사용: python3 tools/build_rbxlx.py [출력경로]
Rojo 매핑(default.project.json)과 같은 구조를 만든다.
  ReplicatedStorage/Shared          <- src/ReplicatedStorage/Shared
  ServerScriptService/Server        <- src/ServerScriptService
  StarterPlayer/StarterPlayerScripts/Client <- src/StarterPlayer
"""
import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "MareEssentia.rbxlx"

_ref = 0


def ref() -> str:
    global _ref
    _ref += 1
    return f"RBX{_ref}"


def script_class(name: str) -> tuple[str, str]:
    """파일 이름 규칙(Rojo와 동일)으로 클래스와 인스턴스 이름을 정한다."""
    if name.endswith(".server.luau"):
        return "Script", name[: -len(".server.luau")]
    if name.endswith(".client.luau"):
        return "LocalScript", name[: -len(".client.luau")]
    return "ModuleScript", name[: -len(".luau")]


def source_item(cls: str, name: str, source: str) -> str:
    if "]]>" in source:
        raise ValueError(f"{name}: ']]>' 가 들어 있어 CDATA 로 넣을 수 없다")
    return (
        f'<Item class="{cls}" referent="{ref()}"><Properties>'
        f'<string name="Name">{escape(name)}</string>'
        f'<ProtectedString name="Source"><![CDATA[{source}]]></ProtectedString>'
        f"</Properties></Item>"
    )


def folder_item(name: str, children: str) -> str:
    return (
        f'<Item class="Folder" referent="{ref()}"><Properties>'
        f'<string name="Name">{escape(name)}</string></Properties>{children}</Item>'
    )


def dir_to_xml(path: Path) -> str:
    parts = []
    for child in sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name)):
        if child.name.startswith("."):
            continue
        if child.is_dir():
            parts.append(folder_item(child.name, dir_to_xml(child)))
        elif child.suffix == ".luau":
            cls, name = script_class(child.name)
            parts.append(source_item(cls, name, child.read_text(encoding="utf-8")))
    return "".join(parts)


def service(cls: str, children: str, extra_props: str = "") -> str:
    return (
        f'<Item class="{cls}" referent="{ref()}"><Properties>'
        f'<string name="Name">{cls}</string>{extra_props}</Properties>{children}</Item>'
    )


baseplate = (
    f'<Item class="Part" referent="{ref()}"><Properties>'
    '<string name="Name">Baseplate</string>'
    '<bool name="Anchored">true</bool>'
    '<Vector3 name="size"><X>512</X><Y>20</Y><Z>512</Z></Vector3>'
    '<CoordinateFrame name="CFrame"><X>0</X><Y>-10</Y><Z>0</Z>'
    "<R00>1</R00><R01>0</R01><R02>0</R02><R10>0</R10><R11>1</R11><R12>0</R12>"
    "<R20>0</R20><R21>0</R21><R22>1</R22></CoordinateFrame>"
    '<Color3uint8 name="Color3uint8">4285560931</Color3uint8>'
    "</Properties></Item>"
)

spawn = (
    f'<Item class="SpawnLocation" referent="{ref()}"><Properties>'
    '<string name="Name">SpawnLocation</string>'
    '<bool name="Anchored">true</bool>'
    '<Vector3 name="size"><X>12</X><Y>1</Y><Z>12</Z></Vector3>'
    '<CoordinateFrame name="CFrame"><X>0</X><Y>0.5</Y><Z>0</Z>'
    "<R00>1</R00><R01>0</R01><R02>0</R02><R10>0</R10><R11>1</R11><R12>0</R12>"
    "<R20>0</R20><R21>0</R21><R22>1</R22></CoordinateFrame>"
    "</Properties></Item>"
)

shared = folder_item("Shared", dir_to_xml(ROOT / "src/ReplicatedStorage/Shared"))
server = folder_item("Server", dir_to_xml(ROOT / "src/ServerScriptService"))
client = folder_item("Client", dir_to_xml(ROOT / "src/StarterPlayer"))

players_scripts = (
    f'<Item class="StarterPlayerScripts" referent="{ref()}"><Properties>'
    '<string name="Name">StarterPlayerScripts</string></Properties>' + client + "</Item>"
)

body = (
    service("Workspace", baseplate + spawn)
    + service("ReplicatedStorage", shared + folder_item("MareAssets", "".join(folder_item(n, "") for n in ("Ships", "Naval", "Town", "People"))))
    + service("ServerScriptService", server)
    + service("StarterPlayer", players_scripts)
)

xml = (
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" '
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
    'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">'
    + body
    + "</roblox>"
)

OUT.write_text(xml, encoding="utf-8")
print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes, {_ref} items)")
