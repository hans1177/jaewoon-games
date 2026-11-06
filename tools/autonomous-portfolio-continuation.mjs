import fs from 'node:fs';
import {
  loadSeedState,
  pendingPortfolioSeedRequests,
  platformRepresentativeGaps,
  readJson,
} from './game-seed-state.mjs';
import {
  loadPlatformProfiles,
  normalizeSeedPlatform,
  representativeCategoriesForPlatform,
} from './game-seed-platform-profile.mjs';

function kstDate(value=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function representativePlan({seedState,directiveOverride=null,platformProfilesOverride=null}={}){
  const directive=directiveOverride||readJson('company-directive.json',{})||{};
  const profiles=platformProfilesOverride||loadPlatformProfiles();
  const platform=normalizeSeedPlatform(directive.platformStrategy?.primaryPlatform||directive.gameSeed?.initialTargetPlatform||'ROBLOX')||'ROBLOX';
  const categories=representativeCategoriesForPlatform(directive,platform,profiles);
  const gaps=platformRepresentativeGaps(seedState,platform,categories);
  return {platform,categories,gaps};
}

export function decidePortfolioContinuation({portfolio={},queueState={},seedState=null,date=kstDate(),filesystem=fs,directiveOverride=null,platformProfilesOverride=null}={}){
  if(portfolio.status!=='ACTIVE'||portfolio.paidApi!==false)return{action:'HOLD',reason:'PORTFOLIO_POLICY_BLOCK'};
  const maxDaily=Math.max(1,Math.min(24,Number(portfolio.maxAutonomousWorkItemsPerDay??8)||8));
  const attempts=(queueState.attempts||[]).filter(x=>x.date===date);
  const seeds=seedState||loadSeedState();

  if(!seeds.bootstrapCompletedAt){
    return{action:'DISPATCH_GAME_SEED',reason:'INITIAL_SIX_SEED_BOOTSTRAP_REQUIRED',date,attempts:attempts.length,maxDaily,seedMode:'INITIAL_BOOTSTRAP'};
  }

  const setPlan=representativePlan({seedState:seeds,directiveOverride,platformProfilesOverride});
  if(setPlan.gaps.length){
    return{
      action:'DISPATCH_GAME_SEED',
      reason:'PLATFORM_REPRESENTATIVE_SET_FILL_REQUIRED',
      date,
      attempts:attempts.length,
      maxDaily,
      seedMode:'PLATFORM_SET_FILL',
      platform:setPlan.platform,
      representativeCategoryCount:setPlan.categories.length,
      missingCategories:setPlan.gaps,
    };
  }

  const attempted=new Set(attempts.map(x=>x.gameId));
  const eligible=(portfolio.projects||[]).filter(p=>p.mode!=='HOLD'&&p.sourcePath&&filesystem.existsSync(p.sourcePath));
  const remaining=eligible.filter(p=>!attempted.has(p.id));
  if(remaining.length)return{action:'WAIT_GAME_QUEUE',reason:'GAME_WORK_REMAINS',date,remaining:remaining.map(x=>x.id),attempts:attempts.length,maxDaily};

  const expansionRequests=pendingPortfolioSeedRequests(seeds);
  if(expansionRequests.length){
    return{
      action:'DISPATCH_GAME_SEED',
      reason:'DEPARTMENT_SCORE_GUIDED_PORTFOLIO_EXPANSION_REQUIRED',
      date,
      attempts:attempts.length,
      maxDaily,
      seedMode:'DYNAMIC_PORTFOLIO_EXPANSION',
      portfolioSeedRequests:expansionRequests.map(request=>({
        id:request.id,
        category:request.category,
        targetPlatform:request.targetPlatform||null,
        aggregateScore:request.aggregateScore,
        decisionBand:request.decisionBand,
        ownerOverride:request.ownerOverride===true,
      })),
    };
  }

  if(attempts.length>=maxDaily)return{action:'STOP',reason:'DAILY_AUTONOMOUS_CAP_REACHED',date,attempts:attempts.length,maxDaily};
  return{action:'STOP',reason:'NO_SCORE_APPROVED_PORTFOLIO_EXPANSION',date,attempts:attempts.length,maxDaily};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
  console.log(JSON.stringify(decidePortfolioContinuation({portfolio:read('autonomous-portfolio.json',{}),queueState:read('.autonomous/queue-state.json',{attempts:[]}),seedState:loadSeedState()}),null,2));
}
