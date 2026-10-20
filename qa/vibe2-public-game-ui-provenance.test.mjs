import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  inspectPublicGameUi,verifyPublicGameUiRoutes
} from '../tools/vibe2-public-game-ui-provenance.mjs';

const ownerGame='<html><body><canvas id="sea"></canvas><button id="start">항해 시작</button><script type="module" src="./main.mjs"></script></body></html>';

test('unchanged HTML and Pages project prefix normalization preserve original owner game',()=>{
  const origin='<script src="/web-games/cozy-island/runtime.js"></script>';
  const published='<script src="/jaewoon-games/web-games/cozy-island/runtime.js"></script>';
  const q=inspectPublicGameUi({sourceHtml:ownerGame+origin,publishedHtml:ownerGame+published,gameId:'ocean-voyage'});
  assert.equal(q.passed,true);
  assert.equal(q.ownerGameInputUnchanged,true);
  assert.equal(q.published.buttonCount,q.source.buttonCount);
  assert.deepEqual(q.unexpectedScripts,[]);
});

test('autonomous Vibe can author unlimited legitimate gameplay UI in canonical game source',()=>{
  const generated=ownerGame.replace('</body>',
    '<button id="trade">교역</button><button id="shipyard">조선소</button>'+
    '<button id="inventory">인벤토리</button>'+
    '<script src="./gameplay-features.mjs"></script></body>');
  const q=inspectPublicGameUi({
    sourceHtml:generated,publishedHtml:generated,gameId:'ocean-voyage'
  });
  assert.equal(q.passed,true,'intentional autonomous development must not be blocked');
  assert.equal(q.published.buttonCount,4);
  const illegal=inspectPublicGameUi({sourceHtml:generated,
    publishedHtml:generated.replace('</body>',
      '<script defer src="/jaewoon-games/assets/vibe-runtime-panel.js"></script></body>')});
  assert.equal(illegal.passed,false,'only deployment-time extra development UI is blocked');
});

test('detect asset launcher introduced by Vibe publishing instead of blaming original ship GLB',()=>{
  const published=ownerGame.replace('</body>',
    '<script defer src="/jaewoon-games/assets/vibe-runtime-panel.js"></script></body>');
  const q=inspectPublicGameUi({sourceHtml:ownerGame,publishedHtml:published,gameId:'ocean-voyage'});
  assert.equal(q.passed,false);
  assert.ok(q.errorCodes.includes('UNAUTHORIZED_DEV_INSPECTOR_ON_PUBLIC_GAME'));
  assert.ok(q.errorCodes.includes('UNAPPROVED_GAME_SCRIPT_DEPENDENCY'));
  assert.equal(q.causeClass,'DEPLOYMENT_TEMPLATE_OR_ARTIFACT_INJECTION');
  assert.equal(q.stage,'PUBLICATION_HTML_ASSEMBLY');
});

test('independent unexpected third party script, added button and inline script are rejected',()=>{
  const external=inspectPublicGameUi({sourceHtml:ownerGame,
    publishedHtml:ownerGame.replace('</body>','<script src="https://example.invalid/tool.js"></script></body>')});
  assert.ok(external.errorCodes.includes('UNAPPROVED_GAME_SCRIPT_DEPENDENCY'));
  const button=inspectPublicGameUi({sourceHtml:ownerGame,
    publishedHtml:ownerGame.replace('</body>','<button>에셋</button></body>')});
  assert.ok(button.errorCodes.includes('UNAUTHORIZED_PUBLIC_GAME_BUTTON_GENERATION'));
  const renamed=inspectPublicGameUi({sourceHtml:ownerGame,
    publishedHtml:ownerGame.replace('id="start"','id="assets"' )});
  assert.ok(renamed.errorCodes.includes('UNAUTHORIZED_PUBLIC_GAME_BUTTON_REPLACEMENT'));
  const inline=inspectPublicGameUi({sourceHtml:ownerGame,
    publishedHtml:ownerGame.replace('</body>','<script>createDebugUi()</script></body>')});
  assert.ok(inline.errorCodes.includes('UNAUTHORIZED_SCRIPT_TAG_IN_PUBLISHED_GAME'));
});

test('all game routes pass only with their own canonical HTML and fail on one injected game',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-ui-provenance-'));
  try{
    for(const root of ['raw','staged']){
      const dir=path.join(temp,root,'cozy-island');fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,'index.html'),ownerGame);
    }
    const options={sourceRoot:path.join(temp,'raw'),publishedRoot:path.join(temp,'staged'),
      manifest:{routes:['web-games/cozy-island/']}};
    assert.equal(verifyPublicGameUiRoutes(options).checkedGames,1);
    fs.appendFileSync(path.join(temp,'staged/cozy-island/index.html'),'<button>에셋</button>');
    assert.throws(()=>verifyPublicGameUiRoutes(options),/PUBLIC_GAME_UI_PROVENANCE_FAIL:cozy-island/);
    assert.throws(()=>verifyPublicGameUiRoutes({...options,manifest:{routes:['../private/']}}),
      /PUBLIC_GAME_UI_ROUTE_INVALID/);
  }finally{fs.rmSync(temp,{recursive:true,force:true})}
});

test('live Pages workflow enforces provenance before publication with no extra owner approval',()=>{
  const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
  const check=workflow.indexOf('PUBLIC_GAME_UI_PROVENANCE=PASS');
  const publish=workflow.indexOf('name: Publish gh-pages without force');
  assert.ok(check>0&&publish>check,'verify all pages before publication');
  assert.match(workflow,/vibe2-public-game-ui-provenance\.mjs/);
  const fast=fs.readFileSync('.github/workflows/owner-fast-pages-publish.yml','utf8');
  assert.match(fast,/PUBLIC_ASSET_INSPECTOR_STILL_PRESENT/);
});
