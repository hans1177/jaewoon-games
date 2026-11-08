#!/usr/bin/env bash
# Rojo 7.7.0 설치. GitHub 릴리스 다운로드가 504 등으로 막히면 crates.io에서 같은 버전을 빌드한다.
# 사용: bash tools/install-rojo.sh /tmp/rojo-bin   → /tmp/rojo-bin/rojo
set -euo pipefail
DEST="${1:-/tmp/rojo-bin}"
VERSION="7.7.0"
ZIP_URL="https://github.com/rojo-rbx/rojo/releases/download/v${VERSION}/rojo-${VERSION}-linux-x86_64.zip"
ZIP_SHA256="22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073"
mkdir -p "$DEST"

if [[ -x "$DEST/rojo" ]] && "$DEST/rojo" --version 2>/dev/null | grep -q "$VERSION"; then
  echo "ROJO_INSTALL=CACHED"; exit 0
fi

# 1) 공식 릴리스 zip (sha256 고정). 일시 장애 대비로 간격을 늘려 재시도.
for delay in 3 10 30; do
  if curl -fsSL --retry 2 --retry-delay 2 --connect-timeout 15 -o /tmp/rojo.zip "$ZIP_URL" \
     && echo "${ZIP_SHA256}  /tmp/rojo.zip" | sha256sum -c - >/dev/null; then
    unzip -oq /tmp/rojo.zip -d "$DEST"
    chmod +x "$DEST/rojo"
    echo "ROJO_INSTALL=GITHUB_RELEASE"; "$DEST/rojo" --version; exit 0
  fi
  echo "ROJO_RELEASE_DOWNLOAD_RETRY_IN=${delay}s"; sleep "$delay"
done

# 2) 대체 경로: crates.io 고정 버전 (--locked). GitHub 릴리스 CDN에 의존하지 않는다.
echo "ROJO_RELEASE_UNAVAILABLE_FALLBACK=CRATES_IO"
command -v cargo >/dev/null || { curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal; source "$HOME/.cargo/env"; }
cargo install rojo --version "=${VERSION}" --locked --root /tmp/rojo-cargo
cp /tmp/rojo-cargo/bin/rojo "$DEST/rojo"
chmod +x "$DEST/rojo"
echo "ROJO_INSTALL=CRATES_IO"; "$DEST/rojo" --version
