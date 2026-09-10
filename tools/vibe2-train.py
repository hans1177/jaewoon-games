# 파일명: tools/vibe2-train.py
import argparse
import json
import os
import random
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Vibe2 Qwen LoRA/QLoRA trainer")
    parser.add_argument("--train", required=True)
    parser.add_argument("--eval", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--base-model", default="Qwen/Qwen3-1.7B")
    parser.add_argument("--method", choices=("lora", "qlora"), default="lora")
    parser.add_argument("--seed", type=int, default=20260910)
    parser.add_argument("--adapter-version", required=True)
    parser.add_argument("--dataset-manifest", required=True)
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--max-length", type=int, default=2048)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=8)
    return parser.parse_args()


def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def main():
    args = parse_args()
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    random.seed(args.seed)

    import torch
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, Trainer, TrainingArguments

    if args.method == "qlora" and not torch.cuda.is_available():
        raise RuntimeError("QLoRA requires a local CUDA GPU; paid remote runners are not used")

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token

    model_kwargs = {"trust_remote_code": True}
    if torch.cuda.is_available():
        model_kwargs["device_map"] = "auto"
        model_kwargs["torch_dtype"] = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    if args.method == "qlora":
        model_kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        )

    model = AutoModelForCausalLM.from_pretrained(args.base_model, **model_kwargs)
    if args.method == "qlora":
        model = prepare_model_for_kbit_training(model)
    model.config.use_cache = False
    model.gradient_checkpointing_enable()
    lora = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora)

    def encode(row):
        instruction = row["instruction"].strip()
        user_input = row.get("input", "").strip()
        answer = row["output"].strip()
        user_text = instruction if not user_input else f"{instruction}\n\n입력:\n{user_input}"
        if getattr(tokenizer, "chat_template", None):
            prompt = tokenizer.apply_chat_template(
                [{"role": "user", "content": user_text}], tokenize=False, add_generation_prompt=True
            )
            full = tokenizer.apply_chat_template(
                [{"role": "user", "content": user_text}, {"role": "assistant", "content": answer}],
                tokenize=False,
                add_generation_prompt=False,
            )
        else:
            prompt = f"### 지시\n{user_text}\n\n### 답변\n"
            full = prompt + answer + (tokenizer.eos_token or "")
        prompt_ids = tokenizer(prompt, add_special_tokens=False)["input_ids"]
        encoded = tokenizer(full, truncation=True, max_length=args.max_length, add_special_tokens=False)
        labels = list(encoded["input_ids"])
        masked = min(len(prompt_ids), len(labels))
        labels[:masked] = [-100] * masked
        encoded["labels"] = labels
        return encoded

    class JsonlDataset(torch.utils.data.Dataset):
        def __init__(self, rows):
            self.rows = [encode(row) for row in rows]

        def __len__(self):
            return len(self.rows)

        def __getitem__(self, index):
            return self.rows[index]

    class Collator:
        def __call__(self, features):
            labels = [item.pop("labels") for item in features]
            batch = tokenizer.pad(features, padding=True, return_tensors="pt")
            max_len = batch["input_ids"].shape[1]
            padded_labels = [label + [-100] * (max_len - len(label)) for label in labels]
            batch["labels"] = torch.tensor(padded_labels, dtype=torch.long)
            return batch

    train_rows = load_jsonl(args.train)
    eval_rows = load_jsonl(args.eval)
    if not train_rows or not eval_rows:
        raise RuntimeError("train and eval datasets must both contain verified samples")

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    training_args = TrainingArguments(
        output_dir=str(output / "checkpoints"),
        num_train_epochs=args.epochs,
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        logging_steps=5,
        eval_strategy="epoch",
        save_strategy="epoch",
        report_to=[],
        seed=args.seed,
        data_seed=args.seed,
        bf16=torch.cuda.is_available() and torch.cuda.is_bf16_supported(),
        fp16=torch.cuda.is_available() and not torch.cuda.is_bf16_supported(),
        remove_unused_columns=False,
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=JsonlDataset(train_rows),
        eval_dataset=JsonlDataset(eval_rows),
        data_collator=Collator(),
    )
    train_result = trainer.train()
    eval_result = trainer.evaluate()
    model.save_pretrained(output / "adapter")
    tokenizer.save_pretrained(output / "adapter")

    manifest = json.loads(Path(args.dataset_manifest).read_text(encoding="utf-8"))
    metadata = {
        "version": 1,
        "adapterVersion": args.adapter_version,
        "baseModel": args.base_model,
        "method": args.method,
        "seed": args.seed,
        "datasetVersion": manifest.get("version"),
        "datasetTrainSha256": manifest.get("trainSha256"),
        "datasetEvalSha256": manifest.get("evalSha256"),
        "trainMetrics": train_result.metrics,
        "evalMetrics": eval_result,
        "promotionState": "UNVERIFIED",
        "runtimePromotionAllowed": False,
    }
    (output / "training-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False))


if __name__ == "__main__":
    main()
