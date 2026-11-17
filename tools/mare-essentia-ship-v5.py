# 파일명: build.py
# 사용처: Mare Essentia 36척 직접 제작·직접 개선 (외부 모델 복제 없음)
# 임포트
import os, math, json, hashlib, random, zipfile, tempfile, shutil
from pathlib import Path
import numpy as np
import trimesh
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(os.environ.get('MARE_V5_BUILD_DIR',str(Path(tempfile.gettempdir())/'mare-v5-models'))); ROOT.mkdir(parents=True,exist_ok=True)
OLD=json.loads('{"entries":[{"id":"cog","name":"코그선","faction":"europe","stage":1,"targetStuds":{"length":30,"beam":10,"height":21}},{"id":"caravel","name":"캐러벨","faction":"europe","stage":2,"targetStuds":{"length":36,"beam":11,"height":29}},{"id":"carrack","name":"캐랙","faction":"europe","stage":3,"targetStuds":{"length":43,"beam":14,"height":35}},{"id":"galleon","name":"갈레온","faction":"europe","stage":4,"targetStuds":{"length":51,"beam":16.5,"height":40}},{"id":"ship_of_line","name":"전열함","faction":"europe","stage":5,"targetStuds":{"length":54,"beam":17,"height":43}},{"id":"kobaya","name":"고바야","faction":"east_asia","stage":1,"targetStuds":{"length":30,"beam":8.5,"height":14}},{"id":"sekibune","name":"세키부네","faction":"east_asia","stage":2,"targetStuds":{"length":36,"beam":10,"height":19}},{"id":"panokseon","name":"판옥선","faction":"east_asia","stage":3,"targetStuds":{"length":42,"beam":14,"height":25}},{"id":"geobukseon","name":"거북선","faction":"east_asia","stage":4,"targetStuds":{"length":42,"beam":14,"height":21}},{"id":"treasure_ship","name":"명나라 보선","faction":"east_asia","stage":5,"targetStuds":{"length":52,"beam":17,"height":41}},{"id":"bermuda_sloop","name":"버뮤다 슬루프","faction":"new_world","stage":1,"targetStuds":{"length":30,"beam":9.2,"height":25}},{"id":"new_england_ketch","name":"뉴잉글랜드 케치","faction":"new_world","stage":2,"targetStuds":{"length":37,"beam":11.5,"height":28}},{"id":"chesapeake_schooner","name":"체서피크 스쿠너","faction":"new_world","stage":3,"targetStuds":{"length":42,"beam":11.5,"height":34}},{"id":"atlantic_brigantine","name":"아메리카 브리간틴","faction":"new_world","stage":4,"targetStuds":{"length":45,"beam":13,"height":36}},{"id":"manila_galleon","name":"마닐라 갈레온","faction":"new_world","stage":5,"targetStuds":{"length":54,"beam":18,"height":42}},{"id":"zaruk","name":"자루크","faction":"middle_east","stage":1,"targetStuds":{"length":29,"beam":8,"height":17}},{"id":"sambuk","name":"삼부크","faction":"middle_east","stage":2,"targetStuds":{"length":35,"beam":9.5,"height":26}},{"id":"dhow","name":"아라비아 다우선","faction":"middle_east","stage":3,"targetStuds":{"length":40,"beam":12.5,"height":30}},{"id":"baghlah","name":"바글라","faction":"middle_east","stage":4,"targetStuds":{"length":47,"beam":14.5,"height":35}},{"id":"oman_boom","name":"아라비아 붐 상선","faction":"middle_east","stage":5,"targetStuds":{"length":53,"beam":16,"height":40}},{"id":"prau","name":"말레이 프라우","faction":"southeast_asia","stage":1,"targetStuds":{"length":32,"beam":9,"height":20}},{"id":"pattamar","name":"말라바르 쾌속선","faction":"southeast_asia","stage":2,"targetStuds":{"length":37,"beam":10.5,"height":29}},{"id":"coracora","name":"코라코라 전선","faction":"southeast_asia","stage":3,"targetStuds":{"length":41,"beam":13,"height":22}},{"id":"chola_warship","name":"촐라 전함","faction":"southeast_asia","stage":4,"targetStuds":{"length":46,"beam":14,"height":31}},{"id":"javanese_jong","name":"자바 종 대형 교역선","faction":"southeast_asia","stage":5,"targetStuds":{"length":55,"beam":18,"height":43}},{"id":"nile_papyrus","name":"나일 파피루스배","faction":"africa","stage":1,"targetStuds":{"length":27,"beam":8.5,"height":15}},{"id":"pirogue","name":"세네갈 피로그","faction":"africa","stage":2,"targetStuds":{"length":33,"beam":8,"height":15}},{"id":"mtepe","name":"스와힐리 므테페","faction":"africa","stage":3,"targetStuds":{"length":37,"beam":11,"height":26}},{"id":"zanzibar_dhow","name":"잔지바르 다우선","faction":"africa","stage":4,"targetStuds":{"length":44,"beam":13.5,"height":33}},{"id":"zanzibar_jahazi","name":"잔지바르 자하즈","faction":"africa","stage":5,"targetStuds":{"length":52,"beam":16.5,"height":40}},{"id":"mu_voyager","name":"무 대륙 항해선","faction":"lost","stage":1,"targetStuds":{"length":30,"beam":9.5,"height":22}},{"id":"mist_seeker","name":"안개 해도 탐사선","faction":"lost","stage":2,"targetStuds":{"length":38,"beam":11.5,"height":27}},{"id":"lemuria_scout","name":"레무리아 풍향선","faction":"lost","stage":3,"targetStuds":{"length":42,"beam":12.5,"height":35}},{"id":"atlantis_carrier","name":"아틀란티스 탐사 기함","faction":"lost","stage":4,"targetStuds":{"length":50,"beam":16,"height":38}},{"id":"flying_dutchman","name":"플라잉 더치맨","faction":"lost","stage":5,"targetStuds":{"length":46,"beam":14,"height":38}},{"id":"astheria_flagship","name":"아스테리아 해도함","faction":"lost","stage":6,"targetStuds":{"length":56,"beam":17,"height":45}}]}')['entries']
# 메인: 색상 팔레트 (매트 물감 / 광택 금속)
PALETTE={
 'hull':[98,59,36,255], 'hull2':[124,73,43,255], 'darkwood':[62,39,29,255],
 'wood':[162,105,58,255], 'pine':[189,138,81,255], 'pale':[222,181,108,255],
 'deck':[178,124,74,255], 'decklight':[199,150,91,255],
 'seam':[83,55,35,255], 'rope':[110,86,57,255], 'rig':[91,68,48,255],
 'iron':[67,76,81,255], 'black':[31,41,43,255], 'bronze':[168,112,53,255],
 'gold':[223,178,78,255], 'lightgold':[245,211,130,255],
 'sail':[241,220,173,255], 'sail2':[226,193,137,255], 'sailbright':[250,235,200,255],
 'ivory':[241,228,200,255], 'sailshade':[194,169,133,255],
 'red':[146,52,43,255], 'red2':[190,76,51,255], 'vermillion':[179,66,38,255],
 'blue':[56,104,121,255], 'blue2':[85,154,166,255], 'teal':[29,114,126,255],
 'turquoise':[65,171,173,255], 'mint':[122,210,193,255],
 'olive':[80,100,73,255], 'cream':[242,228,183,255],
 'ghost':[97,157,143,255], 'ghostdark':[38,66,72,255],
 'window':[211,173,95,255], 'reed':[179,153,93,255], 'reed2':[208,183,110,255],
 'white':[245,241,224,255], 'silver':[171,187,190,255],
}
STYLES={
 'cog':('cargo','square',1),'caravel':('slim','lateen',3),'carrack':('deep','mixed',3),
 'galleon':('tall','square',3),'ship_of_line':('battleship','square',3),
 'kobaya':('low','oar',1),'sekibune':('war','oar',1),'panokseon':('flat','oar',2),
 'geobukseon':('turtle','oar',1),'treasure_ship':('cargo','junk',4),
 'bermuda_sloop':('slim','gaff',1),'new_england_ketch':('cargo','gaff',2),
 'chesapeake_schooner':('slim','gaff',2),'atlantic_brigantine':('slim','mixed',2),
 'manila_galleon':('tall','square',3),
 'zaruk':('slim','lateen',1),'sambuk':('slim','lateen',2),'dhow':('deep','lateen',2),
 'baghlah':('cargo','lateen',2),'oman_boom':('deep','lateen',2),
 'prau':('outrigger','crab',1),'pattamar':('slim','lateen',2),'coracora':('outrigger','oar',2),
 'chola_warship':('war','mixed',2),'javanese_jong':('cargo','junk',3),
 'nile_papyrus':('reed','oar',1),'pirogue':('slim','oar',1),'mtepe':('slim','lateen',1),
 'zanzibar_dhow':('cargo','lateen',2),'zanzibar_jahazi':('deep','lateen',2),
 'mu_voyager':('slim','junk',2),'mist_seeker':('slim','gaff',2),
 'lemuria_scout':('slim','lateen',3),'atlantis_carrier':('tall','mixed',3),
 'flying_dutchman':('tall','square',3),'astheria_flagship':('deep','mixed',4)
}
EXPECTED_SHIP_HASHES = json.loads('{"cog":{"full":"c4dbed5bbeeb8612431e77dec9c063bf03fc7c1c609936cedc021c3d7e02a03e","mobile":"249df66bc79fd417160fd670cabea7fff513d86a02f705534b8c4ea343103f63"},"caravel":{"full":"0be21269c18d81b7de740acc4fc95d3e541dfaa7d596732a75a369a3cdf8506e","mobile":"c5510c69fb1bd4b5020e1cc268914fab68c69d2d87bf246e836414fecf5425c3"},"carrack":{"full":"54334e879450822c7b329638ecc855db2534810dc4e10e3aa782797d0761985d","mobile":"a43d805a1c4a133c22675e4709f52309fb4466708ca856fdffcdc285775e41ac"},"galleon":{"full":"da8d325f12a68d2f5f7fbb88a63639dda48488e10e00b962bd6b120219b4f1d8","mobile":"b668f6105bd8b348756c3705836416007a05e3987e3321aafe780a4c0987502b"},"ship_of_line":{"full":"5a6f710634421d348e691b4d37060306f0767c77959bade003034c372fe39a10","mobile":"86453f469887360cb8f30b7173a5cb8f9c35a28367f25cdd55365b782dd9f623"},"kobaya":{"full":"5322a127b4d96ab0f0925ff637f344d3442b5cb72780788326e1ae363fd868fc","mobile":"b6253cd72be8f54bb2ffe80848f558d59e0994bf36b76fbd80ba6979addb0627"},"sekibune":{"full":"91cb4da09529ebe128d9e7353f8df1d16f839d277f8e9c11ce13c89ca10947f4","mobile":"d184eeb711edbc27c741a5b964e4a8184ec4bfcaf593b53e80669e28d1d669ed"},"panokseon":{"full":"822626a92b8b2bfce8d8148de1175673fc4171af00cb77f8e1a4c5ebf7d77cb4","mobile":"9964fffb4d0de1fb552c7dc0b6018ce7de5bb9d5d97c206706ac180ce8e4f40e"},"geobukseon":{"full":"a9bf14482f13db3a3c1f4868fb113d38ce1ecba5e8335f8260ce24684542332d","mobile":"b2360a412a50bd3ed38616b11177fd731dfe3f75b735b2a56a608e171fda212f"},"treasure_ship":{"full":"03a2c360a2837fb00eb0b809d8f56b60b524d8e79ab79854b02ee2f5dbfcefc6","mobile":"13604d227705dcc0f8239b7130bf9f5a73854ef71b1ef81cbd72c8b6c8bd14d1"},"bermuda_sloop":{"full":"92b0d474dd61b0b98251ace59f16c611f2a54105d2c11e797897decd42c3c2de","mobile":"5c7b4bebbebdf85c835209e653867ef119b5bc5d678d260a7dfb1e920bc6184c"},"new_england_ketch":{"full":"36e7284e0c56b12f37c7d43544bd7c0413627925d280e1ba5fae65b54833615d","mobile":"9768d327b07e3adfeba580116fc5e70788d2cd956daee03c793e304081ca586b"},"chesapeake_schooner":{"full":"85038905ec043d98b054c47223cc4eb0d4bd785f174fe49475063ce72e3713d1","mobile":"ea2737e4420a5335a3c50edef92543a6608020c5d8b9e6176cf04a2c1c0fe6f1"},"atlantic_brigantine":{"full":"07845aa8fc960990b4b88e41889679f0885b1f97db7db72c281e942adbc11ce3","mobile":"44b29ab07ab6d564f12ad79a3948c9bf79ad9c6ae61cb5d74b25875b04391d2a"},"manila_galleon":{"full":"62efc81d5394e6b9a2839f9edaf101bf4133fc16695141bad507258f068c8be2","mobile":"d346a83b45a014f92adad02404aba72f52de4da3dc7676606a29b68756b8c71d"},"zaruk":{"full":"92098d47f81ae85b4f4f947a5f7126caf3fc4f9b0892985400725e935dbe9af7","mobile":"a374ccccb0d228fe6f7714afb17ab212c4f7641537541947b196cac771d27443"},"sambuk":{"full":"1c15eb50845013439255d572f5e371e8f36bf55dcfe777161900d0b33614dddf","mobile":"5e814e2d6bf853ca2e6e875ba7e1a025fec62e4ec8009cab0bc02c59e26d668c"},"dhow":{"full":"871744c3415f4ce3c9f73bcb399fc190ed1b47823a71c3a35a28d2b7cd72f802","mobile":"4f8c145f3b04efe1281152c872a3ad241a081ede3108ac7a0798dda76dd47d28"},"baghlah":{"full":"61a4873eea0cdf2ceb4f7cd009d91a44c37c3516caadb2f65e61359fb176762f","mobile":"9c676f087262d97f3bb5665c9119c19b1badffc1720d75cdd72218e235839133"},"oman_boom":{"full":"f0780006d5da41936937bdcb7ff84831aa7d178520364a8e7adb31f4dc769ad6","mobile":"dc49a47cf016d366f674fb445c7e48e4537918b1ab1514117c2ce014547bd662"},"prau":{"full":"3492124272462b27c1cbd7b9e4a696044b7f722b1e87920ab1d0e03b1a233a9d","mobile":"1786719da93533c705463b951b72c5f07e00c12862c3b526b4a829bf92057401"},"pattamar":{"full":"d66624b9e7c4e751ba8463c2c21ae5f93d45308f48cf6eb1f636e93b321ff17b","mobile":"2cf60579986ffc4fc3a985a3f95d371210d5933314796b96d01c5044e7b6f19d"},"coracora":{"full":"b09f87da5dffb82626ee8ba226e2016578006a4e69448a39b3fa66cf2ad7154e","mobile":"bded068b2786e2273704e311825a2f028ebf0e45dd52652ae23fd2a141e24599"},"chola_warship":{"full":"d75068012365d16399d1d7cf3cb46b9be209b798f871248a64455128aa615a7c","mobile":"1666878a981f978ac725dbef0bc658895a904d75ffecf62181efa89ec6682f5f"},"javanese_jong":{"full":"ec5790ac96d92bf6cbbb6eb4724bed6005791943bd5bb994bb921c41bae91a17","mobile":"60dca572b796ae0ad49a3bbf9a46b77e885047a4fe14045c88252352d21e29f0"},"nile_papyrus":{"full":"ea10bf2aebe2bce157e000e40e73477d9596bf91454ca0c21bb8bea61af35a9b","mobile":"b84abeb9397eb8d13ec79cf0e20f24e395fe2cfa0388d2799f1a38dad84cb644"},"pirogue":{"full":"1ae96311a9463aa454de8d10ac07fb1e03feefbcfdbdaa275f90207a9751adc1","mobile":"42e0ffaeaaf27304332e5a4003a34f0ad7a4a381241f184a6f87b05e5db10fff"},"mtepe":{"full":"bb59a8ebe0ef55af09357a62869bb54c33e0b0e1094d44346a0c54ee9ba0a191","mobile":"439fd670fe71a964ec8450c92dc7492a27b8dce40b386b68c1397b77532fdea8"},"zanzibar_dhow":{"full":"0d4eece17ff6e8d1dbc033f9558837368e63c6a16ee2f10c299ab1cf604b3213","mobile":"d39f0d081437d103671973639c40628559950480e7f9d6e0b6fbc21e92570121"},"zanzibar_jahazi":{"full":"f3b46f725fed78440d5f88bc650ce512196522a99e7e3630968a595e312918f3","mobile":"a0c598688f87907b509e55902f967649509e1523533fed66a8b90887bc3bdcbd"},"mu_voyager":{"full":"81f38d2fcad21db295b79f30b6e8ac11c5d80ffb97af050c2074620f596386df","mobile":"b22b0ba1d65ef37ea60c225d739d6d32e6e1314902c4f0a6c49d065bb55db94e"},"mist_seeker":{"full":"afa41a254d89de6fe43a1876595d009c10b6c1f32032448b9c62c6c431f3a285","mobile":"c6827bca39bb3d0ac9207683a7916041c652c98f01708dfe51e5093c750a44be"},"lemuria_scout":{"full":"60e3c13c35a9d7ac31a43ba80e731e1035e3d1ac466fa6e04b5e3dcd7e25d276","mobile":"1a6619f9a15ab9e119a10fcebae0f4cd265f0bcdd9808fd6ddebb9b3d6f8bdd4"},"atlantis_carrier":{"full":"86d59b6169c971c2ced5b092d0d335fe73536983e73bc9f0a4fb2638566249e4","mobile":"94e67d8fff8c6918c3f5aca84e8ea252f90fb2d5853e7e43247fefc905c0dfbd"},"flying_dutchman":{"full":"87b0110ae0941e3562cbd65baf0b37c63c853fdcc78669ef6f62afc331c51f81","mobile":"78816be8667fc89bfb96782a4ddfb1535419bb406e231ad241b2a53120142a65"},"astheria_flagship":{"full":"f44b572ad222e11e9319f327c9d477413bed0383d889a09d28f4911060d2901b","mobile":"d8ac56a42ba30266d883ec866302f1450d101410220380695a96b9f9b1f7efce"}}')
class Builder:
 def __init__(self,entry):
  self.e=entry;self.id=entry['id'];t=entry['targetStuds']; self.L=float(t['length']);self.B=float(t['beam']);self.H=float(t['height']);self.deck_y=self.B*.11;self.parts={};self.role='hull';self.mobile=False;self.rng=random.Random(self.id)
  self.form,self.rigtype,self.mast_count=STYLES[self.id]
  self.faction=entry['faction']; self.special=self.id in ('astheria_flagship','atlantis_carrier','mu_voyager','mist_seeker','lemuria_scout','flying_dutchman')
  self.mat_override={}
  if self.faction=='east_asia': self.mat_override={'hull':'darkwood','hull2':'hull','gold':'bronze'}
  if self.faction=='lost':self.mat_override={'hull':'ghostdark' if self.id=='flying_dutchman' else 'blue','hull2':'teal','wood':'hull2','deck':'wood','seam':'ghostdark'}
  if self.faction=='middle_east':self.mat_override={'hull':'hull2','hull2':'pine'}
  if self.id=='nile_papyrus':self.mat_override={'hull':'reed','hull2':'reed2','deck':'reed2'}
  if self.id=='ship_of_line':self.mat_override={'hull':'black','hull2':'hull','wood':'darkwood','deck':'decklight'}
  if self.id=='manila_galleon':self.mat_override={'hull':'red','hull2':'hull2'}
  if self.id=='treasure_ship':self.mat_override={'hull':'darkwood','hull2':'red','gold':'bronze'}
  if self.id=='javanese_jong':self.mat_override={'hull':'darkwood','hull2':'wood'}
 def material(self,c): return self.mat_override.get(c,c)
 def add(self,v,f,mat,role=None):
  v=np.asarray(v,dtype=np.float32).reshape(-1,3);f=np.asarray(f,dtype=np.int32).reshape(-1,3)
  if len(v)==0 or len(f)==0:return
  if not np.isfinite(v).all():raise ValueError('NAN:'+self.id)
  if f.max()>=len(v) or f.min()<0:raise ValueError('INDEX:'+self.id)
  key=(role or self.role,self.material(mat));pack=self.parts.setdefault(key,[]);pack.append((v,f))
 def shape(self,mesh,mat):self.add(mesh.vertices,mesh.faces,mat)
 def box(self,x,y,z,dx,dy,dz,mat):
  if min(dx,dy,dz)<=0:return
  self.shape(trimesh.creation.box(extents=[dx,dy,dz],transform=trimesh.transformations.translation_matrix([x,y,z])),mat)
 def beam(self,a,b,r,mat,sections=8,r2=None):
  aa=np.asarray(a,dtype=float);bb=np.asarray(b,dtype=float);d=bb-aa;length=np.linalg.norm(d)
  if length<1e-5:return
  sections=min(sections,5) if self.mobile else sections
  w=d/length;u=np.cross(w,[0,0,1] if abs(w[2])<0.9 else [0,1,0]);u/=np.linalg.norm(u);v=np.cross(w,u);
  verts=[];rr=(r if r2 is None else r2)
  for pos,radius in ((aa,r),(bb,rr)):
   for k in range(sections):
    ang=math.tau*k/sections; verts.append(pos+radius*(math.cos(ang)*u+math.sin(ang)*v))
  faces=[]
  for k in range(sections):
   m=(k+1)%sections;faces.extend(((k,m,sections+k),(m,sections+m,sections+k)))
  faces.extend(tuple((0,k+1,k) for k in range(1,sections-1)))
  faces.extend(tuple((sections,sections+k,sections+k+1) for k in range(1,sections-1)))
  self.add(verts,faces,mat)
 def path(self,pts,r,mat,sections=6):
  for a,b in zip(pts[:-1],pts[1:]):self.beam(a,b,r,mat,sections)
 def sphere(self,p,scale,mat,subdiv=1):
  m=trimesh.creation.icosphere(subdivisions=0 if self.mobile else subdiv,radius=1);m.apply_scale(scale);m.apply_translation(p);self.shape(m,mat)
 def panel(self,corners,mat):
  a,b,c,d=corners;self.add([a,b,c,d],[(0,1,2),(0,2,3),(2,1,0),(3,2,0)],mat)
 def arch(self,x,y,z,dx,dy,dz,mat,segments=13):
  # 반원형 장식: 선수·선미 궁륭
  for i in range(segments):
   t=i/segments;u=(i+1)/segments
   p=[x+dx*math.cos(math.pi*t),y+dy*math.sin(math.pi*t),z+dz*t]
   q=[x+dx*math.cos(math.pi*u),y+dy*math.sin(math.pi*u),z+dz*u]
   self.beam(p,q,self.B*.013,mat,6)
 def width(self,q):
  # q=-1(선미), +1(선수)
  if q < -.82:return (.52+(.82+q)*1.3)
  center=1-((q+.12)/1.23)**2
  bulge=max(.035,center)**.55
  if q>0.67:bulge*=max(.18,1-(q-.67)*1.75)
  if self.form in ('flat','turtle','war','low','outrigger'):bulge=.68*bulge+.12
  if self.form in ('slim','reed'):bulge*=.78
  if self.form in ('deep','cargo','battleship'):bulge*=1.06
  return max(.13,bulge)
 def hull_cross(self,q,level):
  # level=0~5: 용골부터 뱃전
  # 함종별 실제 횡단면: 평저 노전·좁은 쾌속선·깊은 원양선이 같은 선체가 되지 않도록 분리.
  ys=[-self.B*.40,-self.B*.34,-self.B*.24,-self.B*.13,self.B*.035,self.deck_y]
  widths=[.085,.46,.80,.94,1.00,.97]
  if self.form in ('flat','turtle','war'):
   ys=[-self.B*.27,-self.B*.265,-self.B*.24,-self.B*.14,self.B*.034,self.deck_y]
   widths=[.40,.72,.88,.98,1.0,.98]
  elif self.form in ('slim','low','outrigger'):
   ys=[-self.B*.28,-self.B*.275,-self.B*.24,-self.B*.12,self.B*.025,self.deck_y]
   widths=[.035,.24,.59,.84,1.0,.94]
  elif self.form in ('deep','tall','battleship'):
   ys=[-self.B*.50,-self.B*.46,-self.B*.32,-self.B*.18,self.B*.025,self.deck_y]
   widths=[.06,.37,.73,.93,1.0,1.0]
  elif self.form=='reed':
   ys=[-self.B*.145,-self.B*.14,-self.B*.12,-self.B*.08,self.B*.03,self.deck_y]
   widths=[.20,.36,.65,.82,1.0,1.0]
  stem_up=math.pow(abs(q),5)*self.B*.055
  return (q*self.L*.48,ys[level]+stem_up,self.B*.5*self.width(q)*widths[level])
 def hull(self):
  N=36 if self.mobile else 56;Q=np.linspace(-1,1,N+1)
  for row in range(5):
   v=[];f=[]
   for q in Q:
    for s in (-1,1):
     for i in (row,row+1):
      x,y,z=self.hull_cross(q,i);v.append((x,y,s*z))
   for k in range(N):
    a=4*k;b=a+4
    for side in (0,2):
     f.extend([(a+side,b+side,b+side+1),(a+side,b+side+1,a+side+1)])
   material=['darkwood','hull','hull2','hull','hull2'][row]
   self.add(v,f,material)
  # 유선형 선수/선미 실제 3D 닫힌 면
  for end in (-1,1):
   v=[]
   for s in (-1,1):
    for lev in range(6):v.append(self.hull_cross(end,lev)[:2]+(s*self.hull_cross(end,lev)[2],))
   self.add(v,[(i,i+1,6+i) for i in range(5)]+[(i+1,7+i,6+i) for i in range(5)],'darkwood')
  # [선체 외판] 함종별 선수 곡선을 따라 실제 외판 접합선·리벳·세로 뼈대를 더한다.
  # 입체 선체 위에 배치하므로 단순히 선체 색을 바꾼 장식이 아니다.
  for side in (-1,1):
   # 서로 다른 외판 층의 수직 위치로 선재를 분리해 나무 결구를 드러낸다.
   for lev in (1,2,3,4):
    for alpha in (.22,.64):
     line=[]
     for q in np.linspace(-.89,.90,36):
      a=np.array(self.hull_cross(float(q),lev));b=np.array(self.hull_cross(float(q),lev+1))
      c=a*(1-alpha)+b*alpha
      # 선체 곡률을 따른 가는 압착 판재 이음선. 물체 밖으로 살짝 밀어 낸다.
      c[2]=(abs(c[2])+self.B*.007)*side
      line.append(c.tolist())
     self.path(line,self.B*.0038,'seam',5)
   # 관찰 가능한 금속 못은 상부 판재에만 간격을 두고 설치한다.
   for q in np.linspace(-.79,.76,17):
    x,y,z=self.hull_cross(float(q),4)
    self.sphere([x,y-self.B*.012,side*(z+self.B*.018)],
                [self.B*.010,self.B*.010,self.B*.006],
                'bronze' if self.faction in ('europe','new_world','lost') else 'iron',1)
  # 뱃전 구조와 목재 층(평면으로 보이는 반복 줄 삭제)
  for s in (-1,1):
   for lev,mat,r in [(2,'seam',.014),(3,'wood',.022),(4,'gold' if self.special else 'pale',.024),(5,'wood',.045)]:
    pts=[]
    for q in Q:
     x,y,z=self.hull_cross(q,lev);pts.append((x,y+(.03 if lev==5 else 0),s*z))
    self.path(pts,r*self.B,mat,6)
   for q in np.linspace(-.86,.82,27):
    a=self.hull_cross(q,2);b=self.hull_cross(q,5)
    self.beam([a[0],a[1],s*a[2]*1.025],[b[0],b[1],s*b[2]*1.03],self.B*.013,'darkwood',6)
   # 넓은 상단 이중 뱃전과 난간
   self.path([(self.hull_cross(q,5)[0],self.hull_cross(q,5)[1]+self.B*.045,s*self.hull_cross(q,5)[2]) for q in Q],self.B*.025,'pale')
  # 강하게 올라간 선수 용골과 앵커
  self.beam([self.L*.44,-self.B*.2,0],[self.L*.51,self.deck_y+self.B*.30,0],self.B*.075,'wood',10)
  self.beam([-self.L*.47,-self.B*.25,0],[-self.L*.49,self.deck_y+.16*self.B,0],self.B*.07,'wood',10)
  if self.form not in ('reed','low','turtle','outrigger'):
   self.beam([self.L*.41,self.deck_y+self.B*.12,0],[self.L*.60,self.deck_y+self.B*.2,0],self.B*.04,'wood',10)
  # 갑판 상면 실제 나무 표면. 측면에서 외판과 구분
  for k in range(N):
   a=Q[k];b=Q[k+1];wa=self.B*.49*self.width(a);wb=self.B*.49*self.width(b)
   y=self.deck_y+self.B*.006
   col='decklight' if k%6 in (0,1) else 'deck'
   self.panel([[a*self.L*.48,y,-wa],[b*self.L*.48,y,-wb],[b*self.L*.48,y,wb],[a*self.L*.48,y,wa]],col)
  # 가로 갑판 쪽나무·못(조밀하지만 시각적으로 과하지 않게)
  for s in (-1,1):
   for q in np.linspace(-.76,.72,20):
    z=s*self.B*.41*self.width(q)
    self.beam([q*self.L*.48,self.deck_y+.02*self.B,0],[q*self.L*.48,self.deck_y+.02*self.B,z],self.B*.007,'seam',5)
  # 바깥 선체 가로 포인트 금장
  if self.faction in ('europe','lost','new_world'):
   for s in (-1,1):
    pts=[]
    for q in Q:
     x,y,z=self.hull_cross(q,4);pts.append([x,y-s*.005,s*(z+.02*self.B)])
    self.path(pts,self.B*.017,'gold' if self.faction=='lost' else 'bronze')
  if self.form=='reed':self.reed_hull()
 def reed_hull(self):
  for n in range(15):
   z=(n-7)*self.B*.065
   amp=(1-abs(z)/(self.B*.6))
   self.path([(q*self.L*.44,self.deck_y-.07*self.B-(1-q*q)*.16*self.B,z*amp) for q in np.linspace(-1,1,20)],self.B*.035,'reed2' if n%3 else 'reed',7)
  for tip in (-1,1):
   self.path([(tip*self.L*(.32+k*.02),self.deck_y+self.B*(.06+.03*k*k),0) for k in range(9)],self.B*.05,'reed2',9)
 def railings(self):
  if self.form in ('reed','turtle'):return
  for side in (-1,1):
   loc=np.linspace(-.86,.87,22)
   for q in loc:
    x,y,z=self.hull_cross(q,5)
    top=y+self.B*(.17 if self.form in ('war','flat','battleship') else .12)
    self.beam([x,y,side*z],[x,top,side*z],self.B*.016,'wood',6)
   for lift in (.09,.17 if self.form in ('war','flat','battleship') else .12):
    self.path([[self.hull_cross(q,5)[0],self.hull_cross(q,5)[1]+lift*self.B,side*self.hull_cross(q,5)[2]] for q in loc],self.B*.019,'wood',6)
 def gundeck(self):
  if self.form in ('reed','outrigger','slim','low') and self.id not in ('caravel','bermuda_sloop','atlantic_brigantine'):return
  counts={ 'ship_of_line':10,'galleon':9,'manila_galleon':7,'flying_dutchman':7,
   'atlantis_carrier':9,'astheria_flagship':9,'panokseon':6,'geobukseon':5,'chola_warship':5,'treasure_ship':2}
  n=counts.get(self.id,4 if self.form in ('deep','cargo','war') else 2)
  tiers=3 if self.id=='ship_of_line' else 2 if self.id in ('galleon','flying_dutchman','manila_galleon') else 1
  for side in (-1,1):
   for level in range(tiers):
    for q in np.linspace(-.70,.68,n):
     x,y,z=self.hull_cross(float(q),4)
     y=self.deck_y-self.B*(.13+level*.095)
     z=side*self.B*.51*self.width(float(q))*.99
     width=self.B*.060
     self.box(x,y,z+side*self.B*.016,width*1.1,width*.75,self.B*.035,'black')
     for dy in (-width*.43,width*.43):
      self.box(x,y+dy,z+side*self.B*.030,width*1.25,self.B*.010,self.B*.031,'bronze')
     self.beam([x,y,z+side*.015*self.B],[x,y,z+side*.067*self.B],self.B*.014,'iron',8)
 def superstructure(self):
  L,B,dy=self.L,self.B,self.deck_y
  if self.form in ('slim','reed','low','outrigger'):return
  height={'cargo':.26,'deep':.34,'tall':.55,'battleship':.46,'war':.18,'flat':.21,'turtle':.14}.get(self.form,.22)*B
  if self.faction in ('middle_east','africa') and self.form in ('cargo','deep','tall') and self.id not in ('nile_papyrus',):
   # 중동·동아프리카 전통 다우선에는 유럽식 2층 선미 성채 대신 개방형 조타 정자
   aft=-L*.32
   self.box(aft,dy+B*.095,0,L*.25,B*.14,B*.56,'decklight')
   for xx in (aft-L*.105,aft+L*.105):
    for side in (-1,1):
     self.beam([xx,dy+B*.12,side*B*.25],[xx,dy+B*.47,side*B*.25],B*.025,'wood',9)
   self.box(aft,dy+B*.50,0,L*.30,B*.035,B*.63,'darkwood')
   for side in (-1,1):
    self.path([[aft-L*.15,dy+B*.51,side*B*.31],[aft,dy+B*.61,side*B*.32],[aft+L*.15,dy+B*.51,side*B*.31]],B*.018,'gold',8)
   for q in np.linspace(-.8,.8,5):
    x=aft+q*L*.135
    self.beam([x,dy+B*.48,-B*.32],[x,dy+B*.48,B*.32],B*.017,'pale',7)
   return
  if self.form=='turtle':
   # 거북선 특유 철갑 등껍질, 금속 지붕과 비늘, 용두
   X=np.linspace(-.39*L,.35*L,23);Z=np.linspace(-B*.40,B*.40,17);v=[];f=[]
   for xx in X:
    for zz in Z:
     y=dy+B*.065+B*.27*(1-(zz/(.49*B))**2)**.70
     v.append([xx,y,zz])
   for ix in range(len(X)-1):
    for iz in range(len(Z)-1):
     a=ix*len(Z)+iz;b=a+len(Z);f.extend([(a,a+1,b),(a+1,b+1,b)])
   self.add(v,f,'olive')
   # 육각 철갑을 포개놓은 등판 비늘; 중앙 융기 곡률에 따라 각 타일을 직접 배치
   for xx in np.linspace(-.36*L,.31*L,16):
    for zz in np.linspace(-B*.31,B*.31,9):
     rr=zz/(.49*B);yy=dy+B*.082+B*.27*(1-rr*rr)**.70
     self.box(xx,yy,zz,L*.038,B*.012,B*.064,'olive' if (int((xx+L)*20/L)+int((zz+B)*10/B))%4 else 'bronze')
   self.path([[xx,dy+B*.37,0] for xx in np.linspace(-.37*L,.33*L,26)],B*.023,'gold',7)
   for xx in X[::2]:
    for zz in Z[2:-2:2]:
     yy=dy+B*.09+B*.27*(1-(zz/(.49*B))**2)**.70
     self.beam([xx,yy,zz],[xx,yy+B*.045,zz],B*.012,'iron',6)
   self.beam([L*.39,dy+B*.24,0],[L*.52,dy+B*.29,0],B*.095,'red',12)
   self.sphere([L*.52,dy+B*.31,0],[B*.11,B*.075,B*.10],'gold',2)
   for side in (-1,1):
    self.beam([L*.49,dy+B*.35,side*B*.07],[L*.47,dy+B*.47,side*B*.08],B*.025,'gold')
   for s in (-1,1):self.sphere([L*.55,dy+B*.32,s*B*.06],[B*.02,B*.02,B*.025],'black',1)
   return
  # 동아시아 전선은 격자형 이중 선루, 유럽은 폭넓은 선미 성채
  sx=-L*.32;sz=B*.36
  self.box(sx,dy+height*.45,0,L*.25,height,B*.68,'hull2')
  # 선미 선실 바깥을 좁히는 사선 페인트 판재와 갑판 발코니
  self.box(sx,dy+height*.91,0,L*.29,B*.055,B*.76,'decklight')
  for side in (-1,1):
   self.path([[-L*.45,dy+height*.98,side*B*.40],[-L*.42,dy+height*1.11,side*B*.40],[-L*.19,dy+height*1.11,side*B*.40],[-L*.18,dy+height*.98,side*B*.40]],B*.017,'gold',7)
   for n in range(7):
    px=-L*.43+n*L*.038
    self.beam([px,dy+height*.95,side*B*.39],[px,dy+height*1.10,side*B*.39],B*.014,'wood',6)
  self.box(sx,dy+height*1.12,0,L*.28,B*.035,B*.78,'darkwood')
  for side in (-1,1):
   for level in range(2 if height>B*.33 else 1):
    yy=dy+height*(.20+level*.43)
    for i in range(5):
     xx=-L*.42+i*L*.05
     self.box(xx,yy,side*B*.348,L*.028,B*.095,B*.014,'darkwood')
     self.box(xx,yy,side*B*.367,L*.019,B*.065,B*.016,'window' if self.faction!='lost' else 'turquoise')
     self.beam([xx,yy-B*.05,side*B*.381],[xx,yy+B*.05,side*B*.381],B*.012,'gold',6)
  for side in (-1,1):
   self.path([[(-.48+i*.012)*L,dy+height+B*.045,side*B*.39] for i in range(18)],B*.018,'gold',7)
  if self.form in ('tall','battleship'):
   # 선수루
   self.box(L*.33,dy+height*.39,0,L*.20,height*.65,B*.48,'hull2')
   self.box(L*.33,dy+height*.72,0,L*.22,B*.05,B*.53,'deck')
  if self.form=='flat':
   # 판옥선: 2층 화포갑판과 판자 방호벽
   self.box(0,dy+B*.24,0,L*.55,B*.055,B*.74,'decklight')
   for side in (-1,1):
    for q in np.linspace(-.31,.29,15):
     self.box(q*L,dy+B*.35,side*B*.38,L*.018,B*.18,B*.035,'wood')
 def fittings(self):
  L,B,d=self.L,self.B,self.deck_y
  # 화물 선창과 테두리
  for q in (-.05,.16):
   w=B*.29
   self.box(q*L,d+B*.015,0,L*.095,B*.04,B*.44,'darkwood')
   self.box(q*L,d+B*.043,0,L*.077,B*.022,B*.37,'wood')
   for k in range(5):self.box(q*L-L*.032+k*L*.016,d+B*.06,0,L*.006,B*.012,B*.34,'seam')
  # [갑판 직접 제작] 볼라드와 선박용 로프 감개, 래쉬드 화물 받침.
  # 갑판 위에서 보이는 실제 입체 장비이며 전투/화물 수치는 건드리지 않는다.
  if self.form not in ('reed','low','outrigger'):
   for q in (-.35,.34):
    for side in (-1,1):
     zz=side*B*.32*self.width(float(q)*2)
     xx=q*L
     self.beam([xx,d,zz],[xx,d+B*.11,zz],B*.028,'darkwood',8)
     self.beam([xx-B*.07,d+B*.11,zz],[xx+B*.07,d+B*.11,zz],B*.023,'wood',8)
   for xx in (-L*.075,L*.17):
    for side in (-1,1):
     zz=side*B*.22
     for rr in (B*.12,B*.10,B*.075):
      pts=[[xx+rr*math.cos(t),d+B*.063+B*.005*math.sin(t*3),zz+rr*math.sin(t)] for t in np.linspace(0,math.tau,25)]
      self.path(pts,B*.010,'rope',6)
  # 도르래식 닻 권양기 캡스턴
  x=L*.26;self.beam([x,d,0],[x,d+B*.25,0],B*.072,'darkwood',12)
  for a in range(6):
   th=a*math.tau/6
   self.beam([x,d+B*.20,0],[x+B*.23*math.cos(th),d+B*.20,B*.23*math.sin(th)],B*.027,'wood')
  # 닻 고리/사슬
  for side in (-1,1):
   x=L*.36;z=side*B*.39
   self.beam([x,d+B*.02,z],[x+L*.04,d-B*.22,z+side*B*.04],B*.022,'iron',8)
   self.beam([x+L*.025,d-B*.21,z+side*B*.04],[x+L*.08,d-B*.23,z+side*B*.07],B*.05,'iron',8)
  # 배꼬리 랜턴과 깃발은 시대별 색 다르게
  for side in (-1,1):
   if self.form in ('turtle','low','outrigger','reed') and self.faction!='lost':continue
   x=-L*.44;z=side*B*.33
   self.beam([x,d+B*.08,z],[x,d+B*.56,z],B*.019,'iron')
   self.sphere([x,d+B*.49,z],[B*.075,B*.105,B*.075],'window' if self.id!='flying_dutchman' else 'ghost',2)
   self.beam([x,d+B*.59,z],[x,d+B*.64,z],B*.026,'gold')
  # 선수상: 끝에 오목 곡선 + 머리 장식
  if self.form not in ('reed','low','turtle','outrigger'):
   self.path([[L*(.41+i*.015),d+B*(.12+.06*i/5),0] for i in range(8)],B*.032,'gold',8)
   self.sphere([L*.51,d+B*.22,0],[B*.07,B*.065,B*.07],'gold',2)
 def portholes(self):
  # 고급 창문과 명판/페인트 띠
  if self.id in ('flying_dutchman','atlantis_carrier','astheria_flagship','galleon','ship_of_line','carrack','manila_galleon'):
   for side in (-1,1):
    for q in np.linspace(-.44,.32,8):
     x,y,z=self.hull_cross(float(q),4);z=side*z*1.02
     self.sphere([x,y-self.B*.10,z],[self.B*.055,self.B*.055,self.B*.012],'gold' if self.id!='flying_dutchman' else 'silver',1)
 def oars(self):
  if self.rigtype!='oar' and self.form!='outrigger' and self.id not in ('chola_warship','prau'):return
  n=8 if self.id in ('sekibune','geobukseon') else 7 if self.id=='panokseon' else 6 if self.id!='nile_papyrus' else 4
  for s in (-1,1):
   for q in np.linspace(-.73,.72,n):
    x=q*self.L*.43;y=self.deck_y-self.B*.04;z=s*self.B*.46*self.width(float(q))
    self.beam([x,y,z],[x-self.L*.018,y-self.B*.29,z+s*self.B*.49],self.B*.017,'wood')
    endz=z+s*self.B*.49
    self.box(x-self.L*.018,y-self.B*.29,endz+self.B*.025*s,self.L*.045,self.B*.025,self.B*.14,'darkwood')
  if self.form=='outrigger':
   for s in (-1,1):
    z=s*self.B*.92
    self.beam([-self.L*.42,-self.B*.18,z],[self.L*.38,-self.B*.18,z],self.B*.078,'wood',12)
    for q in (-.24,.05,.30):
     self.beam([q*self.L,self.deck_y-.02*self.B,s*self.B*.37],[q*self.L,-self.B*.18,z],self.B*.04,'pale')
 def flags(self):
  # 역사지리별 식별 가능한 실크 표식
  L,B,D=self.L,self.B,self.deck_y
  y=D+self.H*.79
  x=-L*.47
  self.beam([x,D+B*.12,0],[x,y,0],B*.018,'wood',8)
  col={'europe':'red','east_asia':'red','new_world':'blue','middle_east':'olive','southeast_asia':'vermillion','africa':'pale','lost':'turquoise'}.get(self.faction,'red')
  if self.id=='flying_dutchman':col='ghost'
  self.panel([[x,y,0],[x+L*.096,y-B*.045,0],[x+L*.018,y-B*.10,0],[x,y-B*.09,0]],col)
  self.beam([x,y,0],[x+L*.10,y-B*.043,0],B*.008,'gold')
 def mast(self,x, top):
  # 돛대: 대형 횡범선만 망루/줄사다리 사용. 연안선·정크·다우에 유럽식 망루를 복제하지 않는다.
  B,D=self.B,self.deck_y
  base=[x,D-B*.015,0];end=[x-B*.025,D+top,0]
  heavy=self.form in ('deep','cargo','tall','battleship') and self.faction in ('europe','new_world','lost')
  self.beam(base,end,B*.067 if heavy else B*.043,'darkwood',12,r2=B*.025 if heavy else B*.017)
  for h in (.26,.55,.82):
   pos=[x-B*.025*h,D+top*h,0]
   self.beam([pos[0]-B*.014,pos[1],0],[pos[0]+B*.014,pos[1],0],B*.061 if heavy else B*.050,'bronze',10)
  if heavy:
   # 까마귀 둥지와 선측 슈라우드: 2~4돛대 원양 범선의 입체 장비.
   y=D+top*.63
   self.box(x,y,0,B*.36,B*.045,B*.44,'darkwood')
   for side in (-1,1):
    for xx in (x-B*.17,x+B*.17):
     self.beam([xx,y,side*B*.21],[xx,y+B*.17,side*B*.21],B*.023,'wood')
   for side in (-1,1):
    anchors=[]
    for ax in (-1,1):
     q=(x+ax*self.L*.095)*2/self.L
     anchor=np.array([x+ax*self.L*.095,D-B*.01,side*self.B*.43*self.width(float(q))])
     anchors.append(anchor)
     self.beam([x-B*.017,D+top*.72,0],anchor,B*.007,'rope',6)
    crown=np.array([x-B*.017,D+top*.72,0.]);left,right=anchors
    for step in range(2,11):
     t=step/12
     a=left*(1-t)+crown*t;b=right*(1-t)+crown*t
     self.beam(a,b,B*.0048,'rig',5)
  else:
   # 지역 범선: 유럽식 감시 망루 대신 좌우 고정삭과 앞뒤 지지삭.
   for side in (-1,1):
    q=x*2/self.L;outer=side*self.B*.40*self.width(float(q))
    self.beam([x-B*.020,D+top*.86,0],[x-self.L*.07,D-B*.01,outer],B*.006,'rope',5)
   self.beam([x,D+top*.84,0],[min(self.L*.44,x+self.L*.18),D+B*.05,0],B*.006,'rig',5)
  # 도르래 블록은 원양선·연안선 모두 별도 구조로 사용.
  for ratio in (.48,.78):
   px=x-B*.025*ratio;yy=D+top*ratio
   for side in (-1,1):
    self.sphere([px,yy,side*B*.070],[B*.031,B*.058,B*.035],'darkwood',1)
 def square_sail(self,x,y_top,y_bottom,span,sailmat='sail',torn=False,accent=False):
  # 3D 볼록한 천: 격자 생성 대신 세로 패널과 자연스런 곡면 봉합
  NX,NY=(14,8) if self.mobile else (22,12);v=[];f=[]; L,B=self.L,self.B
  shrink=.18
  for j in range(NY+1):
   vj=j/NY; yy=y_bottom+(y_top-y_bottom)*vj
   halfspan=span*.5*(1-shrink*(1-vj))
   for i in range(NX+1):
    u=i/NX;zz=(u*2-1)*halfspan
    yy2=yy-(1-vj)*B*.03*math.cos(math.pi*(u-.5)*2)
    xx=x+B*(.26*math.sin(math.pi*u)*math.sin(math.pi*vj)+.07*math.sin(u*math.pi*4+vj*6))* (1 if (int(x*10)%2) else -1)
    if torn and vj<.25 and (i%5 in (0,1)):yy2+=(.25-vj)*B*.35
    v.append([xx,yy2,zz])
  for j in range(NY):
   for i in range(NX):
    a=j*(NX+1)+i;b=a+NX+1;f.extend(((a,b,a+1),(a+1,b,b+1)))
  self.add(v,f,sailmat,'sails')
  # 크고 둥근 통나무 야드, 강풍으로 부푼 조선식 범포면선
  self.beam([x,y_top,-span*.54],[x,y_top,span*.54],B*.026,'wood',10)
  self.beam([x,y_bottom,-span*.38],[x,y_bottom,span*.38],B*.012,'rope',6)
  # 실측 천 표면의 격자 정점에 봉합선을 직접 부착. 공중에 뜨던 직선 줄 제거.
  for i in ([3,6,9,12] if self.mobile else [3,6,9,12,15,18]):
   self.path([np.array(v[j*(NX+1)+i])+[B*.004,0,0] for j in range(1,NY)],B*.004,'sailshade',4)
  # 폭풍 대비 리프 밧줄: 불필요한 원형 장식 대신 천의 곡면을 따라서 매듭 배치.
  for j in ((3,6) if self.mobile else (4,7)):
   self.path([np.array(v[j*(NX+1)+i])+[B*.007,0,0] for i in range(1,NX)],B*.006,'sailshade',4)
   for i in ((3,6,9,12) if self.mobile else (4,8,12,16,20)):
    p=np.array(v[j*(NX+1)+i]);p[0]+=B*.009
    self.beam(p,p+[B*.02,-B*.07,0],B*.0045,'rope',5)
  for s in (-1,1):
   self.beam([x,y_top,s*span*.54],[x,self.deck_y,s*min(self.B*.43,span*.52)],B*.006,'rope',5)
  if accent:
   # 미세한 천 중앙의 선명한 가문 문양(비보호 추상문양)
   self.sphere([x+B*.01,(y_top+y_bottom)*.5,0],[B*.018,(y_top-y_bottom)*.12,span*.105],'red' if self.faction=='europe' else 'gold',2)
 def triangular_sail(self,x,mheight,span,mat='sail',reverse=False,crab=False):
  # 세로 방향 삼각범: x-y 평면으로 부푼 실제 천
  B,D,L=self.B,self.deck_y,self.L; flip=-1 if reverse else 1
  if crab:
   points=[[x-L*.15,D+mheight*.77,0],[x+L*.24,D+mheight*.79,0],[x+L*.24,D+mheight*.22,0]]
  else:
   points=[[x-L*.22*flip,D+mheight*.70,0],[x+L*.14*flip,D+mheight*.97,0],[x+L*.17*flip,D+mheight*.20,0]]
  # barycentric finer triangular curved fabric
  N=12 if self.mobile else 19;v=[];idx={};f=[]
  for i in range(N+1):
   for j in range(N+1-i):
    a=i/N;b=j/N;c=1-a-b
    p=np.array(points[0])*c+np.array(points[1])*a+np.array(points[2])*b
    p[2]=B*(.30*math.sin(math.pi*a)*math.sin(math.pi*b)+.02*math.sin(i*.9+j*.5))
    idx[(i,j)]=len(v);v.append(p)
  for i in range(N):
   for j in range(N-i):
    f.append((idx[(i,j)],idx[(i+1,j)],idx[(i,j+1)]))
    if j<N-i-1:f.append((idx[(i+1,j)],idx[(i+1,j+1)],idx[(i,j+1)]))
  self.add(v,f,mat,'sails')
  # V 프레임 선재, 깃발/겹돛
  for a,b in ((0,1),(0,2),(1,2)):
   self.beam(points[a],points[b],B*.023 if (a,b)==(0,1) else B*.010,'wood' if (a,b)==(0,1) else 'rope',8)
  # 보조삭구
  for pt in points:
   self.beam([x,D+B*.05,0],pt,B*.006,'rope',5)
  for k in range(1,7):
   t=k/8;a=np.array(points[0])*(1-t)+np.array(points[2])*t;b=np.array(points[1])*(1-t)+np.array(points[2])*t
   self.beam(a,b,B*.005,'sailshade',4)
 def gaff_sail(self,x,ht,span,mat='sail'):
  B,D=self.B,self.deck_y;P=[[x-span*.48,D+ht*.22,0],[x-span*.38,D+ht*.82,0],[x+span*.42,D+ht*.72,0],[x+span*.50,D+ht*.2,0]]
  NX,NY=(10,8) if self.mobile else (14,12);v=[];f=[]
  for j in range(NY+1):
   t=j/NY; a=np.array(P[0])*(1-t)+np.array(P[1])*t;b=np.array(P[3])*(1-t)+np.array(P[2])*t
   for i in range(NX+1):
    u=i/NX;p=a*(1-u)+b*u;p[2]=B*.27*math.sin(math.pi*u)*math.sin(math.pi*t);v.append(p)
  for j in range(NY):
   for i in range(NX):
    a=j*(NX+1)+i;b=a+NX+1;f.extend([(a,a+1,b),(b,a+1,b+1)])
  self.add(v,f,mat,'sails')
  self.beam(P[1],P[2],B*.030,'wood',10)
  self.beam(P[0],P[3],B*.024,'wood',9)
  for p in (P[2],P[3]):self.beam([x,self.deck_y,0],p,B*.009,'rope',6)
  # 개프 종범은 실제 휘어진 천을 따라 세로 재봉선과 하단 결속을 표시.
  for i in ((2,5,8) if self.mobile else (3,6,9,12)):
   self.path([np.array(v[j*(NX+1)+i])+[0,0,B*.004] for j in range(1,NY)],B*.004,'sailshade',4)
  for j in ((2,4,6) if self.mobile else (3,6,9)):
   self.path([np.array(v[j*(NX+1)+i])+[0,0,B*.006] for i in range(1,NX)],B*.003,'sailshade',4)
  for i in ((2,5,8) if self.mobile else (2,5,8,11)):
   p=np.array(v[i]);self.beam(p,p+[0,-B*.065,0],B*.005,'rope',5)
 def junk_sail(self,x,top,bottom,width,mat='sail'):
  # 세장형 곡면 누적 돛살이 있는 정크선·동남아 전용 범장
  B=self.B;NX=18;NY=10;v=[];f=[]
  for iy in range(NY+1):
   t=iy/NY
   for ix in range(NX+1):
    u=ix/NX
    xx=x+width*(u-.48)+B*.055*math.sin(math.pi*t)
    yy=bottom+(top-bottom)*t+B*.028*math.sin(math.pi*u)
    zz=B*.22*math.sin(math.pi*u)*math.sin(math.pi*t)
    v.append([xx,yy,zz])
  for j in range(NY):
   for i in range(NX):
    a=j*(NX+1)+i;b=a+NX+1;f.extend([(a,b,a+1),(a+1,b,b+1)])
  self.add(v,f,mat,'sails')
  # 동아시아·동남아의 가로 댓살은 돛의 부푼 곡면에 정밀하게 결속한다.
  for j in (0,2,4,6,8,10):
   self.path([np.array(v[j*(NX+1)+i])+[0,B*.005,B*.012] for i in range(NX+1)],B*.024,'wood',7)
  for i in (3,7,11,15):
   self.path([np.array(v[j*(NX+1)+i])+[0,0,B*.014] for j in range(NY+1)],B*.004,'sailshade',5)
  for side in (-1,1):
   self.beam([x,self.deck_y,0],[x+width*side*.42,top,0],B*.007,'rope',5)
 def sails(self):
  L,B,H,D=self.L,self.B,self.H,self.deck_y
  m=self.mast_count
  pos=np.linspace(-L*.24,L*.25,m) if m>1 else np.array([-.01*L])
  if m==4:pos=np.array([-.28,-.05,.14,.31])*L
  for k,x in enumerate(pos):
   h=H*(.74 if k==0 else .96 if k==1 else .82 if k==2 else .72)
   if m==1:h=H*.94
   if self.form in ('low','flat','war','turtle','outrigger','reed') and self.rigtype=='oar':h*=.48
   if self.id=='geobukseon':continue
   if self.id=='nile_papyrus':continue
   self.role='masts';self.mast(float(x),h);self.role='rigging'
   ivory='ivory' if self.faction in ('lost','east_asia') else 'sail'
   if self.faction=='lost':ivory='mint' if self.id!='flying_dutchman' else 'ghost'
   if self.id in ('astheria_flagship','atlantis_carrier'):ivory='white'
   if self.id=='mu_voyager':ivory='turquoise'
   if self.id=='flying_dutchman':ivory='ghostdark'
   if (self.id in ('galleon','manila_galleon') and k==m-1):
    # 대항해시대 갈레온은 마지막 돛대에 사각돛이 아닌 후미 삼각 대각돛을 건다.
    self.triangular_sail(float(x),h,L*.21,ivory,reverse=True)
   elif self.rigtype=='square' or (self.rigtype=='mixed' and k<m-1):
    span=B*(1.20 if self.form in ('battleship','tall') else 1.02)*(1-.10*k)
    self.square_sail(x,D+h*.51,D+h*.27,span,ivory,self.id=='flying_dutchman',k==1)
    self.square_sail(x,D+h*.77,D+h*.56,span*.81,ivory,self.id=='flying_dutchman')
    if self.id in ('galleon','ship_of_line','manila_galleon','flying_dutchman','atlantis_carrier','astheria_flagship'):
     self.square_sail(x,D+h*.95,D+h*.80,span*.59,ivory,self.id=='flying_dutchman')
   elif self.rigtype=='junk':
    self.junk_sail(x,D+h*.85,D+h*.18,L*(.36 if m<3 else .24),ivory)
   elif self.rigtype=='gaff' or (self.id=='atlantic_brigantine' and k==m-1):
    # 브리간틴: 앞돛대 사각횡범 / 뒷돛대 개프 종범을 분명히 구분.
    self.gaff_sail(x,h,L*(.29 if m>1 else .50),ivory)
   elif self.rigtype=='lateen' or self.rigtype=='crab' or self.rigtype=='mixed':
    self.triangular_sail(float(x),h,L*(.28 if m>1 else .42),ivory,reverse=(k%2==1),crab=self.rigtype=='crab')
   elif self.rigtype=='oar':
    if self.id not in ('pirogue','kobaya','coracora') or k==0:
     self.square_sail(x,D+h*.74,D+h*.41,B*.75,ivory)
  # 잔잔한 선수 삼각 보조범(돛 방향과 구조 다름)
  if self.rigtype in ('gaff','square','mixed') and self.form not in ('low','flat','war','turtle'):
   x=L*.26
   if pos[-1]<x:
    self.triangular_sail(x,H*.40,L*.22,'sailbright' if self.faction!='lost' else 'mint',reverse=True)
 def signature(self):
  L,B,D=self.L,self.B,self.deck_y
  if self.id=='galleon':
   # 스페인·포르투갈식 높게 올라간 선미 갤러리: 층별 기둥·아치·화려한 금장.
   for side in (-1,1):
    for tier in range(2):
     yy=D+B*(.40+tier*.24)
     for i in range(7):
      xx=-L*.46+i*L*.042
      self.beam([xx,yy,side*B*.41],[xx,yy+B*.18,side*B*.41],B*.012,'gold',8)
     self.beam([-L*.46,yy+B*.18,side*B*.41],[-L*.21,yy+B*.18,side*B*.41],B*.014,'lightgold',8)
   self.beam([L*.47,D+B*.27,0],[L*.54,D+B*.43,0],B*.042,'gold',11)
   self.sphere([L*.55,D+B*.45,0],[B*.07,B*.10,B*.064],'lightgold',2)
  elif self.id=='atlantic_brigantine':
   # 앞횡범 뒤종범을 갖춘 카리브해 경무장 교역선 고유 후방 조타부.
   for side in (-1,1):
    for i in range(5):
     xx=-L*.39+i*L*.045
     self.beam([xx,D+B*.08,side*B*.33],[xx,D+B*.29,side*B*.33],B*.018,'wood',8)
   self.beam([-L*.40,D+B*.13,0],[-L*.42,D+B*.34,0],B*.05,'wood',10)
   self.sphere([-L*.42,D+B*.35,0],[B*.11,B*.035,B*.11],'bronze',1)
  elif self.id=='zanzibar_jahazi':
   # 자하즈: 후방 격자목공·긴 조타키와 옆판의 봉합못/줄 결구.
   self.beam([-L*.42,D+B*.11,0],[-L*.50,D-B*.35,0],B*.052,'darkwood',10)
   for side in (-1,1):
    for j in range(7):
     q=-.36+j*.10
     x,y,z=self.hull_cross(q,4)
     self.beam([x,y-B*.035,side*(z+B*.012)],[x+L*.018,y+B*.023,side*(z+B*.015)],B*.009,'rope',5)
   # 동아프리카 원양선 전용 넓은 지붕, 목재 격자 지붕틀과 적재용 가로빔.
   for x0 in (-L*.32,-L*.15):
    for side in (-1,1):
     self.beam([x0,D+B*.05,side*B*.33],[x0,D+B*.47,side*B*.33],B*.025,'wood',8)
   self.panel([[-L*.37,D+B*.48,-B*.38],[-L*.10,D+B*.49,-B*.38],[-L*.10,D+B*.49,B*.38],[-L*.37,D+B*.48,B*.38]],'sail2')
   for x0 in (-L*.36,-L*.27,-L*.18,-L*.11):
    self.beam([x0,D+B*.50,-B*.39],[x0,D+B*.50,B*.39],B*.018,'darkwood',8)
  elif self.id=='astheria_flagship':
   # 황금 천문환, 파도 무늬, 왕실 기함 후미 갤러리
   for rad in (B*.32,B*.26):
    self.path([[L*.10+rad*math.cos(t),D+B*.42+rad*math.sin(t),0] for t in np.linspace(0,math.tau,29)],B*.017,'lightgold',8)
   for t in np.linspace(0,math.tau,12,endpoint=False):
    self.beam([L*.10,D+B*.42,0],[L*.10+B*.32*math.cos(t),D+B*.42+B*.32*math.sin(t),0],B*.012,'gold')
   for side in (-1,1):
    for k in range(7):
     x=-L*.40+k*L*.105
     self.sphere([x,D+B*.48,side*B*.37],[B*.026,B*.043,B*.026],'turquoise',2)
  elif self.id=='flying_dutchman':
   for side in (-1,1):
    for i in range(9):
     x=-L*.4+i*L*.09
     self.sphere([x,D+B*.21,side*B*.43],[B*.035,B*.07,B*.025],'ghost',2)
  elif self.id=='kobaya':
   # 일본 고바야 전용 낮은 방패판과 선수 중앙 감시기.
   for side in (-1,1):
    for q in np.linspace(-.37,.35,9):
     self.box(q*L,D+B*.09,side*B*.35,L*.026,B*.22,B*.038,'wood')
   self.beam([L*.32,D+B*.02,0],[L*.32,D+B*.45,0],B*.031,'darkwood')
  elif self.id=='sekibune':
   # 세키부네는 선수 높은 방패판, 고바야보다 두껍고 높은 상갑판 울타리.
   for side in (-1,1):
    for q in np.linspace(-.32,.33,11):
     self.box(q*L,D+B*.20,side*B*.39,L*.025,B*.35,B*.055,'darkwood')
     self.box(q*L,D+B*.32,side*B*.418,L*.014,B*.08,B*.015,'bronze')
  elif self.id=='zaruk':
   # 자루크: 좁은 연안 어선 특유 작은 곡선 선수와 어구 묶음.
   self.path([[L*.35+i*L*.024,D+B*(.07+.02*i*i),0] for i in range(5)],B*.05,'wood',9)
   for side in (-1,1):
    for q in (.12,.20):
     self.sphere([q*L,D+B*.06,side*B*.20],[B*.085,B*.065,B*.11],'reed',1)
  elif self.id=='sambuk':
   # 삼부크: 홍해 연안선의 짧은 후방 차양과 새긴 뱃전.
   for side in (-1,1):
    for x0 in (-L*.35,-L*.16):
     self.beam([x0,D,side*B*.30],[x0,D+B*.41,side*B*.30],B*.02,'wood')
   self.panel([[-L*.37,D+B*.43,-B*.35],[-L*.14,D+B*.43,-B*.35],[-L*.14,D+B*.43,B*.35],[-L*.37,D+B*.43,B*.35]],'sailbright')
  elif self.id=='panokseon':
   for q in np.linspace(-.30,.24,7):
    self.box(q*L,D+B*.48,0,L*.016,B*.20,B*.60,'wood')
  elif self.id in ('treasure_ship','javanese_jong'):
   # 다층 격벽·중국 보선과 자바 종을 구분하는 선미루·화물용 가로빔.
   for i in range(9):
    x=-L*.33+i*L*.07
    self.box(x,D+B*.07,0,L*.017,B*.12,B*.60,'darkwood')
   for side in (-1,1):
    for k in range(7):
     x=-L*.40+k*L*.053
     y=D+B*(.25 if self.id=='javanese_jong' else .43)
     self.beam([x,D+B*.06,side*B*.34],[x,y,side*B*.34],B*.017,'gold' if self.id=='treasure_ship' else 'pine',7)
   if self.id=='treasure_ship':
    for side in (-1,1):
     self.path([[-L*.42,D+B*.53,side*B*.41],[-L*.32,D+B*.67,side*B*.39],[-L*.18,D+B*.53,side*B*.41]],B*.025,'red',8)
   else:
    for x in (-L*.35,-L*.27,-L*.19):
     self.beam([x,D+B*.29,-B*.37],[x,D+B*.29,B*.37],B*.025,'pine',8)
  elif self.id in ('coracora','prau'):
   for side in (-1,1):
    for i in range(5):
     x=-L*.30+i*L*.14
     self.sphere([x,D+B*.07,side*B*.47],[B*.035,B*.07,B*.035],'red' if self.faction!='lost' else 'turquoise',1)
  elif self.id in ('baghlah','dhow','oman_boom','zanzibar_dhow'):
   # 완만히 올라오는 전통 인도양식 긴 선미
   self.path([[-L*.35-i*L*.019,D+B*(.12+.02*i*i),0] for i in range(8)],B*.046,'wood',9)
   for i in range(7):
    x=-L*.30-i*L*.02
    self.beam([x,D+B*.09,0],[x,D+B*(.14+i*.025),0],B*.014,'gold',7)
   if self.id=='baghlah':
    # 바글라 상선: 구부러진 높은 선미와 2단 아라비아 목조 아치.
    for side in (-1,1):
     for j in range(6):
      xx=-L*.43+j*L*.042
      self.beam([xx,D+B*.36,side*B*.34],[xx,D+B*.56,side*B*.34],B*.020,'pale',8)
     self.beam([-L*.45,D+B*.57,side*B*.34],[-L*.19,D+B*.57,side*B*.34],B*.020,'bronze',9)
    self.panel([[-L*.43,D+B*.56,-B*.34],[-L*.19,D+B*.56,-B*.34],[-L*.19,D+B*.56,B*.34],[-L*.43,D+B*.56,B*.34]],'sailbright')
   elif self.id=='oman_boom':
    # 아라비아 붐: 길게 돌출한 선수와 전통 상선의 길쭉한 상부 지지대.
    self.beam([L*.45,D+B*.18,0],[L*.63,D+B*.29,0],B*.042,'wood',10)
    for side in (-1,1):
     self.path([[L*.14,D+B*.06,side*B*.36],[L*.35,D+B*.30,side*B*.34],[L*.58,D+B*.29,side*B*.22]],B*.025,'pale',8)
   elif self.id=='zanzibar_dhow':
    # 잔지바르 연안 다우선: 향신료 화물 발코니와 마름모형 장식.
    for x0 in (-L*.10,L*.05,L*.19):
     for side in (-1,1):
      zz=side*B*.26
      self.box(x0,D+B*.16,zz,B*.21,B*.21,B*.20,'wood')
      self.path([[x0-B*.11,D+B*.22,zz],[x0,D+B*.34,zz],[x0+B*.11,D+B*.22,zz]],B*.018,'gold',7)
  elif self.id=='nile_papyrus':
   # 고대 갈대배: 나무 판재가 아니라 갈대 다발을 묶은 두 줄의 곡선 외형.
   for s in (-1,1):
    for zfactor in (.28,.40):
     self.path([[q*L*.43,D-B*.07,s*B*zfactor*math.sqrt(max(0,1-q*q))] for q in np.linspace(-1,1,31)],B*.035,'reed',8)
    for q in np.linspace(-.7,.7,10):
     z=s*B*.40*math.sqrt(max(0,1-q*q))
     self.beam([q*L*.43,D-B*.17,z],[q*L*.43,D+B*.05,z],B*.016,'rope',6)
  elif self.id=='mu_voyager':
   for side in (-1,1):
    for k in range(10):
     q=-.40+k*.08;x,y,z=self.hull_cross(q,4)
     self.sphere([x,y,side*z*1.04],[B*.024,B*.025,B*.016],'lightgold',1)
 def export(self):
  # 여러 부품을 재질별 병합: Roblox GLB import 호환을 위해 재질 25개 이하 유지
  scene=trimesh.Scene();info=[];materials={}
  for (role,mat),shapes in self.parts.items():
   offset=0;vv=[];ff=[]
   for v,f in shapes:
    vv.append(v);ff.append(f+offset);offset+=len(v)
   arr=np.concatenate(vv).astype(np.float32); faces=np.concatenate(ff).astype(np.int32)
   mesh=trimesh.Trimesh(vertices=arr,faces=faces,process=False,validate=False)
   mesh.visual=trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=mat,baseColorFactor=PALETTE[mat],metallicFactor=0.45 if mat in ('gold','lightgold','bronze','iron','silver') else .0,roughnessFactor=.42 if mat in ('gold','lightgold','bronze') else .88,doubleSided=True))
   scene.add_geometry(mesh,geom_name=self.id+'_'+role+'_'+mat,node_name=self.id+'_'+role+'_'+mat)
   info.append({'role':role,'name':mat,'vertices':len(mesh.vertices),'triangles':len(mesh.faces)})
  p=ROOT/('models_mobile' if self.mobile else 'models')/(self.id+'.glb');p.parent.mkdir(parents=True,exist_ok=True);blob=scene.export(file_type='glb');p.write_bytes(blob)
  return p,info
 def build(self):
  # 메인: 역할별 분리. 실제 돛/노/돛대 단위로 Roblox 개별 MeshPart 조작 가능.
  for role,method in (('hull',self.hull),('cannons',self.gundeck),('deck',self.superstructure),('railings',self.railings),('fittings',self.fittings),('oars',self.oars),('rigging',self.sails),('flags',self.flags),('windows',self.portholes),('ornament',self.signature)):
   self.role=role;method()
  return self.export()

if __name__=='__main__':
 import sys,time
 entries=OLD
 if len(sys.argv)>1 and sys.argv[1]!='all':entries=[e for e in OLD if e['id'] in sys.argv[1:]]
 catalog=[]
 for e in entries:
  tick=time.time();b=Builder(e);p,info=b.build()
  s=trimesh.load(p,force='scene'); bounds=s.bounds; dims=s.extents
  if not len(s.geometry) or not np.isfinite(bounds).all() or not all(g.is_winding_consistent for g in s.geometry.values()):
   raise RuntimeError('BAD_MODEL:'+str(p))
  roles=sorted({r['role'] for r in info})
  if ('sails' not in roles) != (e['id'] in ('geobukseon','nile_papyrus')): raise RuntimeError('SHIP_SAIL_ROLE_MISMATCH:'+e['id'])
  mobile=Builder(e);mobile.mobile=True;mobilepath,mobileinfo=mobile.build()
  mobile_scene=trimesh.load(mobilepath,force='scene')
  mobiletriangles=sum(len(g.faces) for g in mobile_scene.geometry.values())
  if mobiletriangles>=sum(len(g.faces) for g in s.geometry.values())*.83: raise RuntimeError('SHIP_MOBILE_NOT_LIGHTER:'+e['id'])
  if np.max(np.abs(mobile_scene.extents-dims)/np.maximum(1,dims))>.025: raise RuntimeError('SHIP_MOBILE_SILHOUETTE_DRIFT:'+e['id'])
  if sorted({g['role'] for g in mobileinfo})!=roles: raise RuntimeError('SHIP_MOBILE_ROLE_DRIFT:'+e['id'])
  entry={'mobileModelPath':'models_mobile/'+e['id']+'.glb','mobileSha256':hashlib.sha256(mobilepath.read_bytes()).hexdigest(),'mobileTriangles':mobiletriangles,'meshRoles':roles,'id':e['id'],'name':e['name'],'faction':e['faction'],'stage':e['stage'],'targetStuds':e['targetStuds'],'modelPath':'models/'+e['id']+'.glb','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'meshCount':len(s.geometry),'triangles':sum(len(g.faces) for g in s.geometry.values()),'extents':dims.round(3).tolist(),'origin':'PROJECT_ORIGINAL_ART','author':'Original parametric model created for user; no external meshes used','source':'Generated geometry from original code','RobloxUploaded':False,'StudioRuntimeVerified':False,'meshes':info}
  catalog.append(entry);print(e['id'],p.stat().st_size,entry['triangles'],len(s.geometry),'elapsed',round(time.time()-tick,1),flush=True)
 (ROOT/'catalog.json').write_text(json.dumps({'modelCount':len(catalog),'entries':catalog},ensure_ascii=False,indent=2))

 # [자산 등록] 기존 업로더가 읽는 naval 원본 폴더에만 설치한다.
 # 원본 5차 제작본과 비트 단위로 다른 메시/모바일 경량 모델은 업로드하지 않는다.
 output = Path('roblox-games/mare-essentia/assets/naval')
 output.mkdir(parents=True,exist_ok=True)
 if len(entries) == len(OLD) and len(catalog) != 36:
  raise RuntimeError('MARE_V5_EXPECTED_36_SHIPS')
 published = 0
 for entry in catalog:
  ship_id=entry['id']
  full=ROOT/entry['modelPath'];mobile=ROOT/entry['mobileModelPath']
  for variant, file_path, target_name, info, tris in (
   ('full',full,ship_id+'-v5.glb',entry['sha256'],entry['triangles']),
   ('mobile',mobile,ship_id+'-v5-mobile.glb',entry['mobileSha256'],entry['mobileTriangles'])
  ):
   blob=file_path.read_bytes()
   sha=hashlib.sha256(blob).hexdigest()
   expected=EXPECTED_SHIP_HASHES[ship_id][variant]
   if sha!=expected or sha!=info:
    raise RuntimeError('MARE_V5_SOURCE_SHA256_DRIFT:'+ship_id+':'+variant)
   if blob[:4]!=b'glTF' or int.from_bytes(blob[8:12],'little')!=len(blob):
    raise RuntimeError('MARE_V5_GLB_INVALID:'+ship_id+':'+variant)
   target=output/target_name
   if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()!=sha:
    raise RuntimeError('MARE_V5_EXISTING_ASSET_DRIFT:'+target_name)
   shutil.copyfile(file_path,target)
   meta={
    'license':'PROJECT_ORIGINAL_ART',
    'author':'Original 3D geometry generated for Mare Essentia',
    'source':'directly generated original procedural geometry',
    'sourceSha256':sha,
    'shipBlueprintId':ship_id,
    'platform':'ROBLOX',
    'variant':variant,
    'meshRoles':entry['meshRoles'],
    'triangles':tris,
    'structuralGlbVerified':True,
    'actualRobloxRuntimeVerified':False,
    'visualQualityApproved':False,
    'robloxPublishedVerified':False,
    'assetProductionStatus':'SOURCE_READY_NATIVE_QA_PENDING'
   }
   proof=target.with_suffix('.glb.license.json')
   if proof.exists() and json.loads(proof.read_text())['sourceSha256']!=sha:
    raise RuntimeError('MARE_V5_EXISTING_LICENSE_DRIFT:'+target_name)
   proof.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   published+=1
 print('MARE_V5_SOURCE_MATCHED_MODELS='+str(published),flush=True)
