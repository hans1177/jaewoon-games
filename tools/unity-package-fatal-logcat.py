#!/usr/bin/env python3
import re
import sys
from pathlib import Path

def package_fatal(log_text: str, package: str) -> bool:
    if not package:
        return False
    lines = log_text.splitlines()
    pkg = re.escape(package)

    direct = [
        re.compile(rf"\bANR in {pkg}(?:\b|$)", re.I),
        re.compile(rf"\bProcess {pkg}\b.*\bdied\b", re.I),
        re.compile(rf"\bProcess:\s*{pkg}\s*,\s*PID:", re.I),
    ]
    if any(rx.search(line) for line in lines for rx in direct):
        for i, line in enumerate(lines):
            if direct[2].search(line):
                lo=max(0,i-12); hi=min(len(lines),i+13)
                if any(re.search(r"FATAL EXCEPTION|Fatal signal|F DEBUG|Abort message",x,re.I) for x in lines[lo:hi]):
                    return True
            if direct[0].search(line) or direct[1].search(line):
                return True

    for i,line in enumerate(lines):
        if not re.search(r"Fatal signal|F DEBUG|Abort message",line,re.I):
            continue
        lo=max(0,i-20); hi=min(len(lines),i+30)
        block="\n".join(lines[lo:hi])
        if re.search(rf"\bCmdline:\s*{pkg}(?:\b|$)",block,re.I):
            return True
        if re.search(rf"\bprocess\s+{pkg}(?:\b|$)",block,re.I):
            return True

    return False

def main():
    if len(sys.argv) != 3:
        print("usage: unity-package-fatal-logcat.py <logcat.txt> <package>", file=sys.stderr)
        return 2
    text=Path(sys.argv[1]).read_text(encoding="utf-8",errors="replace")
    detected=package_fatal(text,sys.argv[2])
    print("PACKAGE_FATAL=true" if detected else "PACKAGE_FATAL=false")
    return 1 if detected else 0

if __name__ == "__main__":
    raise SystemExit(main())
