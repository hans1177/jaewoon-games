import math, random
S=512
def head(body,defs=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>{defs}</defs>{body}</svg>'
def lg(id,c1,c2,x1=0,y1=0,x2=1,y2=1):
    return f'<linearGradient id="{id}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'
def rg(id,c1,c2):
    return f'<radialGradient id="{id}" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient>'
def shadow(cx=256,cy=440,rx=170,ry=26):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#000" opacity="0.28"/>'
icons={}

# feathers
def plume(rot,cx,cy,c1,c2,idn):
    d=lg(idn,c1,c2,0,0,1,1)
    barbs=""
    for i in range(0,26):
        t=i/25
        y=-190+t*330
        w=70*math.sin(math.pi*(0.08+0.92*t))**0.8+8
        barbs+=f'<path d="M0 {y:.1f} Q{-w*0.6:.1f} {y-10:.1f} {-w:.1f} {y+14:.1f} Q{-w*0.5:.1f} {y+8:.1f} 0 {y+4:.1f} Q{w*0.5:.1f} {y+8:.1f} {w:.1f} {y+14:.1f} Q{w*0.6:.1f} {y-10:.1f} 0 {y:.1f}Z" fill="url(#{idn})" stroke="rgba(0,0,0,.12)" stroke-width="1.2"/>'
    return d, f'<g transform="translate({cx} {cy}) rotate({rot})">{barbs}<path d="M0 -196 L2 190" stroke="#c9b690" stroke-width="5" stroke-linecap="round"/><path d="M0 150 L3 215" stroke="#a4905f" stroke-width="7" stroke-linecap="round"/></g>'
d1,b1=plume(-24,200,250,"#fff8ea","#d9cdb0","pa")
d2,b2=plume(22,318,262,"#4a4552","#1b1a22","pb")
icons['feathers']=head(shadow()+b2+b1,d1+d2)

# cloves
def clove(x,y,rot,k=1):
    return f'''<g transform="translate({x} {y}) rotate({rot}) scale({k})">
<path d="M-7 -10 Q-12 70 -3 150 Q0 158 3 150 Q12 70 7 -10Z" fill="url(#cs)" stroke="#2a150b" stroke-width="2"/>
<circle cx="0" cy="-26" r="22" fill="url(#cb)" stroke="#2a150b" stroke-width="2"/>
<path d="M0 -26 L-22 -38 M0 -26 L22 -38 M0 -26 L-16 -6 M0 -26 L16 -6" stroke="#2a150b" stroke-width="3" stroke-linecap="round"/>
<path d="M-20 -46 Q0 -64 20 -46 Q8 -40 0 -44 Q-8 -40 -20 -46Z" fill="#7a4a2a" stroke="#2a150b" stroke-width="2"/>
</g>'''
cd=lg('cs','#7b4a2a','#3a1d0e',0,0,1,0)+rg('cb','#a8693a','#4a2512')
icons['cloves']=head(shadow()+clove(150,190,-38)+clove(360,170,32)+clove(250,215,4,1.18)+clove(190,280,-70,.9)+clove(335,300,58,.95),cd)

# nutmeg
def nut(cx,cy,rx,ry,rot):
    veins="".join(f'<path d="M{-rx*0.9:.0f} {k*ry*0.35:.0f} Q0 {k*ry*0.35+18:.0f} {rx*0.9:.0f} {k*ry*0.35:.0f}" stroke="#4a2c14" stroke-width="2.5" fill="none" opacity=".55"/>' for k in (-2,-1,0,1,2))
    return f'<g transform="translate({cx} {cy}) rotate({rot})"><ellipse rx="{rx}" ry="{ry}" fill="url(#nb)" stroke="#3a2010" stroke-width="3"/>{veins}<ellipse cx="{-rx*.3}" cy="{-ry*.4}" rx="{rx*.3}" ry="{ry*.18}" fill="#fff" opacity=".22"/></g>'
half='<g transform="translate(330 300) rotate(20)"><ellipse rx="92" ry="70" fill="#8a5a30" stroke="#3a2010" stroke-width="3"/><ellipse rx="76" ry="55" fill="url(#ni)" stroke="#5b3a1c" stroke-width="2"/>'+"".join(f'<path d="M0 0 Q{60*math.cos(a):.0f} {40*math.sin(a):.0f} {70*math.cos(a+.4):.0f} {50*math.sin(a+.4):.0f}" stroke="#6b4220" stroke-width="3" fill="none" opacity=".6"/>' for a in [i*math.pi/4 for i in range(8)])+'<ellipse rx="10" ry="8" fill="#5b3a1c"/></g>'
mace='<path d="M120 130 Q80 200 120 260 Q150 200 120 130Z" fill="#c4322a" stroke="#6b130f" stroke-width="2" opacity=".0"/>'
nd=rg('nb','#b98350','#5c3a1c')+rg('ni','#e8c79a','#a8794a')
icons['nutmeg']=head(shadow()+nut(190,230,86,112,-14)+half,nd)

# cinnamon
def quill(x,y,rot,L=300,r=38):
    return f'''<g transform="translate({x} {y}) rotate({rot})">
<rect x="{-L/2}" y="{-r}" width="{L}" height="{2*r}" rx="{r}" fill="url(#qa)" stroke="#4a2410" stroke-width="3"/>
<path d="M{-L/2+20} {-r*0.5} L{L/2-20} {-r*0.5} M{-L/2+30} {r*0.1} L{L/2-30} {r*0.1} M{-L/2+20} {r*0.6} L{L/2-20} {r*0.6}" stroke="#8a5028" stroke-width="2.5" opacity=".6"/>
<ellipse cx="{L/2-6}" cy="0" rx="{r*0.62}" ry="{r}" fill="#6a3a1a" stroke="#3a1c0a" stroke-width="3"/>
<ellipse cx="{L/2-6}" cy="0" rx="{r*0.3}" ry="{r*0.55}" fill="none" stroke="#a8703c" stroke-width="5"/>
<ellipse cx="{L/2-6}" cy="0" rx="{r*0.1}" ry="{r*0.2}" fill="#2a1408"/>
</g>'''
cq=lg('qa','#c68a4e','#7a4220',0,0,0,1)
twine='<path d="M200 200 Q215 262 200 330" stroke="#e8d6a8" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M200 200 Q215 262 200 330" stroke="#8a7440" stroke-width="2" fill="none" stroke-dasharray="6 6"/>'
icons['cinnamon']=head(shadow()+quill(256,330,-8,330,34)+quill(250,260,-2,340,36)+quill(262,190,6,330,34)+twine,cq)

# indigo
cube='''<g transform="translate(256 260)">
<path d="M-120 -40 L0 -100 L120 -40 L0 20Z" fill="#3b5fc4" stroke="#0e1d55" stroke-width="3"/>
<path d="M-120 -40 L0 20 L0 150 L-120 90Z" fill="url(#ic1)" stroke="#0e1d55" stroke-width="3"/>
<path d="M120 -40 L0 20 L0 150 L120 90Z" fill="url(#ic2)" stroke="#0e1d55" stroke-width="3"/>
<path d="M-60 -70 L50 -22" stroke="#7fa0ec" stroke-width="5" opacity=".6" stroke-linecap="round"/></g>'''
pile='<path d="M300 430 Q330 360 400 380 Q470 400 460 440 Q380 456 300 430Z" fill="#2c47a8" stroke="#0e1d55" stroke-width="3"/><path d="M330 405 Q390 380 440 410" stroke="#6f90e0" stroke-width="4" fill="none" opacity=".7"/>'
idd=lg('ic1','#26409a','#142463',0,0,0,1)+lg('ic2','#1b3282','#0c1a4d',0,0,0,1)
icons['indigo']=head(shadow()+cube+pile,idd)

# rice
sack='''<g>
<path d="M150 190 Q120 330 150 420 Q256 450 362 420 Q392 330 362 190 Q256 160 150 190Z" fill="url(#sk)" stroke="#5a4320" stroke-width="3"/>
<path d="M170 215 Q256 190 342 215" stroke="#8a6a38" stroke-width="3" fill="none"/>
<path d="M190 260 L190 400 M230 250 L230 410 M270 250 L270 410 M310 255 L310 405" stroke="#a8884c" stroke-width="2" opacity=".5"/>
<path d="M170 190 Q150 130 200 110 Q256 95 312 110 Q362 130 342 190 Q256 170 170 190Z" fill="#d8bd86" stroke="#5a4320" stroke-width="3"/>
<path d="M175 188 Q256 214 337 188" stroke="#c0392b" stroke-width="12" fill="none" stroke-linecap="round"/>
<path d="M330 192 Q352 220 340 250" stroke="#c0392b" stroke-width="9" fill="none" stroke-linecap="round"/>
<ellipse cx="256" cy="125" rx="60" ry="14" fill="#fff8e6" opacity=".9"/>
</g>'''
grains=""
random.seed(4)
for i in range(70):
    x=random.uniform(170,430); y=random.uniform(420,458)
    if (x-300)**2/210**2+(y-440)**2/22**2<1:
        a=random.uniform(0,180)
        grains+=f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="10" ry="4" transform="rotate({a:.0f} {x:.0f} {y:.0f})" fill="#fffaf0" stroke="#bdb095" stroke-width="1"/>'
icons['rice']=head(shadow(256,452,190,22)+sack+grains,lg('sk','#d9c08a','#a98d56',0,0,0,1))

# lacquer
lac='''<g>
<path d="M90 250 L90 400 Q256 430 422 400 L422 250Z" fill="url(#lq)" stroke="#2a0606" stroke-width="3"/>
<path d="M70 200 Q256 150 442 200 L422 260 Q256 300 90 260Z" fill="url(#lq2)" stroke="#2a0606" stroke-width="3"/>
<path d="M90 255 Q256 300 422 255" stroke="#e5b947" stroke-width="7" fill="none"/>
<path d="M120 380 Q256 410 392 380" stroke="#e5b947" stroke-width="5" fill="none"/>
<g stroke="#e5b947" stroke-width="4" fill="none" stroke-linecap="round">
<path d="M256 190 Q256 215 256 232"/><path d="M256 215 Q226 195 206 210 Q228 226 256 215Z"/><path d="M256 215 Q286 195 306 210 Q284 226 256 215Z"/>
<path d="M150 335 q22 -26 44 0 q22 26 44 0 q22 -26 44 0 q22 26 44 0 q22 -26 44 0"/>
<circle cx="256" cy="318" r="9" fill="#e5b947"/></g>
<path d="M120 215 Q200 185 290 188" stroke="#fff" stroke-width="6" fill="none" opacity=".25" stroke-linecap="round"/>
</g>'''
icons['lacquer']=head(shadow()+lac,lg('lq','#c3281e','#6b0e0a',0,0,0,1)+lg('lq2','#e03a2a','#8a1410',0,0,0,1))

# camphor
def crystal(pts,fill="url(#cm)"):
    return f'<polygon points="{pts}" fill="{fill}" stroke="#7d9aa6" stroke-width="3" stroke-linejoin="round"/>'
cam=crystal("120,380 150,290 220,260 250,330 230,400")+crystal("230,400 250,330 330,300 380,350 350,410")+crystal("250,330 220,260 270,190 340,220 330,300")+crystal("340,220 400,250 380,350 330,300",'#cfe6ee')
cam+='<path d="M150 290 L250 330 L230 400 M250 330 L330 300 M270 190 L250 330" stroke="#fff" stroke-width="3" opacity=".6" fill="none"/><path d="M280 215 L300 240" stroke="#fff" stroke-width="6" opacity=".8" stroke-linecap="round"/>'
icons['camphor']=head(shadow()+cam,lg('cm','#f2fbfd','#a8cbd6',0,0,1,1))

# ginseng
root='''<g>
<path d="M256 150 Q290 150 292 190 Q296 250 330 300 Q352 340 340 400 Q336 420 322 408 Q320 350 292 320 Q284 360 296 420 Q290 446 272 436 Q262 380 256 330 Q246 380 238 432 Q222 442 218 420 Q220 370 220 330 Q186 360 170 400 Q154 410 150 392 Q158 340 206 290 Q222 240 222 190 Q222 150 256 150Z" fill="url(#gs)" stroke="#6a4a22" stroke-width="3"/>
<path d="M232 190 Q262 200 282 190 M228 215 Q258 226 288 214 M226 240 Q258 250 290 240" stroke="#a88650" stroke-width="3" fill="none" opacity=".7"/>
<path d="M256 150 L256 90" stroke="#4f7a2c" stroke-width="7" stroke-linecap="round"/>
<g fill="#5c9a34" stroke="#2f5a16" stroke-width="2.5"><path d="M256 100 Q210 70 190 100 Q222 128 256 100Z"/><path d="M256 100 Q302 70 322 100 Q290 128 256 100Z"/><path d="M256 92 Q240 40 256 24 Q272 40 256 92Z"/></g>
<circle cx="256" cy="76" r="9" fill="#c8302a"/><circle cx="244" cy="68" r="7" fill="#c8302a"/><circle cx="268" cy="68" r="7" fill="#c8302a"/>
</g>'''
icons['ginseng']=head(shadow()+root,lg('gs','#f2dfae','#b98a4c',0,0,0,1))

# vanilla
def pod(x,y,rot,L=330):
    return f'<g transform="translate({x} {y}) rotate({rot})"><path d="M{-L/2} 0 Q{-L/4} -14 0 -9 Q{L/4} -4 {L/2} 8 Q{L/4} 18 0 12 Q{-L/4} 8 {-L/2} 0Z" fill="url(#vp)" stroke="#0e0604" stroke-width="2.5"/><path d="M{-L/2+20} 1 Q0 -2 {L/2-20} 8" stroke="#6e4b36" stroke-width="2" fill="none" opacity=".6"/></g>'
flower='<g transform="translate(380 130)"><g fill="#fff9de" stroke="#cdbd7a" stroke-width="2.5">'+"".join(f'<ellipse cx="0" cy="-34" rx="14" ry="34" transform="rotate({a})"/>' for a in range(0,360,60))+'</g><circle r="12" fill="#e9c94a" stroke="#a88a1a" stroke-width="2"/></g>'
icons['vanilla']=head(shadow()+pod(240,240,-14)+pod(250,262,-6)+pod(262,284,-1)+pod(256,306,8)+pod(262,328,14)+'<path d="M225 215 Q252 330 235 350" stroke="#e8d6a8" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M225 215 Q252 330 235 350" stroke="#8a7440" stroke-width="2" fill="none" stroke-dasharray="6 6"/>'+flower,lg('vp','#3e2418','#150a06',0,0,0,1))

# cochineal
pad='<g><path d="M110 120 Q80 250 150 330 Q250 380 330 320 Q390 240 340 120 Q220 70 110 120Z" fill="url(#cp)" stroke="#2d5a1c" stroke-width="3"/>'+"".join(f'<g stroke="#e8f0c8" stroke-width="3" stroke-linecap="round"><path d="M{x} {y} l12 -10 M{x} {y} l-12 -10 M{x} {y} l0 14"/></g>' for x,y in [(160,170),(220,140),(280,170),(190,240),(260,250),(310,220),(230,300)])+'</g>'
bugs=""
random.seed(9)
for i in range(46):
    x=random.uniform(200,430); y=random.uniform(360,440)
    if ((x-315)/120)**2+((y-405)/42)**2<1:
        a=random.uniform(0,180)
        bugs+=f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="12" ry="8" transform="rotate({a:.0f} {x:.0f} {y:.0f})" fill="url(#cb2)" stroke="#2a0612" stroke-width="1.5"/>'
icons['cochineal']=head(shadow()+pad+'<path d="M180 420 Q320 350 460 420 Q320 458 180 420Z" fill="#a0153a" stroke="#4a0818" stroke-width="3" opacity=".9"/>'+bugs,lg('cp','#8fc060','#4f8a34',0,0,0,1)+rg('cb2','#d8335a','#5e0a22'))

# sealskin
pelt='''<g>
<path d="M256 70 Q300 60 330 90 Q360 100 372 140 Q410 160 440 150 Q462 190 420 220 Q390 250 396 290 Q420 330 460 360 Q450 400 400 396 Q370 380 346 392 Q330 440 300 450 Q276 410 256 424 Q236 410 212 450 Q182 440 166 392 Q142 380 112 396 Q62 400 52 360 Q92 330 116 290 Q122 250 92 220 Q50 190 72 150 Q102 160 140 140 Q152 100 182 90 Q212 60 256 70Z" fill="url(#sl)" stroke="#2c3238" stroke-width="3.5" stroke-linejoin="round"/>
<g fill="#4a525a" opacity=".65">'''+"".join(f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*0.7:.0f}" transform="rotate({a} {x} {y})"/>' for x,y,r,a in [(220,150,14,20),(300,170,12,-10),(260,230,16,30),(200,290,12,0),(320,300,14,40),(260,350,12,-20),(150,200,9,0),(370,210,9,10)])+'''</g>
<path d="M256 90 Q246 250 256 410" stroke="#cfd6dc" stroke-width="3" opacity=".4" fill="none" stroke-dasharray="3 10"/>
<path d="M200 110 Q256 80 312 110" stroke="#e6ecf0" stroke-width="6" opacity=".35" fill="none" stroke-linecap="round"/>
</g>'''
icons['sealskin']=head(shadow(256,456,190,20)+pelt,lg('sl','#8c969f','#4f5861',0,0,0,1))

# guano
bird='<g transform="translate(320 190)"><path d="M-70 10 Q-30 -30 20 -10 Q50 -50 80 -40 Q60 -10 40 10 Q20 40 -30 36 Q-60 30 -70 10Z" fill="#f4f4f0" stroke="#4a4a50" stroke-width="3"/><path d="M80 -40 L108 -34 L82 -28Z" fill="#e8a22a" stroke="#6a4a0a" stroke-width="2"/><circle cx="62" cy="-34" r="3.5" fill="#111"/><path d="M-70 10 Q-110 0 -126 20 Q-100 26 -70 22Z" fill="#6a707a" stroke="#4a4a50" stroke-width="2"/></g>'
heap='<path d="M80 430 Q110 330 190 310 Q250 250 320 310 Q400 330 430 430 Q256 468 80 430Z" fill="url(#gh)" stroke="#6b6a5a" stroke-width="3.5"/><g fill="#fff" opacity=".6"><ellipse cx="200" cy="360" rx="26" ry="9"/><ellipse cx="300" cy="340" rx="30" ry="10"/><ellipse cx="260" cy="400" rx="36" ry="10"/></g><g fill="#8e8c78" opacity=".6"><circle cx="150" cy="400" r="8"/><circle cx="360" cy="395" r="9"/><circle cx="240" cy="330" r="6"/><circle cx="330" cy="420" r="6"/></g>'
icons['guano']=head(shadow()+heap+bird,lg('gh','#e8e4d0','#a8a48a',0,0,0,1))

# nitrate
def spike(x,y,rot,h,w):
    return f'<g transform="translate({x} {y}) rotate({rot})"><polygon points="{-w},0 0,{-h} {w},0 {w*0.6},{h*0.25} {-w*0.6},{h*0.25}" fill="url(#nt)" stroke="#8a97a0" stroke-width="3" stroke-linejoin="round"/><polygon points="0,{-h} {w},0 {w*0.6},{h*0.25} 0,{h*0.1}" fill="#ffffff" opacity=".5"/><path d="M{-w*0.4} {-h*0.2} L0 {-h*0.8}" stroke="#fff" stroke-width="4" opacity=".8" stroke-linecap="round"/></g>'
box='<path d="M96 330 L416 330 L400 440 L112 440Z" fill="url(#cw)" stroke="#4a3418" stroke-width="3"/><path d="M96 330 L416 330" stroke="#a8844c" stroke-width="8"/><path d="M150 330 L158 440 M256 330 L256 440 M362 330 L354 440" stroke="#5a4020" stroke-width="3" opacity=".6"/><path d="M96 330 Q256 300 416 330" fill="#e6ebee" stroke="#8a97a0" stroke-width="3"/>'
icons['nitrate']=head(shadow(256,452,190,18)+box+spike(180,330,-18,150,44)+spike(256,325,0,200,52)+spike(340,330,20,160,46)+spike(220,330,-6,110,34)+spike(300,330,10,120,36),lg('nt','#f7fbfc','#b6c6d0',0,0,1,1)+lg('cw','#a98250','#6a4a26',0,0,0,1))

# ambergris
lump='<path d="M90 330 Q70 230 170 190 Q230 130 320 170 Q420 190 430 290 Q440 380 330 410 Q220 450 130 400 Q90 380 90 330Z" fill="url(#ag)" stroke="#3b3a36" stroke-width="3.5"/><g fill="#d8d4c4" opacity=".55"><circle cx="190" cy="260" r="16"/><circle cx="270" cy="230" r="11"/><circle cx="340" cy="300" r="14"/><circle cx="230" cy="340" r="12"/><circle cx="310" cy="370" r="9"/></g><g stroke="#2a2926" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"><path d="M130 320 Q200 290 250 320 Q300 350 380 320"/><path d="M160 380 Q240 360 300 390"/><path d="M200 200 Q260 220 330 200"/></g><path d="M150 230 Q210 190 280 195" stroke="#fff" stroke-width="7" opacity=".28" fill="none" stroke-linecap="round"/>'
waves='<path d="M60 462 q24 -20 48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0" stroke="#5b9fd0" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>'
icons['ambergris']=head(shadow(256,452,170,16)+lump+waves,rg('ag','#a8a698','#4c4a40'))

# gum arabic
def tear(x,y,s,rot=0):
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M0 -50 Q38 0 32 28 Q22 60 0 60 Q-24 60 -32 28 Q-38 0 0 -50Z" fill="url(#gm)" stroke="#7a4a0a" stroke-width="3"/><path d="M-14 -4 Q-16 20 -6 34" stroke="#fff" stroke-width="6" opacity=".6" fill="none" stroke-linecap="round"/></g>'
twig='<path d="M60 130 Q200 160 330 110 Q400 90 450 120" stroke="#6a4a2a" stroke-width="11" fill="none" stroke-linecap="round"/><g fill="#6a9a3a" stroke="#355a1a" stroke-width="2">'+"".join(f'<ellipse cx="{x}" cy="{y}" rx="26" ry="9" transform="rotate({a} {x} {y})"/>' for x,y,a in [(110,128,-30),(150,166,25),(210,150,-40),(260,158,30),(330,98,-35),(380,122,35),(430,100,-30)])+'</g>'
icons['gum_arabic']=head(shadow()+twig+tear(170,270,1.0,-8)+tear(300,300,1.15,10)+tear(240,380,0.9,-4)+tear(380,390,0.8,16)+tear(120,380,0.7,-14),lg('gm','#ffe08a','#d8861a',0,0,1,1))

for k,v in icons.items(): open(k+'.svg','w').write(v)
print(len(icons))
