import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import gaussian_filter, zoom
S=2; IW,IH=1024*S,680*S
L,R,T=40*S,984*S,60*S; PW=R-L; PH=int(PW*4800/8800); B=T+PH
X0,X1,Z0,Z1=-2400,6400,-2400,2400
def gx(x): return L+(x-X0)/(X1-X0)*PW
def gz(z): return T+(z-Z0)/(Z1-Z0)*PH
rows=[]; cols={}
for l in open('/tmp/luau/map.txt'):
    if l.startswith('row '): rows.append([int(v) for v in l.split()[1].strip(',').split(',')])
    if l.startswith('zone '):
        p=l.split(); cols[int(p[1])]=np.array(list(map(float,p[3:6])))
G=np.array(rows)
def noise(h,w,scale,seed,oct=5):
    r=np.random.default_rng(seed); out=np.zeros((h,w)); a=1; t=0
    for o in range(oct):
        s=max(2,int(scale/2**o)); g=r.random((h//s+3,w//s+3)); out+=a*zoom(g,s,order=3)[:h,:w]; t+=a; a*=.5
    return out/t
# 양피지 배경
bg=np.zeros((IH,IW,3)); bg[:]=np.array([216,194,146])
bg*= (0.90+0.22*noise(IH,IW,120,1))[...,None]
yy,xx=np.mgrid[0:IH,0:IW].astype(float)
bg*= (1-.30*(((xx/IW-.5)**2+(yy/IH-.5)**2)*2.2))[...,None]
# 지역 색
mh,mw=PH,PW
yy2,xx2=np.mgrid[0:mh,0:mw].astype(float)
wn=noise(mh,mw,90,2)*30-15; wn2=noise(mh,mw,90,3)*30-15
gxi=np.clip((xx2+wn)/mw*88,0,87.99).astype(int); gyi=np.clip((yy2+wn2)/mh*48,0,47.99).astype(int)
zid=G[gyi,gxi]
# 경계를 부드럽게
keys=sorted(cols)
stack=np.stack([gaussian_filter((zid==k).astype(float),5) for k in keys])
zid=np.array(keys)[stack.argmax(0)]
col=np.zeros((mh,mw,3))
for k in keys:
    m=gaussian_filter((zid==k).astype(float),1.2)
    c=cols[k]*.82+np.array([170,150,110])*.18
    col+=m[...,None]*c
col*= (0.86+0.28*noise(mh,mw,60,4))[...,None]
col*= (0.94+0.12*noise(mh,mw,10,5,3))[...,None]
img=bg.copy(); img[T:B,L:R]=col
im=Image.fromarray(np.clip(img,0,255).astype(np.uint8)); d=ImageDraw.Draw(im,'RGBA')
# 큰길
road=(176,128,72,200)
d.line([(gx(X0),gz(0)),(gx(X1),gz(0))],fill=road,width=3*S//2+1)
d.line([(gx(0),gz(Z0)),(gx(0),gz(Z1))],fill=road,width=3*S//2+1)
d.line([(gx(3000),gz(Z0)),(gx(3000),gz(Z1))],fill=road,width=3*S//2+1)
# 경계 산맥(▲)
bd=np.zeros((mh,mw),bool)
bd[:,1:]|=zid[:,1:]!=zid[:,:-1]; bd[1:,:]|=zid[1:,:]!=zid[:-1,:]
ys,xs=np.nonzero(bd)
rng=np.random.default_rng(9); placed=[]
order=rng.permutation(len(ys))
cell={}
for i in order:
    x,y=xs[i],ys[i]; key=(x//(9*S),y//(9*S))
    if key in cell: continue
    cell[key]=1
    px,py=L+x,T+y
    if abs(gz(0)-py)<5*S or abs(gx(0)-px)<5*S or abs(gx(3000)-px)<5*S: continue
    h=rng.uniform(7,11)*S; w=h*.9
    d.polygon([(px-w,py+h*.5),(px,py-h),(px+w,py+h*.5)],fill=(92,78,66,235))
    d.polygon([(px-w,py+h*.5),(px,py-h),(px-w*.1,py+h*.5)],fill=(168,152,132,235))
    d.polygon([(px-w*.25,py-h*.55),(px,py-h),(px+w*.25,py-h*.55)],fill=(228,224,214,235))
# 강
def river(base,amp):
    P=[]
    for z in np.arange(Z0+40,Z1-40,40):
        P.append((gx(base+amp*.28*np.sin(z/amp*2.4)),gz(z)))
    d.line(P,fill=(52,100,150,255),width=5*S//2+2,joint='curve')
    d.line(P,fill=(116,176,228,255),width=3*S//2+1,joint='curve')
for b,a in [(-1100,420),(1800,380),(4050,360)]: river(b,a)
# 테두리
for inset,w,c in [(0,3,(70,50,34)),(7*S,1,(120,92,60))]:
    d.rectangle([L-inset-4*S,T-inset-4*S,R+inset+4*S,B+inset+4*S],outline=c+(255,),width=w*S//2+1)
# 글꼴
def F(n,size,bold=True):
    return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSerifCJK-%s.ttc'%('Bold' if bold else 'Regular'),size*S)
t="마력숲 대륙전도"
tw=d.textlength(t,font=F(0,22))
d.text((IW/2-tw/2,8*S),t,font=F(0,22),fill=(60,40,26,255))
# 범례
lx,ly=L,B+22*S
d.rectangle([lx,ly,lx+150*S,ly+46*S],fill=(238,222,184,255),outline=(70,50,34,255),width=S)
d.text((lx+8*S,ly+3*S),"범례",font=F(0,10),fill=(60,40,26,255))
d.line([(lx+10*S,ly+22*S),(lx+34*S,ly+22*S)],fill=road,width=3*S//2+1); d.text((lx+40*S,ly+16*S),"큰길",font=F(0,9,False),fill=(60,40,26,255))
d.line([(lx+10*S,ly+36*S),(lx+34*S,ly+36*S)],fill=(116,176,228,255),width=3*S//2+1); d.text((lx+40*S,ly+30*S),"강 / 산맥은 ▲",font=F(0,9,False),fill=(60,40,26,255))
# 축척
sx=R-280*S; sy=B+36*S
km=1000/(X1-X0)*PW
d.line([(sx,sy),(sx+km,sy)],fill=(60,40,26,255),width=2*S)
for t_ in (0,km): d.line([(sx+t_,sy-4*S),(sx+t_,sy+4*S)],fill=(60,40,26,255),width=S)
d.text((sx-4*S,sy+6*S),"0",font=F(0,8),fill=(60,40,26,255)); d.text((sx+km-16*S,sy+6*S),"1000 스터드",font=F(0,8),fill=(60,40,26,255))
# 나침반
cx,cy=R-50*S,B+34*S; r=20*S
d.polygon([(cx,cy-r),(cx+r*.28,cy),(cx,cy+r),(cx-r*.28,cy)],fill=(140,40,40,255),outline=(60,40,26,255))
d.polygon([(cx-r,cy),(cx,cy-r*.28),(cx+r,cy),(cx,cy+r*.28)],fill=(70,50,34,255))
d.ellipse([cx-r*1.15,cy-r*1.15,cx+r*1.15,cy+r*1.15],outline=(60,40,26,255),width=S)
for lab,ox,oy in (("북",-5,-r/S-14),("남",-5,r/S+2),("서",-r/S-14,-6),("동",r/S+4,-6)):
    d.text((cx+ox*S,cy+oy*S),lab,font=F(0,9),fill=(60,40,26,255))
out=im.filter(ImageFilter.UnsharpMask(1.5,50,2)).resize((1024,680),Image.LANCZOS)
out.save('/tmp/claude-0/map/world-map3.png'); print(out.size, L/S/1024,(R-L)/S/1024,T/S/680,PH/S/680)
