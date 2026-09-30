"""Build original western comic-horror manor GLBs. Python stdlib + numpy only.

Downloaded CC0 meshes remain in sources/ with exact licenses and hashes.
The manor, NPC silhouettes and articulated gag props are original geometry.
Coordinates: metres/studs, Y up, front courtyard towards positive Z.
"""
from pathlib import Path
import copy, hashlib, json, math, shutil, struct, tarfile
import numpy as np

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'sources'
for pack in ['graveyard','furniture']:
    if not (SOURCE/pack).exists():
        with tarfile.open(SOURCE/(pack+'.tar.gz')) as archive:
            archive.extractall(SOURCE/pack,filter='data')
OUT = ROOT / 'generated'
OUT.mkdir(parents=True, exist_ok=True)

def read_glb(path):
    raw = path.read_bytes()
    assert raw[:4] == b'glTF' and struct.unpack_from('<I', raw, 4)[0] == 2
    size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+size])
    offset = 20 + size
    return doc, raw[offset+8:] if offset < len(raw) else b''

class Scene:
    def __init__(self):
        self.doc = {'asset': {'version':'2.0','generator':'Jaewoon Midnight Manor'}, 'scene':0,
                    'scenes':[{'nodes':[]}], 'nodes':[], 'meshes':[], 'materials':[],
                    'accessors':[], 'bufferViews':[], 'buffers':[], 'images':[], 'textures':[], 'samplers':[]}
        self.data = bytearray()
        self.palette = {}
        self.cache = {}

    def material(self, name, color):
        if name not in self.palette:
            self.palette[name] = len(self.doc['materials'])
            self.doc['materials'].append({'name':name,'pbrMetallicRoughness':{
                'baseColorFactor':[*color,1], 'metallicFactor': .25 if name == 'brass' else 0,
                'roughnessFactor':.85}, 'doubleSided':True})
        return self.palette[name]

    def array(self, arr, component, kind, target):
        arr=np.asarray(arr,dtype=np.float32 if component==5126 else np.uint32)
        while len(self.data)%4: self.data.append(0)
        view=len(self.doc['bufferViews'])
        self.doc['bufferViews'].append({'buffer':0,'byteOffset':len(self.data),'byteLength':arr.nbytes,'target':target})
        self.data.extend(arr.tobytes())
        acc={'bufferView':view,'componentType':component,'count':len(arr),'type':kind}
        if kind=='VEC3': acc.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
        self.doc['accessors'].append(acc)
        return len(self.doc['accessors'])-1

    def mesh(self, name, verts, faces, material):
        # Flat normals are deliberate; faces are duplicated to keep graphic planes crisp.
        v=[]; n=[]
        for face in faces:
            for k in range(1,len(face)-1):
                tri=np.array([verts[face[0]],verts[face[k]],verts[face[k+1]]],dtype=float)
                normal=np.cross(tri[1]-tri[0],tri[2]-tri[0]); normal/=max(np.linalg.norm(normal),1e-8)
                v.extend(tri);n.extend([normal]*3)
        p=self.array(v,5126,'VEC3',34962);normal=self.array(n,5126,'VEC3',34962)
        self.doc['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':p,'NORMAL':normal},'material':material}]})
        return len(self.doc['meshes'])-1

    def node(self,name,mesh=None,pos=(0,0,0),rot=0,scale=None,parent=None):
        n={'name':name,'translation':list(pos)}
        if mesh is not None:n['mesh']=mesh
        if rot:n['rotation']=[0,math.sin(rot/2),0,math.cos(rot/2)]
        if scale:n['scale']=list(scale)
        self.doc['nodes'].append(n);i=len(self.doc['nodes'])-1
        if parent is None:self.doc['scenes'][0]['nodes'].append(i)
        else:self.doc['nodes'][parent].setdefault('children',[]).append(i)
        return i

    def box(self,name,pos,size,mat,rot=0,parent=None,lean=0):
        x,y,z=[a/2 for a in size]
        v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]
        for p in v:
            if p[1]>0:p[0]+=lean
        f=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2]]
        return self.node(name,self.mesh(name,v,f,mat),pos,rot,parent=parent)

    def lathe(self,name,pos,r0,r1,height,mat,sides=10,parent=None):
        v=[]
        for r,y in [(r0,-height/2),(r1,height/2)]:
            for i in range(sides):
                a=2*math.pi*i/sides;v.append([math.cos(a)*r,y,math.sin(a)*r])
        f=[list(reversed(range(sides))),list(range(sides,sides*2))]
        f += [[i,(i+1)%sides,(i+1)%sides+sides,i+sides] for i in range(sides)]
        return self.node(name,self.mesh(name,v,f,mat),pos,parent=parent)

    def ellipsoid(self,name,pos,size,mat,parent=None):
        sides=10;rings=6;v=[]
        for j in range(rings+1):
            b=math.pi*j/rings
            for i in range(sides):
                a=2*math.pi*i/sides
                v.append([math.sin(b)*math.cos(a)*size[0]/2,math.cos(b)*size[1]/2,math.sin(b)*math.sin(a)*size[2]/2])
        f=[]
        for j in range(rings):
            for i in range(sides):
                a=j*sides+i;b=j*sides+(i+1)%sides
                f.append([a,b,b+sides,a+sides])
        return self.node(name,self.mesh(name,v,f,mat),pos,parent=parent)

    def prop(self,pack,key,name,pos,height,rot=0):
        path=SOURCE/pack/(key+'.glb')
        if path not in self.cache:
            d,b=read_glb(path)
            offsets={k:len(self.doc[k]) for k in ['bufferViews','accessors','materials','meshes','images','textures','samplers']}
            while len(self.data)%4:self.data.append(0)
            start=len(self.data);self.data.extend(b)
            for x in d.get('bufferViews',[]):
                x=copy.deepcopy(x);x['buffer']=0;x['byteOffset']=start+x.get('byteOffset',0);self.doc['bufferViews'].append(x)
            for x in d.get('accessors',[]):
                x=copy.deepcopy(x)
                if 'bufferView' in x:x['bufferView']+=offsets['bufferViews']
                self.doc['accessors'].append(x)
            for x in d.get('images',[]):
                x=copy.deepcopy(x)
                if 'bufferView' in x:x['bufferView']+=offsets['bufferViews']
                if 'uri' in x:
                    raw=(path.parent/x.pop('uri')).read_bytes()
                    while len(self.data)%4:self.data.append(0)
                    x['bufferView']=len(self.doc['bufferViews']);x['mimeType']='image/png'
                    self.doc['bufferViews'].append({'buffer':0,'byteOffset':len(self.data),'byteLength':len(raw)})
                    self.data.extend(raw)
                self.doc['images'].append(x)
            self.doc['samplers'].extend(copy.deepcopy(d.get('samplers',[])))
            for x in d.get('textures',[]):
                x=copy.deepcopy(x)
                if 'source' in x:x['source']+=offsets['images']
                if 'sampler' in x:x['sampler']+=offsets['samplers']
                self.doc['textures'].append(x)
            def remap_tex(o):
                if isinstance(o,dict):
                    for k,v in o.items():
                        if k.endswith('Texture') and isinstance(v,dict):v['index']+=offsets['textures']
                        else:remap_tex(v)
            for x in d.get('materials',[]):
                x=copy.deepcopy(x);remap_tex(x)
                pbr=x.setdefault('pbrMetallicRoughness',{})
                factor=pbr.get('baseColorFactor',[1,1,1,1])
                tint=[.27,.17,.14] if pack=='furniture' else [.43,.46,.45]
                pbr['baseColorFactor']=[factor[i]*tint[i] for i in range(3)]+[factor[3]]
                self.doc['materials'].append(x)
            for x in d.get('meshes',[]):
                x=copy.deepcopy(x)
                for p in x['primitives']:
                    p['attributes']={k:v+offsets['accessors'] for k,v in p['attributes'].items()}
                    if 'indices' in p:p['indices']+=offsets['accessors']
                    if 'material' in p:p['material']+=offsets['materials']
                self.doc['meshes'].append(x)
            def matrix(n):
                if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
                m=np.eye(4);x,y,z,w=n.get('rotation',[0,0,0,1])
                m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]))
                m[:3,3]=n.get('translation',[0,0,0]);return m
            bounds=[]
            def visit(i,m):
                n=d['nodes'][i];m=m@matrix(n)
                if 'mesh' in n:
                    for p in d['meshes'][n['mesh']]['primitives']:
                        a=d['accessors'][p['attributes']['POSITION']]
                        for x in [a['min'][0],a['max'][0]]:
                            for y in [a['min'][1],a['max'][1]]:
                                for z in [a['min'][2],a['max'][2]]:bounds.append((m@np.array([x,y,z,1]))[:3])
                for child in n.get('children',[]):visit(child,m)
            roots=d['scenes'][d.get('scene',0)]['nodes']
            for i in roots:visit(i,np.eye(4))
            bounds=np.array(bounds);lo=bounds.min(axis=0);hi=bounds.max(axis=0)
            self.cache[path]=(d,offsets,roots,lo,hi)
        d,o,roots,lo,hi=self.cache[path]
        s=height/max(hi[1]-lo[1],.001)
        parent=self.node(name,pos=pos,rot=rot,scale=[s]*3)
        center=self.node(name+'_Origin',pos=[-(lo[0]+hi[0])/2,-lo[1],-(lo[2]+hi[2])/2],parent=parent)
        def clone(i,p):
            n=copy.deepcopy(d['nodes'][i]);children=n.pop('children',[]);n.pop('skin',None)
            n['name']=name+'_'+n.get('name',str(i))
            if 'mesh' in n:n['mesh']+=o['meshes']
            index=len(self.doc['nodes']);self.doc['nodes'].append(n);self.doc['nodes'][p].setdefault('children',[]).append(index)
            for c in children:clone(c,index)
        for i in roots:clone(i,center)
        return parent

    def write(self,path):
        while len(self.data)%4:self.data.append(0)
        self.doc['buffers']=[{'byteLength':len(self.data)}]
        data=json.dumps(self.doc,separators=(',',':')).encode();data+=b' '*((-len(data))%4)
        total=12+8+len(data)+8+len(self.data)
        path.write_bytes(struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(data),b'JSON')+data+struct.pack('<I4s',len(self.data),b'BIN\0')+self.data)
        return {'file':path.name,'bytes':total,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'nodes':len(self.doc['nodes']),'meshes':len(self.doc['meshes'])}

def palette(s):
    return {k:s.material(k,v) for k,v in {
      'plum':(.22,.10,.19),'wood':(.15,.08,.08),'stone':(.27,.30,.33),'teal':(.07,.16,.17),
      'roof':(.09,.12,.17),'brass':(.52,.36,.12),'bone':(.68,.72,.57),'ivory':(.77,.70,.49),
      'black':(.028,.025,.035),'amber':(.95,.47,.08),'red':(.40,.065,.08),'glass':(.19,.35,.31)}.items()}

def npc(s,kind,pos):
    c=palette(s);p=s.node(kind,pos=pos)
    wide=kind=='Undertaker';h=10.5 if kind=='Butler' else 6.4 if wide else 8.2
    w=3.7 if wide else 1.65
    for side in [-1,1]:
        s.box(kind+'_Leg'+str(side),(side*w*.25,h*.23,0),(.48,h*.42,.6),c['black'],parent=p)
        s.ellipsoid(kind+'_Shoe'+str(side),(side*w*.25,.45,.65),(.85,.7,2.0),c['black'],parent=p)
    s.lathe(kind+'_Coat',(0,h*.56,0),w*.65,w*.46,h*.34,c['plum'] if wide else c['black'],parent=p)
    s.box(kind+'_Shirt',(0,h*.65,.70),(w*.38,h*.18,.13),c['ivory'],parent=p)
    for side in [-1,1]:
        s.box(kind+'_Arm'+str(side),(side*w*.63,h*.48,0),(.37,h*.38,.42),c['black'],parent=p,lean=side*.5)
        s.ellipsoid(kind+'_Glove'+str(side),(side*w*.66,h*.27,.10),(.65,.85,.5),c['bone'],parent=p)
        for finger in range(4):
            s.lathe(kind+'_Finger'+str(side)+str(finger),(side*w*.66-.23+finger*.15,h*.21,.18),.06,.04,.70,c['bone'],sides=6,parent=p)
    headpos=(0,h*.90,0) if kind!='Archivist' else (3.3,3.3,.25)
    head=s.node(kind+'Head',pos=headpos,parent=p)
    s.ellipsoid(kind+'_Skull',(0,0,0),(w*.67,h*.20,w*.62),c['bone'],parent=head)
    s.ellipsoid(kind+'_Nose',(0,-.02,w*.40),(.36,.65,1.0),c['bone'],parent=head)
    for side in [-1,1]:
        s.ellipsoid(kind+'_Eye'+str(side),(side*.28,.22,w*.29),(.26,.15,.08),c['black'],parent=head)
        s.box(kind+'_Brow'+str(side),(side*.30,.40,w*.30),(.42,.13,.12),c['black'],parent=head,lean=-side*.1)
    s.box(kind+'_Mouth',(0,-h*.047,w*.29),(.7,.065,.1),c['black'],parent=head)
    if wide:
        s.lathe('UndertakerHatBrim',(0,h*.115,0),1.6,1.6,.16,c['black'],parent=head)
        s.lathe('UndertakerHat',(0,h*.23,0),.90,.75,1.4,c['black'],parent=head)
    else:
        s.lathe(kind+'_Neck',(0,h*.77,0),.24,.2,h*.10,c['bone'],parent=p)
        s.box(kind+'_BowTie',(0,h*.72,.76),(.9,.22,.12),c['red'],parent=p)
    return p

def build():
    s=Scene();c=palette(s)
    s.box('Courtyard',(0,-.2,9),(84,.8,68),c['teal'])
    s.box('HallFloor',(0,.1,-23),(59,.5,40),c['wood'])
    # Compact footprint, exaggerated height and crooked silhouette.
    for side in [-1,1]:
        s.box('ManorSideWall'+str(side),(side*29,11,-23),(1.5,22,40),c['plum'],lean=side*1.0)
        s.box('FacadeWing'+str(side),(side*20,12,-3),(24,24,2),c['plum'],lean=side*.7)
        for z in [-37,-23,-9]:
            s.box('WallRib'+str(side)+str(z),(side*28,10,z),(1.5,20,1),c['wood'])
        for x in [side*13,side*25]:
            for y in [7,17]:
                s.box('WindowFrame'+str(x)+str(y),(x,y,-1.8),(6,8,.8),c['wood'])
                s.box('WindowGlass'+str(x)+str(y),(x,y,-1.25),(4.7,6.8,.12),c['amber'])
                s.box('WindowMullion'+str(x)+str(y),(x,y,-1.0),(.28,7,.15),c['black'])
                s.box('WindowCross'+str(x)+str(y),(x,y,-.9),(5,.25,.2),c['black'])
        s.box('EntryPillar'+str(side),(side*8.1,7,-2),(1.6,14,4),c['stone'],lean=-side*.7)
    s.box('BackWall',(0,11,-43),(60,22,1.5),c['plum'])
    s.box('EntryLintel',(0,14,-2),(18,3,4),c['wood'])
    s.box('EntryThreshold',(0,.40,-2),(16,.4,6),c['stone'])
    # Asymmetric roof ridge, using custom six-sided prism rather than a hotel box.
    roof=[[-33,22,-46],[33,22,-46],[33,22,0],[-33,22,0],[-5,39,-46],[-5,36,0]]
    s.node('CrookedRoof',s.mesh('CrookedRoof',roof,[[0,4,1],[3,2,5],[0,3,5,4],[4,5,2,1],[0,1,2,3]],c['roof']))
    s.box('LeaningChimney',(20,34,-30),(5,22,5),c['stone'],lean=3)
    s.box('ChimneyCap',(23,45,-30),(7,1.1,7),c['black'])
    s.lathe('LeftTurret',(-27,24,-35),6,5,22,c['plum'],sides=8)
    s.lathe('LeftTurretRoof',(-28,43,-35),8,0,17,c['roof'],sides=8)
    s.box('Runner',(0,.48,-21),(11,.08,36),c['red'])
    for z in range(3,35,5):s.box('PathStone'+str(z),(math.sin(z)*.4,.35,z),(10,.32,4),c['stone'],rot=math.sin(z)*.06)
    for x in [-35,35]:
        for z in [-28,-8,12,32]:s.prop('graveyard','iron-fence','Fence'+str(x)+str(z),(x,.2,z),5,math.pi/2)
    for x,z,h in [(-36,30,17),(35,28,20),(-39,-14,24),(37,-32,22)]:
        s.box('CrookedTreeTrunk'+str(x),(x,h*.4,z),(1.2,h*.8,1.1),c['wood'],lean=2)
        for i in range(4):
            sign=1 if i%2 else -1
            s.box('BareBranch'+str(x)+str(i),(x+sign*2,h*(.35+i*.12),z),(sign*0+0.65,h*.34,.55),c['wood'],lean=sign*4)
    # Carved trims, imperfect rooflines and pointed arch panels give a western manor silhouette.
    for side in [-1,1]:
        for y in [1,11.5,22.5]:s.box('FacadeCornice'+str(side)+str(y),(side*20,y,-1.35),(25,.6,1.2),c['wood'])
        for x in [side*10,side*19,side*31]:s.box('FacadeTimber'+str(x),(x,11.5,-1.2),(.55,23,.75),c['wood'],lean=side*.55)
        for x in [side*13,side*25]:
            arch=[[-3,0,0],[3,0,0],[2.6,2,0],[0,4,0],[-2.6,2,0]]
            s.node('WindowArch'+str(x),s.mesh('WindowArch',arch,[[0,1,2,3,4]],c['wood']),(x,21,-1.0))
        gable=[[-7,0,-3],[7,0,-3],[1,12,-3],[-7,0,3],[7,0,3],[1,12,3]]
        s.node('Dormer'+str(side),s.mesh('Dormer',gable,[[0,2,1],[3,4,5],[0,3,5,2],[2,5,4,1]],c['roof']),(side*19,25,-10))
        s.box('DormerFace'+str(side),(side*19,29,-6.8),(6,6,.3),c['plum'])
        s.box('DormerLight'+str(side),(side*19,29,-6.5),(2,3,.1),c['amber'])
    for i in range(9):s.box('RoofRib'+str(i),(-32+i*8,22.5,-22),(.25,.6,46),c['black'])
    for side in [-1,1]:
        s.lathe('PorchColumn'+str(side),(side*7,6.5,5),.55,.45,12,c['stone'])
        s.lathe('PorchCapital'+str(side),(side*7,12.5,5),.9,.9,.6,c['brass'])
    s.box('PorchCanopy',(0,13.2,2),(17,1,12),c['roof'])
    for i in range(18):
        x=(-1 if i%2 else 1)*(9+(i*7)%21);z=(i*11)%40
        s.box('LeafCard'+str(i),(x,.24,z),(.5,.015,.9),c['wood'],rot=i*.71)
    for side in [-1,1]:
        s.box('InteriorDado'+str(side),(side*28.1,3,-23),(.3,5,37),c['wood'])
        for z in [-10,-19,-28,-37]:s.box('WallPanel'+str(side)+str(z),(side*27.8,3,z),(.35,4,7),c['teal'])
    s.box('BackDado',(0,3,-42),(56,5,.6),c['wood'])
    for i in range(9):s.box('FloorPlank'+str(i),(-26+i*6,.365,-23),(.06,.02,36),c['black'])
    for i,(x,z) in enumerate([(-22,15),(24,19),(-22,-10),(22,-9)]):s.prop('graveyard','lightpost-single','LampPost'+str(i),(x,0,z),9)
    for i,(x,z) in enumerate([(-21,29),(22,32)]):s.prop('graveyard','bench-damaged','Bench'+str(i),(x,0,z),3,math.pi)
    for i,(x,z) in enumerate([(-30,7),(29,10),(-33,-35),(30,-37)]):s.prop('graveyard','urn-round','Urn'+str(i),(x,.4,z),3)
    for i,(x,z) in enumerate([(-27,22),(28,25),(-29,1),(30,0)]):s.prop('graveyard','rocks','GardenRock'+str(i),(x,0,z),2)
    for i in range(6):
        s.prop('graveyard','candle-multiple','Candle'+str(i),((-1 if i%2 else 1)*23,1.4,-9-(i//2)*12),2.4)
    for i,x in enumerate([-22,-15,15,22]):s.prop('furniture','bookcaseClosed','Bookcase'+str(i),(x,.4,-39),8)
    s.prop('furniture','desk','RecordDesk',(-19,.4,-26),3)
    s.prop('furniture','books','OpenRecords',(-18,3.5,-26),.8)
    s.prop('furniture','coatRackStanding','CoatRack',(23,.4,-18),7)
    s.prop('furniture','chairCushion','MerchantChair',(18,.4,-29),4)
    s.prop('furniture','tableRound','MerchantTable',(21,.4,-25),3)
    s.prop('graveyard','coffin','Coffin',(17,.5,-14),5.5,math.pi/2)
    # Separate lid/hand permit actual collision-driven motion without exploding the scene.
    s.box('CoffinLid',(17,2,-14),(2.8,.25,5.8),c['wood'])
    s.ellipsoid('CoffinHand',(17,1.7,-12),(1.1,.4,1.8),c['bone'])
    s.lathe('ArmorBase',(-16,1,-11),1.6,1.5,1,c['stone'])
    s.lathe('ArmorTorso',(-16,4,-11),1.2,.8,3.4,c['stone'])
    s.ellipsoid('ArmorHelmet',(-16,6.4,-11),(2,2.2,1.8),c['brass'])
    for side in [-1,1]:s.box('ArmorArm'+str(side),(-16+side*1.6,4,-11),(.5,3,.65),c['stone'],lean=-side*.4)
    s.lathe('ChandelierStem',(0,19,-24),.12,.12,5,c['black'])
    s.lathe('ChandelierRing',(0,16.5,-24),3.5,3.5,.35,c['brass'],sides=12)
    for i in range(8):
        a=i*math.pi/4;s.lathe('ChandelierCandle'+str(i),(math.cos(a)*3,17.4,-24+math.sin(a)*3),.15,.12,1.3,c['ivory'])
    # Portraits and stage reward relics; the owner-specific module controls their visibility.
    for i in range(12):
        x=-25+(i%6)*10;z=-41.7;y=9 if i<6 else 16
        s.box('PortraitFrame'+str(i+1),(x,y,z),(5.2,5.8,.5),c['brass'])
        s.box('PortraitCanvas'+str(i+1),(x,y,z+.3),(4.4,5,.1),c['black'])
    npc(s,'Butler',(5,.5,2));npc(s,'Undertaker',(21,.5,-20));npc(s,'Archivist',(-21,.5,-30))
    results=[s.write(OUT/'manor-lobby.glb')]
    for kind in ['Butler','Undertaker','Archivist']:
        p=Scene();npc(p,kind,(0,0,0));results.append(p.write(OUT/(kind.lower()+'.glb')))
    (OUT/'build-evidence.json').write_text(json.dumps({'generator':'build.py','originalHotelAssetsUsed':False,'bounds':{'width':84,'depth':90},'models':results},indent=2)+'\n')
    print(json.dumps(results,indent=2))

if __name__=='__main__':build()
