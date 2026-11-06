import importlib.util
from pathlib import Path
import json
import tempfile
import types
import unittest

spec = importlib.util.spec_from_file_location('trainer', Path(__file__).parents[1] / 'tools/vibe2-train.py')
trainer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trainer)


class Tokenizer:
    chat_template = None
    eos_token_id = 100000

    def __call__(self, text, **kwargs):
        return {'input_ids': [ord(c) for c in text]}


class EncodingTest(unittest.TestCase):
    def test_windows_cpu_recovery_fails_closed_on_missing_or_mismatched_checkpoint(self):
        args = types.SimpleNamespace(
            base_model="Qwen/Qwen3-1.7B", adapter_version="practice-run-42",
            task_type="unity", method="lora", seed=7, epochs=1.0,
            learning_rate=2e-4, max_length=256, batch_size=1, grad_accum=1,
        )
        manifest = {"trainSha256": "a" * 64, "evalSha256": "b" * 64}
        identity = trainer.cpu_practice_identity(args, manifest)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            self.assertIsNone(trainer.validated_cpu_practice_checkpoint(out, identity, False))
            with self.assertRaisesRegex(RuntimeError, "no complete Trainer checkpoint"):
                trainer.validated_cpu_practice_checkpoint(out, identity, True)
            checkpoint = out / "checkpoints" / "checkpoint-16"
            checkpoint.mkdir(parents=True)
            (checkpoint / "trainer_state.json").write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "no complete Trainer checkpoint"):
                trainer.validated_cpu_practice_checkpoint(out, identity, True)
            (checkpoint / "optimizer.pt").write_bytes(b"complete-test-state")
            self.assertEqual(trainer.validated_cpu_practice_checkpoint(out, identity, True), str(checkpoint))
            with self.assertRaisesRegex(RuntimeError, "exact-input mismatch"):
                trainer.validated_cpu_practice_checkpoint(out, "0" * 64, True)
            with self.assertRaisesRegex(RuntimeError, "not fresh"):
                trainer.validated_cpu_practice_checkpoint(out, identity, False)
        with self.assertRaisesRegex(RuntimeError, "requires exact dataset SHA256"):
            trainer.cpu_practice_identity(args, {"trainSha256": "invalid", "evalSha256": "b" * 64})


    def test_complete_code_answer_once_even_when_prompt_exceeds_window(self):
        row = {'instruction': 'long requirement ' * 40, 'input': 'broken code ' * 15,
               'output': 'class Practice {\n' + 'int value = 1;\n' * 40 + 'return value; }'}
        windows, coverage = trainer.encode_answer_windows(Tokenizer(), row, 256)
        labels = [x for w in windows for x in w['labels'] if x != -100]
        self.assertEqual(labels, [ord(c) for c in row['output']] + [100000])
        self.assertEqual(coverage['supervisedAnswerTokens'], coverage['answerTokens'])
        self.assertGreater(len(windows), 1)
        for w in windows:
            self.assertLessEqual(len(w['input_ids']), 256)
            self.assertEqual(len(w['labels']), len(w['input_ids']))
            self.assertEqual(w['labels'][0], -100)
            self.assertTrue(any(x != -100 for x in w['labels']))

    def test_short_answer_masks_all_instruction_tokens(self):
        windows, _ = trainer.encode_answer_windows(Tokenizer(), {'instruction': 'repair', 'output': 'return true;'}, 256)
        self.assertEqual(len(windows), 1)
        self.assertEqual([x for x in windows[0]['labels'] if x != -100], [ord(c) for c in 'return true;'] + [100000])

    def test_chat_mode_disables_thinking_and_supervises_only_the_implementation(self):
        class ChatTokenizer(Tokenizer):
            chat_template = 'template'
            def apply_chat_template(self, messages, **kwargs):
                assert kwargs['enable_thinking'] is False
                return '<user>' + messages[0]['content'] + '<assistant>'
        windows, _ = trainer.encode_answer_windows(ChatTokenizer(), {'instruction': 'repair', 'output': 'fixed'}, 64)
        self.assertEqual([x for w in windows for x in w['labels'] if x != -100], [ord(c) for c in 'fixed'] + [100000])

    def test_empty_target_and_impossible_window_fail(self):
        with self.assertRaises(RuntimeError):
            trainer.encode_answer_windows(Tokenizer(), {'instruction': 'repair', 'output': ''}, 256)
        with self.assertRaises(RuntimeError):
            trainer.encode_answer_windows(Tokenizer(), {'instruction': 'repair', 'output': 'fixed'}, 8)


if __name__ == '__main__':
    unittest.main()
