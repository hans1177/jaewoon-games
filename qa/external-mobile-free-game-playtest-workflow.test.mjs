import assert from 'node:assert/strict';
import fs from 'node:fs';

const file='.github/workflows/external-mobile-free-game-playtest.yml';
const text=fs.readFileSync(file,'utf8');
const count=value=>text.split(value).length-1;

assert.equal(count('name: Resolve rotating Google Play batch'),1);
assert.equal(count('name: Verify seed-derived commercial reference policy'),1);
assert.equal(count('name: Install and black-box playtest free mobile reference game'),1);
assert.equal(count('name: Distill runtime behavior into Unity implementation judgment'),1);
assert.equal(count('TRANSFORMATIVE_RECOMBINATION_INPUT=DERIVED_RUNTIME_FEATURES_ONLY'),1);
assert.match(text,/cron:\s*'43 \* \* \* \*'/);
assert.match(text,/-StartIndex \(\[int\]\$env:PLAYTEST_START_INDEX\)/);
assert.match(text,/\[int\]::TryParse\(\$maxRaw, \[ref\]\$max\)/);
assert.match(text,/\[int\]::TryParse\(\$requestedStart, \[ref\]\$parsedStart\)/);
assert.match(text,/PLAYTEST_MAX_GAMES=\$max/);
assert.match(text,/PLAYTEST_START_INDEX=\$start/);
assert.match(text,/OFFICIAL_GOOGLE_PLAY_ONLY/);
assert.match(text,/CODE_EXTRACTION_ALLOWED:\s*'NO'/);
assert(text.trimEnd().endsWith("Write-Host 'TRANSFORMATIVE_RECOMBINATION_INPUT=DERIVED_RUNTIME_FEATURES_ONLY'"));

console.log('PASS Google Play hourly workflow has one canonical rotating playtest chain');
