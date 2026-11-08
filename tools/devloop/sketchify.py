#!/usr/bin/env python3
"""외부에서 가져온 사진을 '연필 스케치'로 바꾼다 (원본 그대로 업로드 금지).
사용: sketchify.py 입력 출력 [--size 512]
- 색을 빼고 윤곽선+음영만 남기고, 양피지 색을 입혀 고지도/삽화 느낌을 낸다.
- 스케치로 바꿔도 '사람 눈으로 확인 + APPROVED_IMAGES.json 등록'은 여전히 필수다."""
import sys, cv2, numpy as np
src, dst = sys.argv[1], sys.argv[2]
size = int(sys.argv[sys.argv.index('--size') + 1]) if '--size' in sys.argv else 512
img = cv2.imread(src)
if img is None:
    sys.exit('읽을 수 없는 이미지')
h, w = img.shape[:2]
k = size / max(h, w)
img = cv2.resize(img, (int(w * k), int(h * k)), interpolation=cv2.INTER_AREA)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
inv = 255 - cv2.GaussianBlur(gray, (0, 0), 7)
sk = cv2.divide(gray, 255 - inv, scale=256)           # 연필 스케치
sk = np.clip((sk.astype(np.float32) - 40) * 1.25, 0, 255)  # 대비
sk = (255 * (sk / 255) ** 1.6).astype(np.float32) / 255     # 선을 진하게
paper = np.array([196, 222, 238], np.float32)           # BGR 양피지색
ink = np.array([40, 52, 70], np.float32)                # BGR 잉크색
out = ink + (paper - ink) * sk[..., None]
cv2.imwrite(dst, out.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
