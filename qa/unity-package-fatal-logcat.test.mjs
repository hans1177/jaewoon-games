import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const helper='tools/unity-package-fatal-logcat.py';
const run=(text,pkg='com.jaewoongames.test')=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'unity-fatal-'));
  const file=path.join(dir,'logcat.txt');
  fs.writeFileSync(file,text);
  const r=spawnSync('python3',[helper,file,pkg],{encoding:'utf8'});
  fs.rmSync(dir,{recursive:true,force:true});
  return r;
};

test('unrelated Android system crash is not attributed to game package',()=>{
  const r=run([
    'F libc : Fatal signal 6 (SIGABRT), code -1 in tid 2187 (bluetooth@1.1-se)',
    'I crash_dump64: performing dump of process 2157',
    'F DEBUG : Cmdline: com.android.bluetooth',
    'I ActivityManager: Process com.android.bluetooth (pid 2157) has died'
  ].join('\n'));
  assert.equal(r.status,0);
  assert.match(r.stdout,/PACKAGE_FATAL=false/);
});

test('Java fatal exception for exact game package is detected',()=>{
  const r=run([
    'E AndroidRuntime: FATAL EXCEPTION: main',
    'E AndroidRuntime: Process: com.jaewoongames.test, PID: 1234',
    'E AndroidRuntime: java.lang.RuntimeException: boom'
  ].join('\n'));
  assert.equal(r.status,1);
  assert.match(r.stdout,/PACKAGE_FATAL=true/);
});

test('native fatal signal with exact game Cmdline is detected',()=>{
  const r=run([
    'F libc : Fatal signal 11 (SIGSEGV), code 1 in tid 7777',
    'I crash_dump64: performing dump of process 7770',
    'F DEBUG : Cmdline: com.jaewoongames.test',
    'F DEBUG : #00 pc 00000000 libunity.so'
  ].join('\n'));
  assert.equal(r.status,1);
});

test('direct ANR for exact game package is detected',()=>{
  const r=run('E ActivityManager: ANR in com.jaewoongames.test\n');
  assert.equal(r.status,1);
});
