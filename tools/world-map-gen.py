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
# hillshade (빛: 북서쪽)
gyv,gxv=np.gradient(hgt*38)
shade=np.clip(.5+(-gxv-gyv)*1.9,0,1.25)
mt=np.clip(hgt*2.4,0,1)
rock=np.array([128,118,104])
rockc=rock[None,None,:]*(0.55+0.75*shade)[...,None]
hi=np.clip((hgt-.62)*4,0,1)[...,None]   # 높은 곳은 연회색 바위(눈 없음)
rockc=rockc*(1-hi)+np.array([190,184,172])*(0.7+0.5*shade)[...,None]*hi
col=col*(1-mt[...,None])+rockc*mt[...,None]
# 산 그림자(남동쪽으로 길게)
sh=np.roll(np.roll(hgt,6,axis=1),8,axis=0)
cast=np.clip((sh-hgt)*3.5,0,.45)
col*= (1-cast)[...,None]*np.ones(3)
# ---- 숲 질감(세계수·초원·습원): 어두운 점
def stipple(mask,dens,color,size,seed):
    global col
    r=np.random.default_rng(seed)
    im=Image.fromarray(col.astype(np.uint8)); d=ImageDraw.Draw(im,'RGBA')
    n=int(mask.sum()*dens)
    ys,xs=np.nonzero(mask)
    for i in r.choice(len(ys),min(n,len(ys)),replace=False):
        x,y=xs[i],ys[i]
        if hgt[y,x]>.25: continue
        s=size*(0.7+0.6*r.random())
        d.ellipse([x-s,y-s*.8,x+s,y+s*.8],fill=color+(110,))
        d.ellipse([x-s*.6-1,y-s*.9,x+s*.4,y-s*.1],fill=(color[0]+30,color[1]+34,color[2]+20,70))
    col=np.array(im).astype(float)
names={v[0]:k for k,v in cols.items()}
stipple(zid==names['worldtree'],.012,(22,70,52),4.2,21)
stipple(zid==names['meadow'],.0016,(40,100,52),3.4,22)
stipple(zid==names['wetland'],.004,(40,84,58),3.6,23)
stipple(zid==names['windcliff'],.0014,(60,100,60),3.2,24)
stipple(zid==names['swamp'],.004,(34,50,40),3.6,25)
stipple(zid==names['deadmarsh'],.003,(30,38,34),3.4,26)
# 사막 모래 물결
dune=np.sin((xx*.05+yy*.03)+noise(60,5)*14)*.5+.5
dm=(gaussian_filter((zid==names['desert']).astype(float),6)+gaussian_filter((zid==names['oasis']).astype(float),6))[...,None]
col=col*(1-.10*dm*dune[...,None])+0*dm
# 화산 용암 균열
lv=gaussian_filter((zid==names['volcano']).astype(float),6)
crack=np.abs(noise(24,31)-.5)<.012
col[crack&(lv>.85)&(hgt<.9)]=[230,110,40]
# 혼돈 균열 보라빛
cm=gaussian_filter((zid==names['chaos']).astype(float),6)
crack2=np.abs(noise(30,32)-.5)<.010
col[crack2&(cm>.85)&(hgt<.4)]=[170,80,200]
# ---- 강
im=Image.fromarray(np.clip(col,0,255).astype(np.uint8)); d=ImageDraw.Draw(im)
def river(pts,w=5):
    P=[]
    for (a,b),(c,e) in zip(pts[:-1],pts[1:]):
        for t in np.linspace(0,1,30,endpoint=False):
            P.append((wx(a+(c-a)*t)+np.sin(t*9+a)*14,wz(b+(e-b)*t)+np.cos(t*7+b)*10))
    d.line(P,fill=(40,80,110),width=w+2,joint='curve')
    d.line(P,fill=(92,146,184),width=max(2,w-2),joint='curve')
river([(-1400,-2150),(-1200,-1500),(-700,-900),(-500,-200),(-400,600),(-700,1400),(-900,2400)],6)
river([(1500,-1500),(1300,-800),(1100,-100),(1300,500),(1500,1300),(1700,2400)],5)
river([(4600,-2100),(4300,-1200),(4700,-400),(5000,600),(5000,1400),(5200,2400)],6)
col=np.array(im).astype(float)
# ---- 바다 + 해안선
land=gaussian_filter(np.ones((H,W)),1)
edge=np.minimum.reduce([xx,W-xx,yy,H-yy])
coast=edge-(noise(90,41)*70+20)
lm=np.clip(coast/6,0,1)
sea=np.array([30,62,92])*(0.8+0.3*noise(50,42))[...,None]
foam=np.exp(-((coast-2)/5)**2)[...,None]*np.array([170,200,210])*.55
shore=np.exp(-((coast-14)/16)**2)[...,None]*np.array([40,40,30])*.0
col=col*lm[...,None]+sea*(1-lm[...,None])+foam*(coast>-12)[...,None]*(1-lm[...,None]*0)
# 비네트 + 양피지 테두리
v=1-.22*(((xx/W-.5)**2+(yy/H-.5)**2)*2)
col*=v[...,None]
out=Image.fromarray(np.clip(col,0,255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(2,60,3))
out=out.resize((1024,int(1024*H/W)),Image.LANCZOS)
out.save('/tmp/claude-0/map/world-map.png'); print(out.size)
