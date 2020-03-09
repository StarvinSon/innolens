# InnoLens Models

## 1. Prerequisites

Follow the instructions in `../../README.md`.

## 2. Install

No need to install.

## 3. Run

```shell
# Activate the virtual environment

python -m innolens_simulator ...
```

### 3.1. Useful Commands

Disable CUDA:
```shell
$env:CUDA_VISIBLE_DEVICES='-1'
```

Preprocess:
```shell
python -m innolens_models access_record preprocess --input ../simulator/simulation_result/inno_wing_access_records.csv --training-data ./preprocessed/inno_wing_access_records_training.csv --evaluation-data ./preprocessed/inno_wing_access_records_evaluation.csv --start-time "2019-09-01T00:00+08:00" --end-time "2019-12-01T00:00+08:00" --time-step "minutes=30"
```

Train:
```shell
python -m innolens_models access_record train --model-dir ./tensorflow_models/access_record_dnn_0 --training-data ./preprocessed/inno_wing_access_records_training.csv --evaluation-data ./preprocessed/inno_wing_access_records_evaluation.csv --evaluation-prediction ./access_record_evaluation_prediction.csv
```

Evaluate:
```shell
python -m innolens_models access_record evaluate --model-dir ./tensorflow_models/access_record_dnn_0 --data ./preprocessed/inno_wing_access_records_evaluation.csv --prediction ./access_record_evaluation_prediction.csv
```

## 4. Notes

## 4.1. File path

Make sure the provided file path is correct. Otherwise, TensorFlow may just exit the program without any message and stack trace.

## 4.2. TensorBoard

Use TensorBoard to monitor the training process.

```shell
# Activate the virtual environment

tensorboard --logdir ./tensorflow_models
```
