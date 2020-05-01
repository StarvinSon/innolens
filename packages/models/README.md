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
# For history forecast (old) (**not working**)
python -m innolens_models history_forecast preprocess --input ../simulator/simulation_result/space_access_records/inno_wing.csv --space --training-data ./preprocessed/history_forecast/training.csv --evaluation-data ./preprocessed/history_forecast/evaluation.csv --start-time "2020-01-15T00:00+08:00" --end-time "2020-06-01T00:00+08:00"

# For access record
python -m innolens_models access_record preprocess --input ../simulator/simulation_result/inno_wing_access_records.csv --training-data ./preprocessed/inno_wing_access_records_training.csv --evaluation-data ./preprocessed/inno_wing_access_records_evaluation.csv --start-time "2019-09-01T00:00+08:00" --end-time "2020-06-01T00:00+08:00" --time-step "minutes=30" --space

# For user count
python -m innolens_models user_count preprocess --input ../simulator/simulation_result/inno_wing_access_records.csv --member-data ../simulator/simulation_result/members.csv --training-data ./preprocessed/inno_wing_user_count_training.csv --evaluation-data ./preprocessed/inno_wing_user_count_evaluation.csv --category-length ./preprocessed/inno_wing_user_count_category.csv --start-time "2019-09-01T00:00+08:00" --end-time "2020-06-01T00:00+08:00" --time-step "minutes=30"
```

Train:
```shell
# For history forecast (old) (**not working**)
python -m innolens_models history_forecast train --checkpoint-dir ./checkpoints/history_forecast --training-data ./preprocessed/history_forecast/training.csv --log-dir ./logs/history_forecast --ui

# For access causality
python -m innolens_models access_causality train --checkpoint-dir ./checkpoints/access_causality --training-data ./access_causality_sample_train.json --log-dir ./logs/access_causality --ui

# For history forecast
python -m innolens_models history_forecast train --checkpoint-dir ./checkpoints/history_forecast --training-data ./history_forecast_sample_train.json --log-dir ./logs/history_forecast --ui

# For access record
python -m innolens_models access_record train --model-dir ./tensorflow_models/access_record_dnn_0 --training-data ./preprocessed/inno_wing_access_records_training.csv --evaluation-data ./preprocessed/inno_wing_access_records_evaluation.csv --evaluation-prediction ./access_record_evaluation_prediction.csv

# For user count
python -m innolens_models user_count train --model-dir ./tensorflow_models/user_count_dnn_0 --training-data ./preprocessed/inno_wing_user_count_training.csv --category-length ./preprocessed/inno_wing_user_count_category.csv --evaluation-data ./preprocessed/inno_wing_user_count_evaluation.csv --evaluation-prediction ./access_user_count_prediction.csv
```

Evaluate:
```shell
# For member cluster
python -m innolens_models member_cluster cluster --data ./member_cluster_sample.json --ui

# For access causality
python -m innolens_models access_causality train --checkpoint-dir ./checkpoints/access_causality --evaluation-data ./access_causality_sample_train.json --log-dir ./logs/access_causality --ui

# For history forecast
python -m innolens_models history_forecast train --checkpoint-dir ./checkpoints/history_forecast --evaluation-data ./history_forecast_sample_train.json --log-dir ./logs/history_forecast --ui

# For access record
python -m innolens_models access_record evaluate --model-dir ./tensorflow_models/access_record_dnn_0 --data ./preprocessed/inno_wing_access_records_evaluation.csv --prediction ./access_record_evaluation_prediction.csv

# For user count
python -m innolens_models user_count evaluate --model-dir ./tensorflow_models/user_count_dnn_0 --data ./preprocessed/inno_wing_user_count_evaluation.csv --category-length ./preprocessed/inno_wing_user_count_category.csv --prediction ./access_user_count_prediction.csv
```


## 3.1. Server

```shell
python -m innolens_models serve
# Use -h to see more options
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

## 5. Related Tutorials

- https://joernhees.de/blog/2015/08/26/scipy-hierarchical-clustering-and-dendrogram-tutorial/
