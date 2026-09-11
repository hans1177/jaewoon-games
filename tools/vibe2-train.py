# 파일명: tools/vibe2-train.py
import argparse
import hashlib
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
    parser.add_argument("--task-type", choices=("coding", "bugfix", "unity", "qa", "planning", "general"), default="general")
    parser.add_argument("--parent-adapter", default="")
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--max-length", type=int, default=2048)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=8)
    parser.add_argument(
        "--final-eval-only",
        action="store_true",
        help="Skip duplicate epoch evaluation/checkpointing and run one unchanged final evaluation.",
    )
    return parser.parse_args()


def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def stable_row(row):
    return json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def dataset_hash(rows):
    return hashlib.sha256("\n".join(stable_row(row) for row in rows).encode("utf-8")).hexdigest()


def validate_manifest(args, manifest, train_rows, eval_rows):
    if int(manifest.get("version", 0)) < 3:
        raise RuntimeError("dataset manifest v3 or newer is required")
    if manifest.get("readyForTraining") is not True:
        raise RuntimeError("dataset manifest is not readyForTraining")

    contamination = manifest.get("contamination") or {}
    if contamination.get("pass") is not True or float(contamination.get("contaminationRate", 1)) > 0:
        raise RuntimeError("contaminated dataset is forbidden")

    diversity = manifest.get("diversity") or {}
    if diversity.get("pass") is not True:
        raise RuntimeError("dataset diversity gate did not pass")
    batching = manifest.get("batching") or {}
    if batching.get("pass") is not True:
        raise RuntimeError("dataset batch gate did not pass")

    target_task_type = manifest.get("targetTaskType")
    if target_task_type and target_task_type != args.task_type:
        raise RuntimeError("trainer task type must match dataset targetTaskType")

    task_plan = manifest.get("taskTrainingPlan") or {}
    if target_task_type:
        target_plan = task_plan.get(target_task_type) or {}
        if target_plan.get("ready") is not True:
            raise RuntimeError("target task adapter is not ready for training")

    policy = manifest.get("policy") or {}
    if policy.get("teacherOnlyDifficult") is not True:
        raise RuntimeError("teacher-only-difficult policy must be enabled")

    stats = manifest.get("stats") or {}
    if stats.get("deprecatedUsed") is True:
        raise RuntimeError("deprecated/obsolete samples are forbidden")
    if int(stats.get("train", 0)) != len(train_rows) or int(stats.get("eval", 0)) != len(eval_rows):
        raise RuntimeError("dataset row counts do not match manifest")
    if dataset_hash(train_rows) != manifest.get("trainSha256"):
        raise RuntimeError("train dataset hash mismatch")
    if dataset_hash(eval_rows) != manifest.get("evalSha256"):
        raise RuntimeError("eval dataset hash mismatch")
    if int(stats.get("syntheticTrain", 0)) >= len(train_rows) and train_rows:
        raise RuntimeError("synthetic-only self-training is forbidden")
    if args.seed != int(manifest.get("seed", args.seed)):
        raise RuntimeError("trainer seed must match dataset manifest seed")

    for row in train_rows + eval_rows:
        qa = row.get("qa") or {}
        row_task_type = str(row.get("taskType") or "").lower()
        if qa.get("independentQa") != "PASS":
            raise RuntimeError("independent QA PASS is required")
        if row_task_type == "unity":
            if qa.get("runtime") != "PASS":
                raise RuntimeError("Unity Android/runtime PASS is required")
            if qa.get("browserQa") != "NOT_APPLICABLE":
                raise RuntimeError("Unity browser QA must be NOT_APPLICABLE")
            requirements = qa.get("requirements") or {}
            if requirements.get("androidRuntimeRequired") is not True:
                raise RuntimeError("Unity Android runtime requirement is missing")
            if row.get("synthetic") is not False:
                raise RuntimeError("Unity production training forbids synthetic rows")
            provenance = row.get("provenance") or {}
            if str(provenance.get("sourceKind") or "").lower() != "vibe2":
                raise RuntimeError("Unity production training requires verified Vibe2 source evidence")
        elif qa.get("browserQa") != "PASS":
            raise RuntimeError("browser QA PASS is required for non-Unity samples")
        if row.get("lifecycle") != "active":
            raise RuntimeError("inactive sample reached trainer")
        if float(row.get("qualityScore", 0)) < 0.75:
            raise RuntimeError("low-quality sample reached trainer")
        if target_task_type and row_task_type != target_task_type:
            raise RuntimeError("mixed task type reached task-specific trainer")


def main():
    args = parse_args()
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
    random.seed(args.seed)
    train_rows = load_jsonl(args.train)
    eval_rows = load_jsonl(args.eval)
    if not train_rows or not eval_rows:
        raise RuntimeError("train and eval datasets must both contain verified samples")
    manifest = json.loads(Path(args.dataset_manifest).read_text(encoding="utf-8"))
    validate_manifest(args, manifest, train_rows, eval_rows)

    import torch
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, Trainer, TrainingArguments

    torch.manual_seed(args.seed)
    use_cuda = torch.cuda.is_available()
    if use_cuda:
        torch.cuda.manual_seed_all(args.seed)
    if args.method == "qlora" and not use_cuda:
        raise RuntimeError("QLoRA requires a local CUDA GPU; paid remote runners are not used")
    cpu_practice_no_recompute = (
        args.final_eval_only
        and not use_cuda
        and manifest.get("authority") == "PRACTICE_ONLY"
        and manifest.get("practiceOnly") is True
    )
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    model_kwargs = {"trust_remote_code": True}
    if use_cuda:
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
    if not cpu_practice_no_recompute:
        model.gradient_checkpointing_enable()
    model = get_peft_model(
        model,
        LoraConfig(
            r=16,
            lora_alpha=32,
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        ),
    )

    def encode(row):
        instruction, user_input, answer = row["instruction"].strip(), row.get("input", "").strip(), row["output"].strip()
        user_text = instruction if not user_input else f"{instruction}\n\n입력:\n{user_input}"
        if getattr(tokenizer, "chat_template", None):
            prompt = tokenizer.apply_chat_template(
                [{"role": "user", "content": user_text}],
                tokenize=False,
                add_generation_prompt=True,
            )
            full = tokenizer.apply_chat_template(
                [{"role": "user", "content": user_text}, {"role": "assistant", "content": answer}],
                tokenize=False,
                add_generation_prompt=False,
            )
        else:
            prompt = f"### 지시\n{user_text}\n\n### 답변\n"
            full = f"### 지시\n{user_text}\n\n### 답변\n{answer}{tokenizer.eos_token or ''}"
        prompt_ids = tokenizer(prompt, add_special_tokens=False)["input_ids"]
        encoded = tokenizer(full, truncation=True, max_length=args.max_length, add_special_tokens=False)
        labels = list(encoded["input_ids"])
        masked = min(len(prompt_ids), len(encoded["input_ids"]))
        labels[:masked] = [-100] * masked
        supervised_tokens = sum(1 for label in labels if label != -100)
        if supervised_tokens == 0:
            sample_id = (
                (row.get("provenance") or {}).get("drillId")
                or row.get("sampleId")
                or row.get("id")
                or "UNKNOWN"
            )
            raise RuntimeError(
                f"answer tokens truncated completely before training: sample={sample_id}, max_length={args.max_length}"
            )
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
            features = [dict(item) for item in features]
            labels = [item.pop("labels") for item in features]
            batch = tokenizer.pad(features, padding=True, return_tensors="pt")
            max_len = batch["input_ids"].shape[1]
            batch["labels"] = torch.tensor(
                [label + [-100] * (max_len - len(label)) for label in labels],
                dtype=torch.long,
            )
            return batch

    train_dataset = JsonlDataset(train_rows)
    eval_dataset = JsonlDataset(eval_rows)

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
        eval_strategy="no" if args.final_eval_only else "epoch",
        save_strategy="no" if args.final_eval_only else "epoch",
        report_to=[],
        seed=args.seed,
        data_seed=args.seed,
        bf16=use_cuda and torch.cuda.is_bf16_supported(),
        fp16=use_cuda and not torch.cuda.is_bf16_supported(),
        remove_unused_columns=False,
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=Collator(),
    )
    train_result = trainer.train()
    eval_result = trainer.evaluate()
    losses = [float(train_result.metrics.get("train_loss", 0)), float(eval_result.get("eval_loss", 0))]
    if not all(value == value and abs(value) != float("inf") for value in losses):
        raise RuntimeError("non-finite loss: adapter is not saved")
    model.save_pretrained(output / "adapter")
    tokenizer.save_pretrained(output / "adapter")
    metadata = {
        "version": 3,
        "adapterVersion": args.adapter_version,
        "taskType": args.task_type,
        "baseModel": args.base_model,
        "method": args.method,
        "seed": args.seed,
        "parentAdapter": args.parent_adapter or None,
        "datasetVersion": manifest.get("version"),
        "datasetTrainSha256": manifest.get("trainSha256"),
        "datasetEvalSha256": manifest.get("evalSha256"),
        "datasetHoldoutSha256": manifest.get("holdoutSha256"),
        "datasetDiversity": manifest.get("diversity"),
        "datasetBatching": manifest.get("batching"),
        "contaminationRate": (manifest.get("contamination") or {}).get("contaminationRate"),
        "verifiedRealOnly": args.task_type == "unity",
        "finalEvalOnly": args.final_eval_only,
        "gradientCheckpointing": not cpu_practice_no_recompute,
        "trainMetrics": train_result.metrics,
        "evalMetrics": eval_result,
        "promotionState": "UNVERIFIED",
        "runtimePromotionAllowed": False,
        "requiredNextGate": "FIXED_HOLDOUT_AB_AND_CANARY",
    }
    (output / "training-metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(metadata, ensure_ascii=False))


if __name__ == "__main__":
    main()
