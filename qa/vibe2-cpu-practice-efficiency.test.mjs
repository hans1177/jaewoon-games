// 파일명: qa/vibe2-cpu-practice-efficiency.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const trainer = fs.readFileSync('tools/vibe2-train.py', 'utf8');

test('CPU PRACTICE_ONLY fast path removes only accuracy-neutral overhead', () => {
  assert.match(trainer, /cpu_practice_fast_path/);
  assert.match(trainer, /manifest\.get\("authority"\) == "PRACTICE_ONLY"/);
  assert.match(trainer, /manifest\.get\("practiceOnly"\) is True/);
  assert.match(trainer, /eval_strategy="no" if cpu_practice_fast_path else "epoch"/);
  assert.match(trainer, /save_strategy="no" if cpu_practice_fast_path else "epoch"/);
  assert.match(trainer, /if not cpu_practice_fast_path:\n        model\.gradient_checkpointing_enable\(\)/);
  assert.match(trainer, /train_result = trainer\.train\(\)\n    eval_result = trainer\.evaluate\(\)/);
  assert.match(trainer, /"singleFinalEval": cpu_practice_fast_path/);
});

test('training objective and LoRA capacity remain unchanged', () => {
  assert.match(trainer, /r=16/);
  assert.match(trainer, /lora_alpha=32/);
  assert.match(trainer, /lora_dropout=0\.05/);
  assert.match(trainer, /learning_rate=args\.learning_rate/);
  assert.match(trainer, /num_train_epochs=args\.epochs/);
});
