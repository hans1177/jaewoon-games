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
rel=gaussian_filter(noise(mh,mw,140,6)*60,2.0)
gyv,gxv=np.gradient(rel)
col*= np.clip(1+(-gxv-gyv)*.35,.88,1.12)[...,None]
bdm=np.zeros((mh,mw),bool); bdm[:,1:]|=zid[:,1:]!=zid[:,:-1]; bdm[1:,:]|=zid[1:,:]!=zid[:-1,:]
bdm=gaussian_filter(bdm.astype(float),2.2)
col*= (1-np.clip(bdm*1.6,0,.28))[...,None]
img=bg.copy(); img[T:B,L:R]=col
im=Image.fromarray(np.clip(img,0,255).astype(np.uint8)); d=ImageDraw.Draw(im,'RGBA')
# 큰길
road=(176,128,72,200)
d.line([(gx(X0),gz(0)),(gx(X1),gz(0))],fill=road,width=3*S//2+1)
d.line([(gx(0),gz(Z0)),(gx(0),gz(Z1))],fill=road,width=3*S//2+1)
d.line([(gx(3000),gz(Z0)),(gx(3000),gz(Z1))],fill=road,width=3*S//2+1)
# ---- 강: 산기슭에서 바다까지, 굽이치고 지류가 합류하며 하류로 갈수록 넓어진다
from scipy.interpolate import splprep, splev
rr=np.random.default_rng(3)
def spline(pts,n=900):
    P=np.array([(gx(x),gz(z)) for x,z in pts],float)
    tck,_=splprep([P[:,0],P[:,1]],s=0,k=min(3,len(P)-1)); u=np.linspace(0,1,n)
    x,y=splev(u,tck); x=np.array(x); y=np.array(y)
    dx,dy=np.gradient(x),np.gradient(y); ln=np.hypot(dx,dy)+1e-6
    nx,ny=-dy/ln,dx/ln
    ph=rr.random()*6
    off=(np.sin(u*np.pi*9+ph)*6+np.sin(u*np.pi*23+ph*2)*2.2)*S*(0.35+u*.9)
    return x+nx*off,y+ny*off
def draw_river(x,y,w0,w1):
    n=len(x)
    for i in range(n):
        u=i/(n-1); w=(w0+(w1-w0)*u**.8)*S
        r=w/2+1.6*S
        d.ellipse([x[i]-r,y[i]-r,x[i]+r,y[i]+r],fill=(56,84,112,255))
    for i in range(n):
        u=i/(n-1); w=(w0+(w1-w0)*u**.8)*S
        r=w/2
        d.ellipse([x[i]-r,y[i]-r,x[i]+r,y[i]+r],fill=(110,168,214,255))
        r2=r*.45
        d.ellipse([x[i]-r2-.5*S,y[i]-r2-.5*S,x[i]+r2-.5*S,y[i]+r2-.5*S],fill=(150,198,232,255))
rivers=[
 ([(-1300,-1750),(-1250,-1300),(-900,-950),(-1050,-450),(-650,-150),(-450,350),(-800,900),(-600,1500),(-900,2400)],1.6,7.5),
 ([(-2150,-250),(-1700,-100),(-1250,-300),(-1050,-450)],1.2,3.2),
 ([(1500,-1450),(1250,-1000),(1500,-500),(1100,-100),(1350,500),(1250,1000),(1600,1600),(1700,2400)],1.6,8),
 ([(2150,-700),(1850,-350),(1500,-500)],1.2,3.4),
 ([(4600,-1850),(4350,-1400),(4650,-900),(4400,-400),(4800,100),(4950,700),(4700,1300),(5200,1900),(5250,2400)],1.6,8),
 ([(6050,-800),(5650,-500),(5250,-700),(4650,-900)],1.2,3.4),
 ([(3800,1250),(4300,1500),(4750,1250)],1.1,2.6),
]
mains=[]
for pts,w0,w1 in rivers:
    if w1>5:
        x,y=spline(pts); mains.append((x,y)); draw_river(x,y,w0,w1)
for pts,w0,w1 in rivers:
    if w1<=5:
        x,y=spline(pts)
        if mains:
            best=None
            for mx,my in mains:
                dd=np.hypot(mx-x[-1],my-y[-1]); j=dd.argmin()
                if best is None or dd[j]<best[0]: best=(dd[j],mx[j],my[j])
            x[-6:]=np.linspace(x[-6],best[1],6); y[-6:]=np.linspace(y[-6],best[2],6)
        draw_river(x,y,w0,w1)
for (lx_,lz_,rx,rz) in [(3650,330,170,95),(4950,760,150,80),(-700,1500,160,85)]:
    d.ellipse([gx(lx_)-rx/8800*PW,gz(lz_)-rz/4800*PH,gx(lx_)+rx/8800*PW,gz(lz_)+rz/4800*PH],fill=(112,170,214,255),outline=(56,84,112,255),width=S)
def tree(px,py,sz,c):
    d.ellipse([px-sz*.9,py+sz*.5,px+sz*.9,py+sz*.9],fill=(0,0,0,40))
    d.polygon([(px-sz*.7,py+sz*.55),(px,py-sz*1.1),(px+sz*.7,py+sz*.55)],fill=c+(255,))
    d.polygon([(px,py-sz*1.1),(px+sz*.7,py+sz*.55),(px,py+sz*.55)],fill=(max(c[0]-26,0),max(c[1]-26,0),max(c[2]-20,0),255))
zi_name={}
for l in open('/tmp/luau/map.txt'):
    if l.startswith('zone '):
        p=l.split(); zi_name[p[2]]=int(p[1])
def scatter(zname,count,sz,c,seed):
    r=np.random.default_rng(seed); k=zi_name[zname]
    fm=noise(mh,mw,70,seed)
    for _ in range(count):
        x=int(r.integers(8,mw-8)); y=int(r.integers(8,mh-8))
        if zid[y,x]==k and fm[y,x]>.48: tree(L+x,T+y,sz*S*r.uniform(.8,1.3),tuple(int(v) for v in (np.array(c)*r.uniform(.85,1.15))))
scatter("worldtree",2600,3.6,(34,94,66),31)
scatter("meadow",220,3.2,(56,126,64),32)
scatter("wetland",420,3.2,(52,104,70),33)
scatter("windcliff",160,3.0,(78,126,72),34)
scatter("swamp",380,3.2,(40,64,50),35)
scatter("deadmarsh",300,3.0,(40,52,44),36)
peaks=[]
def range_(pts,wid,dens,hmin,hmax,seed):
    r=np.random.default_rng(seed)
    P=np.array([(gx(x),gz(z)) for x,z in pts],float)
    seg=np.hypot(*np.diff(P,axis=0).T); tot=seg.sum(); cs=np.cumsum(seg)
    n=int(tot/(dens*S))
    for i in range(n):
        t=r.random()*tot; k=min(np.searchsorted(cs,t),len(seg)-1)
        f=(t-(cs[k]-seg[k]))/seg[k]
        px=P[k,0]+(P[k+1,0]-P[k,0])*f; py=P[k,1]+(P[k+1,1]-P[k,1])*f
        o=r.normal(0,wid/8800*PW*.45)
        ang=np.arctan2(*(P[k+1]-P[k])[::-1])+np.pi/2
        px+=np.cos(ang)*o; py+=np.sin(ang)*o*.8
        cen=1-min(1,abs(o)/(wid/8800*PW))
        h=(hmin+(hmax-hmin)*(0.35+0.65*cen)*r.uniform(.6,1))*S
        peaks.append((py,px,h,r.uniform(.8,1.2)))
range_([(-2250,-2250),(-1500,-2100),(-600,-2150),(400,-2200),(1300,-2150)],280,5.5,12,30,41)
range_([(-2300,-1400),(-2150,-350),(-2250,700)],230,6,10,26,42)
range_([(1000,-1550),(1700,-1400),(2400,-1550),(3000,-1450)],220,5.5,11,26,43)
range_([(3900,-2250),(4700,-2100),(5600,-2250),(6300,-1950)],280,5.5,12,30,44)
range_([(6100,-1100),(6280,-300),(6150,600),(6300,1300)],220,6,10,25,45)
range_([(-1200,1350),(-300,1450),(700,1350)],190,6.5,9,20,46)
range_([(2000,1300),(3000,1350),(3900,1300)],190,6.5,9,20,47)
range_([(2150,-120),(2400,-170),(2650,-90)],200,4.5,16,36,48)
peaks.sort()
pr=np.random.default_rng(77)
# 산기슭 언덕
for py,px,h,k in peaks[::2]:
    for _ in range(2):
        ox=pr.normal(0,h*1.1); oy=h*pr.uniform(.1,.5)
        r_=h*pr.uniform(.45,.8)
        d.ellipse([px+ox-r_*1.3,py+oy-r_*.35,px+ox+r_*1.3,py+oy+r_*.45],fill=(120,104,80,46))
for py,px,h,k in peaks:
    w=h*.95*k
    d.ellipse([px-w*1.0,py-h*.10,px+w*1.5,py+h*.24],fill=(40,30,20,80))
    nL=pr.integers(2,5); nR=pr.integers(2,5)
    tx=px+w*pr.uniform(-.18,.18); ty=py-h
    left=[(px-w,py)]
    for i in range(1,nL+1):
        f=i/(nL+1); left.append((px-w*(1-f)+pr.normal(0,w*.07)+(tx-px)*f, py-h*f**.85+pr.normal(0,h*.05)))
    left.append((tx,ty))
    right=[(tx,ty)]
    for i in range(1,nR+1):
        f=i/(nR+1); right.append((tx+(px+w-tx)*f+pr.normal(0,w*.07), ty+(py-ty)*f**1.15+pr.normal(0,h*.05)))
    right.append((px+w,py))
    mid=(px+w*.1,py)
    d.polygon(left+[mid],fill=(190,174,150,255))
    d.polygon(right+[mid],fill=(98,82,68,255))
    # 밝은 윗면과 능선 해칭
    d.polygon([left[-3] if len(left)>3 else left[1],left[-2] if len(left)>2 else left[1],left[-1],(tx-w*.05,ty+h*.35)],fill=(224,216,198,230))
    for i in range(5):
        f=pr.uniform(.2,.9); x1=tx+(px+w-tx)*f*.7; y1=ty+(py-ty)*f
        d.line([(x1,y1),(x1+w*.12,y1+h*.18)],fill=(62,50,42,220),width=max(1,S//2))
    d.line(left[-3:]+right[:3],fill=(66,54,44,255),width=max(1,S//2))
vx,vy=gx(2400),gz(-60)
d.ellipse([vx-9*S,vy-34*S,vx+9*S,vy-28*S],fill=(214,96,40,255),outline=(70,40,30,255))
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
d.line([(lx+10*S,ly+36*S),(lx+34*S,ly+36*S)],fill=(116,176,228,255),width=3*S//2+1); d.text((lx+40*S,ly+30*S),"강 / 산맥",font=F(0,9,False),fill=(60,40,26,255))
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
out.save('/tmp/claude-0/map/world-map5.png'); print(out.size, L/S/1024,(R-L)/S/1024,T/S/680,PH/S/680)
