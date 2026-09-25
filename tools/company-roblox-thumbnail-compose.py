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

def select_frame(paths):
    ranked=[]
    for p in paths:
        try:
            with Image.open(p) as im:
                ranked.append((score(im),p))
        except Exception:
            pass
    if not ranked:
        raise RuntimeError("NO_VALID_GAMEPLAY_FRAMES")
    ranked.sort(reverse=True,key=lambda x:x[0])
    return ranked[0][1],ranked

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
    selected,ranked=select_frame(frames)
    out=Path(ns.output_dir);out.mkdir(parents=True,exist_ok=True)
    thumb=out/"homepage-thumbnail.png";icon=out/"experience-icon.png"
    make_thumbnail(selected,thumb);make_icon(selected,icon)
    if thumb.stat().st_size>ns.max_bytes:
        with Image.open(thumb) as im:
            im.convert("RGB").save(out/"homepage-thumbnail.jpg","JPEG",quality=90,optimize=True)
        thumb=out/"homepage-thumbnail.jpg"
    manifest={
        "version":1,
        "selectedFrame":str(selected).replace("\\","/"),
        "candidateFrames":[{"path":str(p).replace("\\","/"),"score":round(s,3)} for s,p in ranked[:8]],
        "homepageThumbnail":str(thumb).replace("\\","/"),
        "icon":str(icon).replace("\\","/"),
        "actualGameplayFrameSource":True,
        "sharedPlaceholderUsed":False,
        "misleadingSyntheticGameplayAdded":False,
        "composition":"ACTUAL_GAMEPLAY_REFRAME_WITH_MILD_COLOR_CONTRAST_SHARPNESS"
    }
    import json
    (out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("ROBLOX_THUMBNAIL_SELECTED_FRAME="+str(selected))
    print("ROBLOX_THUMBNAIL_AUTOCOMPOSE=PASS")

if __name__=="__main__":
    main()
