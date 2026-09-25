import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../tools/company-unity-web-gameplay-validation.mjs',import.meta.url),'utf8');

test('Unity Web gameplay validation focuses the real canvas before keyboard input',()=>{
  assert.match(source,/const canvas=page\.locator\('canvas'\)\.first\(\)/);
  assert.match(source,/await canvas\.focus\(\);\s*await page\.keyboard\.press\('Digit1'\)/s);
  assert.match(source,/canvasFocusedBeforeKeyboard:true/);
});

test('Unity Web gameplay validation falls back to real browser touch before rejecting gameplay start',()=>{
  const keyAt=source.indexOf("await page.keyboard.press('Digit1')");
  const fallbackAt=source.indexOf("gameplayStartInput='REAL_BROWSER_TOUCH_FALLBACK'");
  const touchAt=source.indexOf('await page.touchscreen.tap(touchX,touchY)',fallbackAt);
  const failureAt=source.indexOf("throw new Error('UNITY_WEB_QA_GAMEPLAY_START_MISSING')");
  assert.ok(keyAt>=0);
  assert.ok(fallbackAt>keyAt);
  assert.ok(touchAt>fallbackAt);
  assert.ok(failureAt>touchAt);
  assert.match(source,/gameplayStartInput='KEYBOARD_DIGIT1'/);
  assert.match(source,/input:\{pass:true,qaMode:'REAL_GAME_FUNCTION_INPUT_AND_REAL_BROWSER_TOUCH',mobileInputObserved,canvasFocusedBeforeKeyboard:true,gameplayStartInput\}/);
});

test('Unity Web gameplay validation refocuses canvas before follow-up keyboard regression actions',()=>{
  assert.match(source,/await canvas\.focus\(\);\s*for\(let i=0;i<20/s);
  assert.match(source,/await canvas\.focus\(\);\s*await page\.keyboard\.press\('KeyR'\)/s);
});
