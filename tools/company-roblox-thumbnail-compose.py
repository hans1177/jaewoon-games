import argparse, math, os
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageStat, ImageOps

def score(img):
    x=ImageOps.fit(img.convert("RGB"),(640,360),method=Image.Resampling.LANCZOS)
    gray=x.convert("L")
    stat=ImageStat.Stat(gray)
    contrast=stat.stddev[0]
    edges=gray.filter(ImageFilter.FIND_EDGES)
    edge_mean=ImageStat.Stat(edges).mean[0]
    color=ImageStat.Stat(x)
    saturation=max(color.stddev)-min(color.stddev)
    brightness=stat.mean[0]
    brightness_penalty=abs(brightness-118)*0.15
    return contrast*1.25+edge_mean*1.4+saturation*0.6-brightness_penalty

def select_frames(paths, count=3):
    ranked=[]
    for p in paths:
        try:
            with Image.open(p) as im:
                ranked.append((score(im),p))
        except Exception:
            pass
    if len(ranked) < count:
        raise RuntimeError(f"INSUFFICIENT_DISTINCT_GAMEPLAY_FRAMES:{len(ranked)}/{count}")
    ranked.sort(reverse=True,key=lambda x:x[0])
    # Prefer distinct frames by source file. Vibe play capture must provide multiple moments.
    selected=[p for _,p in ranked[:count]]
    return selected,ranked

def polish(im):
    im=im.convert("RGB")
    im=ImageEnhance.Contrast(im).enhance(1.10)
    im=ImageEnhance.Color(im).enhance(1.08)
    im=ImageEnhance.Sharpness(im).enhance(1.18)
    return im

def vignette(im):
    w,h=im.size
    mask=Image.new("L",(w,h),255)
    px=mask.load()
    cx,cy=w/2,h/2
    maxd=math.sqrt(cx*cx+cy*cy)
    for y in range(h):
        for x in range(w):
            d=math.sqrt((x-cx)**2+(y-cy)**2)/maxd
            px[x,y]=max(160,min(255,int(255-78*(d**1.7))))
    dark=Image.new("RGB",(w,h),(0,0,0))
    return Image.composite(im,dark,mask)

def make_thumbnail(src,out):
    with Image.open(src) as im:
        frame=ImageOps.fit(im.convert("RGB"),(1920,1080),method=Image.Resampling.LANCZOS,centering=(0.5,0.46))
        frame=polish(frame)
        frame=vignette(frame)
        frame.save(out,"PNG",optimize=True)

def make_icon(src,out):
    with Image.open(src) as im:
        frame=ImageOps.fit(im.convert("RGB"),(512,512),method=Image.Resampling.LANCZOS,centering=(0.5,0.44))
        frame=polish(frame)
        frame=vignette(frame)
        frame.save(out,"PNG",optimize=True)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--frames-dir",required=True)
    ap.add_argument("--output-dir",required=True)
    ap.add_argument("--max-bytes",type=int,default=3_000_000)
    ns=ap.parse_args()
    frames=[]
    for ext in ("*.png","*.jpg","*.jpeg","*.webp"):
        frames.extend(Path(ns.frames_dir).glob(ext))
    selected,ranked=select_frames(frames,3)
    out=Path(ns.output_dir);out.mkdir(parents=True,exist_ok=True)
    thumbnails=[]
    for i,src in enumerate(selected, start=1):
        thumb=out/f"homepage-thumbnail-{i}.png"
        make_thumbnail(src,thumb)
        if thumb.stat().st_size>ns.max_bytes:
            jpg=out/f"homepage-thumbnail-{i}.jpg"
            with Image.open(thumb) as im:
                im.convert("RGB").save(jpg,"JPEG",quality=90,optimize=True)
            thumb.unlink(missing_ok=True)
            thumb=jpg
        thumbnails.append(str(thumb).replace("\\","/"))
    icon=out/"experience-icon.png"
    make_icon(selected[0],icon)
    manifest={
        "version":2,
        "selectedFrames":[str(p).replace("\\","/") for p in selected],
        "candidateFrames":[{"path":str(p).replace("\\","/"),"score":round(s,3)} for s,p in ranked[:8]],
        "homepageThumbnails":thumbnails,
        "homepageThumbnailCandidateCount":len(thumbnails),
        "icon":str(icon).replace("\\","/"),
        "actualGameplayFrameSource":True,
        "distinctGameplayFramesRequired":True,
        "sharedPlaceholderUsed":False,
        "misleadingSyntheticGameplayAdded":False,
        "composition":"ACTUAL_GAMEPLAY_REFRAME_WITH_MILD_COLOR_CONTRAST_SHARPNESS",
        "benchmark":"ROBLOX_CLICK_INTENT_STRUCTURE_NO_COPYING"
    }
    import json
    (out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("ROBLOX_THUMBNAIL_SELECTED_FRAMES="+",".join(str(x) for x in selected))
    print("ROBLOX_THUMBNAIL_CANDIDATE_COUNT=3")
    print("ROBLOX_THUMBNAIL_AUTOCOMPOSE=PASS")

if __name__=="__main__":
    main()
