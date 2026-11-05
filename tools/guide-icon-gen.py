#!/usr/bin/env python3
"""마력숲 길 안내 아이콘 시트(512x256): 왼쪽 퀘스트 마커(금빛 보석), 오른쪽 안내 화살표. 직접 그린 오너 승인 UI 아이콘."""
from PIL import Image, ImageDraw, ImageFilter
K=4;S=256*K
def sc(p): return [(x*K,y*K) for x,y in p]
def grad_poly(poly,c1,c2,box):
    m=Image.new("L",(S,S),0);ImageDraw.Draw(m).polygon(sc(poly),fill=255)
    g=Image.new("RGBA",(S,S))
    d=ImageDraw.Draw(g);y0,y1=box[1]*K,box[3]*K
    for y in range(int(y0),int(y1)+1):
        t=(y-y0)/max(1,y1-y0)
        d.line([(0,y),(S,y)],fill=tuple(int(c1[i]+(c2[i]-c1[i])*t) for i in range(3))+(255,))
    out=Image.new("RGBA",(S,S),(0,0,0,0));out.paste(g,(0,0),m);return out
def outline(img,poly,width,color):
    m=Image.new("L",(S,S),0);ImageDraw.Draw(m).polygon(sc(poly),fill=255)
    big=m.filter(ImageFilter.MaxFilter(width*K*2//2*2+1))
    ring=Image.new("RGBA",(S,S),color+(255,));out=Image.new("RGBA",(S,S),(0,0,0,0));out.paste(ring,(0,0),big);return out
def shadow(poly,dy=10):
    m=Image.new("L",(S,S),0);ImageDraw.Draw(m).polygon([(x*K,(y+dy)*K) for x,y in poly],fill=140)
    m=m.filter(ImageFilter.GaussianBlur(7*K));o=Image.new("RGBA",(S,S),(0,0,0,0));o.paste((0,0,0,255),(0,0),m);return o
def marker():
    top=(128,16);right=(204,98);tip=(128,240);left=(52,98)
    kite=[top,right,tip,left]
    im=Image.new("RGBA",(S,S),(0,0,0,0))
    im.alpha_composite(shadow(kite,12))
    im.alpha_composite(outline(im,kite,7,(62,34,6)))
    # 왼쪽 밝은 면 / 오른쪽 어두운 면
    im.alpha_composite(grad_poly([top,(128,98+10),tip,left],(255,240,150),(240,176,50),(0,16,0,240)))
    im.alpha_composite(grad_poly([top,right,tip,(128,108)],(250,196,70),(196,120,24),(0,16,0,240)))
    # 안쪽 하이라이트 마름모
    hi=[(128,52),(158,90),(128,124),(98,90)]
    im.alpha_composite(grad_poly(hi,(255,255,235),(255,232,150),(0,52,0,124)))
    d=ImageDraw.Draw(im);d.polygon(sc([(116,66),(128,56),(136,64),(124,78)]),fill=(255,255,255,235))
    return im.resize((256,256),Image.LANCZOS)
def arrow():
    pts=[(104,20),(152,20),(152,110),(206,110),(128,236),(50,110),(104,110)]
    im=Image.new("RGBA",(S,S),(0,0,0,0))
    im.alpha_composite(shadow(pts,10))
    im.alpha_composite(outline(im,pts,7,(62,34,6)))
    im.alpha_composite(grad_poly(pts,(255,252,225),(255,188,48),(0,20,0,236)))
    # 오른쪽 면 살짝 어둡게
    im.alpha_composite(grad_poly([(128,20),(152,20),(152,110),(206,110),(128,236)],(236,170,40),(190,110,20),(0,20,0,236)).point(lambda v:v) if False else Image.new("RGBA",(S,S),(0,0,0,0)))
    d=ImageDraw.Draw(im);d.polygon(sc([(110,30),(124,30),(124,104),(110,104)]),fill=(255,251,228,255))
    return im.resize((256,256),Image.LANCZOS)
if __name__=="__main__":
    sheet=Image.new("RGBA",(512,256),(0,0,0,0))
    sheet.paste(marker(),(0,0));sheet.paste(arrow(),(256,0))
    sheet.save("roblox-games/fantasy-survival/guide-icons.png",optimize=True)
    print("ok")
