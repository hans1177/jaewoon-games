import importlib.util
from pathlib import Path
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
