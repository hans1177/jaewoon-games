// Canonical Roblox genre profile helper for design-gate evidence.
// Taxonomy source: Roblox Creator Hub experience genres.
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();

export const ROBLOX_GENRE_TAXONOMY={
  Action:['Battlegrounds & Fighting','Music & Rhythm','Open World Action'],
  Adventure:['Exploration','Scavenger Hunt','Story'],
  Education:[],
  Entertainment:['Music & Audio','Showcase & Hub','Video'],
  'Obby & platformer':['Classic Obby','Runner','Tower Obby'],
  'Party & casual':['Childhood Game','Coloring & Drawing','Minigame','Quiz'],
  Puzzle:['Escape Room','Match & Merge','Word'],
  RPG:['Action RPG','Open World & Survival RPG','Turn-based RPG'],
  'Roleplay & avatar sim':['Animal Sim','Dress Up','Life','Morph Roleplay','Pet Care'],
  Shooter:['Battle Royale','Deathmatch Shooter','PvE Shooter'],
  Shopping:['Avatar Shopping'],
  Simulation:['Idle','Incremental Simulator','Physics Sim','Sandbox','Tycoon','Vehicle Sim'],
  Social:[],
  'Sports & racing':['Racing','Sports'],
  Strategy:['Board & Card Games','Tower Defense'],
  Survival:['1 vs All','Escape'],
  'Utility & other':[]
};

const GENRE_KO={
  Action:'액션',Adventure:'어드벤처',Education:'교육',Entertainment:'엔터테인먼트',
  'Obby & platformer':'오비·플랫포머','Party & casual':'파티·캐주얼',Puzzle:'퍼즐',RPG:'RPG',
  'Roleplay & avatar sim':'롤플레이·아바타 시뮬',Shooter:'슈터',Shopping:'쇼핑',Simulation:'시뮬레이션',
  Social:'소셜','Sports & racing':'스포츠·레이싱',Strategy:'전략',Survival:'서바이벌','Utility & other':'기타'
};
const SUBGENRE_KO={
  'Battlegrounds & Fighting':'배틀그라운드·격투','Music & Rhythm':'음악·리듬','Open World Action':'오픈월드 액션',
  Exploration:'탐험','Scavenger Hunt':'수집 탐색',Story:'스토리','Music & Audio':'음악·오디오','Showcase & Hub':'쇼케이스·허브',Video:'비디오',
  'Classic Obby':'클래식 오비',Runner:'러너','Tower Obby':'타워 오비','Childhood Game':'놀이','Coloring & Drawing':'색칠·그리기',Minigame:'미니게임',Quiz:'퀴즈',
  'Escape Room':'방탈출','Match & Merge':'매치·머지',Word:'단어','Action RPG':'액션 RPG','Open World & Survival RPG':'오픈월드·생존 RPG','Turn-based RPG':'턴제 RPG',
  'Animal Sim':'동물 시뮬','Dress Up':'꾸미기',Life:'라이프','Morph Roleplay':'모프 롤플레이','Pet Care':'펫 케어',
  'Battle Royale':'배틀로얄','Deathmatch Shooter':'데스매치 슈터','PvE Shooter':'PvE 슈터','Avatar Shopping':'아바타 쇼핑',
  Idle:'방치형','Incremental Simulator':'증분 시뮬','Physics Sim':'물리 시뮬',Sandbox:'샌드박스',Tycoon:'타이쿤','Vehicle Sim':'차량 시뮬',
  Racing:'레이싱',Sports:'스포츠','Board & Card Games':'보드·카드','Tower Defense':'타워 디펜스','1 vs All':'1 대 다수',Escape:'탈출'
};
const PLAY_MODE={
  SINGLE:{code:'SINGLE',labelKo:'싱글'},
  COOP:{code:'COOP',labelKo:'멀티·협동'},
  COMPETITIVE:{code:'COMPETITIVE',labelKo:'멀티·경쟁'},
  HYBRID:{code:'HYBRID',labelKo:'멀티·혼합'}
};

const has=(text,re)=>re.test(text);
export function classifyRobloxGenre({category='',identity='',coreLoop=[],designText='',multiplayerMode=''}={}){
  const text=clean([category,identity,...(Array.isArray(coreLoop)?coreLoop:[]),designText].join(' ')).toLowerCase();
  let genre='Utility & other',subgenre='';

  if(has(text,/(obby|platformer|platform|오비|플랫포머)/)){
    genre='Obby & platformer';
    subgenre=has(text,/(tower|타워)/)?'Tower Obby':has(text,/(runner|러너|자동 이동)/)?'Runner':'Classic Obby';
  }else if(has(text,/(shooter|fps|gun|shoot|총기|슈터|사격)/)){
    genre='Shooter';
    subgenre=has(text,/(battle royale|배틀.?로얄)/)?'Battle Royale':has(text,/(pve|enemy|monster|적|몬스터)/)?'PvE Shooter':'Deathmatch Shooter';
  }else if(has(text,/(tower defense|tower.?defen|타워.?디펜스|디펜스|defense)/)){
    genre='Strategy';subgenre='Tower Defense';
  }else if(has(text,/(board|card|chess|보드|카드|체스)/)){
    genre='Strategy';subgenre='Board & Card Games';
  }else if(has(text,/(strategy|전략|territory|영토|tactical|전술)/)){
    genre='Strategy';
  }else if(has(text,/(turn.?based|턴제)/)&&has(text,/(rpg|role.?playing|역할)/)){
    genre='RPG';subgenre='Turn-based RPG';
  }else if(has(text,/(rpg|role.?playing|역할.?수행)/)){
    genre='RPG';
    subgenre=has(text,/(survival|open.?world|생존|오픈.?월드)/)?'Open World & Survival RPG':'Action RPG';
  }else if(has(text,/(survival|생존)/)){
    genre='Survival';
    subgenre=has(text,/(escape|탈출)/)?'Escape':has(text,/(1\s*vs\s*all|asym|비대칭)/)?'1 vs All':'';
  }else if(has(text,/(puzzle|퍼즐)/)){
    genre='Puzzle';
    subgenre=has(text,/(escape.?room|방탈출)/)?'Escape Room':has(text,/(match|merge|매치|머지|합치)/)?'Match & Merge':has(text,/(word|단어)/)?'Word':'';
  }else if(has(text,/(idle|방치)/)){
    genre='Simulation';subgenre='Idle';
  }else if(has(text,/(incremental|증분|클리커|clicker)/)){
    genre='Simulation';subgenre='Incremental Simulator';
  }else if(has(text,/(tycoon|타이쿤|business management|경영)/)){
    genre='Simulation';subgenre='Tycoon';
  }else if(has(text,/(sandbox|샌드박스|world build|세계.?창조)/)){
    genre='Simulation';subgenre='Sandbox';
  }else if(has(text,/(vehicle|driving|car|boat|plane|차량|운전)/)){
    genre='Simulation';subgenre='Vehicle Sim';
  }else if(has(text,/(simulation|simulator|생활|시뮬)/)){
    genre='Simulation';
  }else if(has(text,/(racing|race|레이싱|경주)/)){
    genre='Sports & racing';subgenre='Racing';
  }else if(has(text,/(sport|축구|농구|야구|스포츠)/)){
    genre='Sports & racing';subgenre='Sports';
  }else if(has(text,/(minigame|미니게임|party|파티)/)){
    genre='Party & casual';subgenre='Minigame';
  }else if(has(text,/(quiz|퀴즈)/)){
    genre='Party & casual';subgenre='Quiz';
  }else if(has(text,/(pet care|펫.?케어|반려|pet|animal sim)/)){
    genre='Roleplay & avatar sim';subgenre=has(text,/(care|키우|돌보)/)?'Pet Care':'Animal Sim';
  }else if(has(text,/(roleplay|role.?play|롤플레이|dress.?up|꾸미기|life sim)/)){
    genre='Roleplay & avatar sim';subgenre=has(text,/(dress|꾸미)/)?'Dress Up':has(text,/(life|생활)/)?'Life':'';
  }else if(has(text,/(story|스토리|narrative|서사)/)){
    genre='Adventure';subgenre='Story';
  }else if(has(text,/(scavenger|collect|collection|수집|찾기)/)){
    genre='Adventure';subgenre='Scavenger Hunt';
  }else if(has(text,/(explor|탐험|모험|adventure)/)){
    genre='Adventure';subgenre='Exploration';
  }else if(has(text,/(music|rhythm|리듬)/)){
    genre='Action';subgenre='Music & Rhythm';
  }else if(has(text,/(combat|fight|battle|전투|격투|액션)/)){
    genre='Action';subgenre='Battlegrounds & Fighting';
  }else if(has(text,/(social|hangout|chat|소셜|교류)/)){
    genre='Social';
  }else if(has(text,/(education|learning|교육|학습)/)){
    genre='Education';
  }

  if(!ROBLOX_GENRE_TAXONOMY[genre]?.includes(subgenre))subgenre='';
  const mode=PLAY_MODE[clean(multiplayerMode).toUpperCase()]||{code:'UNSPECIFIED',labelKo:'미지정'};
  return {
    taxonomy:'ROBLOX_CREATOR_HUB_EXPERIENCE_GENRES',
    genre,
    genreLabelKo:GENRE_KO[genre]||genre,
    subgenre:subgenre||null,
    subgenreLabelKo:subgenre?(SUBGENRE_KO[subgenre]||subgenre):null,
    playMode:mode.code,
    playModeLabelKo:mode.labelKo,
    displayLabelKo:[GENRE_KO[genre]||genre,subgenre?(SUBGENRE_KO[subgenre]||subgenre):'',mode.labelKo].filter(Boolean).join(' · ')
  };
}
