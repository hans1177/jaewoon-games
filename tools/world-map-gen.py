import numpy as np, re
from PIL import Image, ImageFilter, ImageDraw
from scipy.ndimage import gaussian_filter, zoom, map_coordinates
rng=np.random.default_rng(7)
X0,X1,Z0,Z1=-2400,6400,-2400,2400
W,H=2048,1117
rows=[list(map(int,l.split()[1].split(',')[:-1] if l.strip().endswith(',') else l.split()[1].split(','))) for l in open('/tmp/luau/map.txt') if l.startswith('row ')]
G=np.array(rows)  # 48x88
cols={}
for l in open('/tmp/luau/map.txt'):
    if l.startswith('zone '):
        p=l.split(); cols[int(p[1])]=(p[2],np.array(list(map(float,p[3:6]))))
def wx(x): return (x-X0)/(X1-X0)*W
def wz(z): return (z-Z0)/(Z1-Z0)*H
def noise(scale,seed,oct=5):
    r=np.random.default_rng(seed); out=np.zeros((H,W)); amp=1; tot=0
    for o in range(oct):
        s=max(2,int(scale/(2**o)))
        g=r.random((H//s+3,W//s+3))
        out+=amp*zoom(g,s,order=3)[:H,:W]; tot+=amp; amp*=.5
    return out/tot
# smooth zone color field with warped borders
yy,xx=np.mgrid[0:H,0:W].astype(float)
wxn=noise(180,1)*60-30; wzn=noise(180,2)*60-30
gx=np.clip((xx+wxn)/W*88,0,87.99); gy=np.clip((yy+wzn)/H*48,0,47.99)
zid=G[gy.astype(int),gx.astype(int)]
col=np.zeros((H,W,3))
for k,(n,c) in cols.items():
    m=gaussian_filter((zid==k).astype(float),14)
    col+=m[...,None]*c
# soften saturation toward natural tones
col=col*.55+np.array([150,140,110])*.45*0+col*0
col=np.clip(col,0,255)
n1=noise(40,3); n2=noise(12,4)
col*= (0.82+0.36*n1)[...,None]
col*= (0.93+0.14*n2)[...,None]
# ---- mountain height field: separate ranges
hgt=np.zeros((H,W))
def ridge(pts,width,height,seed,jag=1.0):
    global hgt
    r=np.random.default_rng(seed)
    P=[]
    for (a,b),(c,d) in zip(pts[:-1],pts[1:]):
        for t in np.linspace(0,1,40,endpoint=False): P.append((a+(c-a)*t,b+(d-b)*t))
    P.append(pts[-1])
    m=np.zeros((H,W))
    for (x,z) in P:
        px,pz=wx(x),wz(z)
        x0,x1=int(max(0,px-width*2.5)),int(min(W,px+width*2.5)); z0,z1=int(max(0,pz-width*2.5)),int(min(H,pz+width*2.5))
        if x1<=x0 or z1<=z0: continue
        d2=(xx[z0:z1,x0:x1]-px)**2+(yy[z0:z1,x0:x1]-pz)**2
        m[z0:z1,x0:x1]=np.maximum(m[z0:z1,x0:x1],np.exp(-d2/(2*width**2))*(0.7+0.3*r.random()))
    rn=noise(30,seed+9,4)
    hgt=np.maximum(hgt,height*m*(0.45+0.9*rn*jag))
S=W/8800
ridge([(-2300,-2000),(-1500,-2150),(-500,-2050),(500,-2200),(1300,-2100)],46,1.25,11)      # 북부 고원 산맥
ridge([(-2250,-1300),(-2100,-300),(-2250,800)],38,1.1,12)                                   # 바람 절벽 서쪽 산줄기
ridge([(1100,-1500),(1600,-1400),(2300,-1600),(3000,-1450)],34,1.1,13)                      # 고대 협곡 암벽
ridge([(3900,-2250),(4700,-2100),(5600,-2250),(6300,-2000)],44,1.25,14)                    # 혼돈의 대지 북쪽 산맥
ridge([(6000,-1000),(6250,-300),(6100,600),(6300,1200)],34,1.1,15)                          # 성채 동쪽 암벽
ridge([(2250,-80),(2400,-130),(2550,-60)],28,1.25,16,.5)                                   # 화산 원뿔
ridge([(-1100,1250),(-300,1400),(700,1300)],28,.8,17)                                      # 남부 구릉
ridge([(2000,1250),(3000,1300),(3900,1250)],26,.8,18)                                     # 사막 남쪽 바위능선
hgt=np.clip(gaussian_filter(hgt,1.4),0,1.4)

def stipple(mask,dens,color,size,seed):
    global col
    r=np.random.default_rng(seed)
    im=Image.fromarray(col.astype(np.uint8)); d=ImageDraw.Draw(im,'RGBA')
    n=int(mask.sum()*dens)
    ys,xs=np.nonzero(mask)
    for i in r.choice(len(ys),min(n,len(ys)),replace=False):
        x,y=xs[i],ys[i]
        if Hh[y,x]>.62: continue
        s=size*(0.7+0.6*r.random())
        d.ellipse([x-s,y-s*.8,x+s,y+s*.8],fill=color+(110,))
        d.ellipse([x-s*.6-1,y-s*.9,x+s*.4,y-s*.1],fill=(color[0]+30,color[1]+34,color[2]+20,70))
    col=np.array(im).astype(float)

# ===== Skyrim식: 기복 있는 실제 높이 + 기울인 시점 =====
zm=lambda n:gaussian_filter((zid==names[n]).astype(float),20)
names={v[0]:k for k,v in cols.items()}
base=(noise(220,51)-.5)*.30+(noise(90,52)-.5)*.14
base+=zm('highland')*.30+zm('canyon')*.12+zm('windcliff')*.10+zm('citadel')*.08
base-=zm('desert')*.05+zm('wetland')*.08+zm('deadmarsh')*.10+zm('swamp')*.06
edge=np.minimum.reduce([xx,W-xx,yy,H-yy])
coast=edge-(noise(90,41)*70+26)
landm=np.clip(coast/14,0,1)
rg=np.clip(1-np.abs(2*noise(70,81,4)-1),0,1); rg=rg**1.3
mmask=np.clip(gaussian_filter(hgt,3)*1.6,0,1)
Hh=np.clip(base+.25,0,1)*.30+mmask*(.25+.75*rg)*.95
Hh=np.nan_to_num(gaussian_filter(Hh,2.0)*landm)
# 강: 낮은 곳을 따라 높이를 파낸다
rv=Image.new('L',(W,H),0); rd=ImageDraw.Draw(rv)
def river(pts,w=5):
    P=[]
    for (a,b),(c,e) in zip(pts[:-1],pts[1:]):
        for t in np.linspace(0,1,30,endpoint=False):
            P.append((wx(a+(c-a)*t)+np.sin(t*9+a)*14,wz(b+(e-b)*t)+np.cos(t*7+b)*10))
    rd.line(P,fill=255,width=w,joint='curve')
river([(-1400,-2150),(-1200,-1500),(-700,-900),(-500,-200),(-400,600),(-700,1400),(-900,2400)],6)
river([(1500,-1500),(1300,-800),(1100,-100),(1300,500),(1500,1300),(1700,2400)],5)
river([(4600,-2100),(4300,-1200),(4700,-400),(5000,600),(5000,1400),(5200,2400)],6)
rm=gaussian_filter(np.array(rv).astype(float)/255,1.2)
Hh=Hh-rm*.04
# 색: 채도를 낮춘 스카이림 팔레트
gray=col.mean(axis=2,keepdims=True)
c=col*.62+gray*.38
c*= (0.80+0.35*n1)[...,None]
gy2,gx2=np.gradient(gaussian_filter(Hh,1.0)*55)
sh=np.clip(.80+(-gx2-gy2)*1.6,.30,1.4)
slope=np.clip(np.hypot(gx2,gy2)*1.4,0,1)
rockc=np.array([92,80,66])*(0.55+0.7*np.clip(sh,0,1.2))[...,None]
m=np.clip(slope*1.2+np.clip(Hh-.55,0,1)*1.6,0,1)[...,None]
c=c*(1-m*.7)+rockc*m*.7
hi=np.clip((Hh-.95)*6,0,1)[...,None]*0
c=c*(1-hi*.8)+np.array([196,192,184])*(0.7+0.4*sh)[...,None]*hi*.55
c*=(sh[...,None]**1.2)*1.2
c=np.clip(c,0,255)
col=c
stipple(zid==names['worldtree'],.012,(20,64,48),4.0,21)
stipple(zid==names['meadow'],.0016,(38,92,50),3.2,22)
stipple(zid==names['wetland'],.004,(38,80,56),3.4,23)
stipple(zid==names['windcliff'],.0014,(56,96,58),3.0,24)
stipple(zid==names['swamp'],.004,(32,48,38),3.4,25)
stipple(zid==names['deadmarsh'],.003,(28,36,32),3.2,26)
c=col
# 강 색 + 바다
c=c*(1-rm[...,None]*.9)+np.array([86,140,176])*rm[...,None]*.9
sea=np.array([34,66,92])*(0.8+0.3*noise(50,42))[...,None]
foam=np.exp(-((coast-4)/6)**2)[...,None]*np.array([175,200,205])*.5
c=c*landm[...,None]+sea*(1-landm[...,None])+foam*(1-landm[...,None])
# ---- 기울인 투영 (z는 선형, 높이는 위로 솟음)
TOP=.10; SPAN=.86; K=.06*H
out=np.zeros((H,W,3)); out[:]=np.array([40,74,100])
bgn=noise(60,61); out*= (0.8+.5*bgn)[...,None]
gh=H
for r in range(gh):
    base_y=(TOP+SPAN*r/gh)*H
    ys=(base_y-Hh[r]*K).astype(int)
    nxt=min(gh-1,r+1); ys2=((TOP+SPAN*(r+1)/gh)*H-Hh[nxt]*K).astype(int)
    ln=np.maximum(1,ys2-ys+1)
    ln=np.minimum(ln,40)
    cc=c[r]
    for k in range(int(ln.max())):
        sel=ln>k
        y=np.clip(ys+k,0,H-1)
        out[y[sel],np.arange(W)[sel]]=cc[sel]*(1-.0*k)
# 안개/구름 + 비네트
haze=np.clip((yy/H-.78)*3,0,1)*.0
cl=np.clip(noise(120,71)-.55,0,1)*2.2*np.clip(1-np.abs(yy/H-.5)*1.6,0,1)
out=out*(1-cl[...,None]*.35)+np.array([210,216,220])*cl[...,None]*.35
v=1-.30*(((xx/W-.5)**2+(yy/H-.5)**2)*2)
out*=v[...,None]
img=Image.fromarray(np.clip(out,0,255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(2,70,3))
img=img.resize((1024,int(1024*H/W)),Image.LANCZOS)
img.save('/tmp/claude-0/map/world-map2.png');print(img.size)
