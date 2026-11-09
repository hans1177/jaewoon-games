"""변형 재질 색을 부모 밝기에 맞추는 순수 함수(bpy 없음). 실패 도감의 DARKENED(너무 어두워짐)를 스스로 줄이려고 만들었다."""


def luminance(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def match_luminance(rgb, parent_rgb, min_ratio):
    """rgb 의 밝기가 부모 밝기의 min_ratio 배보다 어두우면 그 밝기가 되도록 색을 같은 비율로 올린다(색조 유지, 최대 1.0)."""
    want = luminance(parent_rgb) * min_ratio
    cur = luminance(rgb)
    if cur >= want or cur <= 1e-6:
        out = rgb
    else:
        k = want / cur
        out = tuple(min(1.0, c * k) for c in rgb)
        # 한 채널이 1.0 에 걸려 밝기가 모자라면 흰색 쪽으로 섞어 보충한다.
        if luminance(out) < want * 0.98:
            lack = (want - luminance(out)) / max(1e-6, 1.0 - luminance(out))
            out = lerp(out, (1.0, 1.0, 1.0), min(1.0, lack))
    return tuple(round(c, 4) for c in out)


def tinted(target_rgb, parent_rgb, mix, min_ratio):
    """목표색(흙·이끼)을 부모 색과 mix 만큼 섞고, 부모 밝기의 min_ratio 아래로는 내려가지 않게 한다."""
    return match_luminance(lerp(target_rgb, parent_rgb, mix), parent_rgb, min_ratio)
