"""
test_ml_experiments.py — Unit & Integration tests for ML experiments, baselines, and artifacts
"""

import json
import os
import numpy as np
import pytest

_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, ".."))
_API_DIR = os.path.join(_PROJECT_ROOT, "api")


def test_model_experiments_json_structure():
    """Verify that model_experiments.json exists and contains complete experimental records."""
    exp_path = os.path.join(_API_DIR, "model_experiments.json")
    assert os.path.exists(exp_path), "api/model_experiments.json must exist"

    with open(exp_path, "r") as f:
        data = json.load(f)

    required_keys = [
        "dataset_info",
        "baseline_models_cv",
        "class_weight_experiments_cv",
        "hyperparameter_experiments_cv",
        "feature_ablation_experiments_cv",
        "feature_importance",
        "threshold_analysis_dev",
        "calibration_analysis_dev",
        "final_model_configuration",
        "final_holdout_test_metrics",
    ]
    for key in required_keys:
        assert key in data, f"Missing required experiment key: {key}"

    # Check baselines
    baselines = data["baseline_models_cv"]
    assert len(baselines) >= 4, "Must record at least Dummy, Logistic, Random Forest, and XGBoost baselines"

    # Check calibration
    assert "uncalibrated_brier_score" in data["calibration_analysis_dev"]
    assert 0.0 <= data["calibration_analysis_dev"]["uncalibrated_brier_score"] <= 1.0


def test_model_artifact_consistency():
    """Verify consistency across all model artifacts (JSON, TXT, METRICS, METADATA)."""
    model_path = os.path.join(_API_DIR, "defect_model.json")
    feat_txt_path = os.path.join(_API_DIR, "model_features.txt")
    feat_json_path = os.path.join(_API_DIR, "model_features.json")
    metrics_path = os.path.join(_API_DIR, "model_metrics.json")
    meta_path = os.path.join(_API_DIR, "model_metadata.json")

    assert os.path.exists(model_path)
    assert os.path.exists(feat_txt_path)
    assert os.path.exists(feat_json_path)
    assert os.path.exists(metrics_path)
    assert os.path.exists(meta_path)

    with open(feat_txt_path, "r") as f:
        txt_feats = [x.strip() for x in f.read().split(",") if x.strip()]

    with open(feat_json_path, "r") as f:
        json_feats_doc = json.load(f)
        json_feats = [x["name"] for x in json_feats_doc["features"]]

    with open(metrics_path, "r") as f:
        metrics_doc = json.load(f)

    with open(meta_path, "r") as f:
        meta_doc = json.load(f)

    assert txt_feats == json_feats, "Feature names in TXT and JSON must match exactly"
    assert len(txt_feats) == 10, "Schema must contain exactly 10 features"
    assert metrics_doc["feature_names"] == txt_feats
    assert meta_doc["features"] == txt_feats


def test_feature_distributions_validity():
    """Verify that dataset features have valid statistical bounds (min <= median <= max)."""
    feat_json_path = os.path.join(_API_DIR, "model_features.json")
    with open(feat_json_path, "r") as f:
        json_feats_doc = json.load(f)

    for feat in json_feats_doc["features"]:
        stats = feat["stats"]
        assert stats["min"] <= stats["median"] <= stats["max"]
        assert stats["min"] >= 0.0
        assert stats["max"] <= 1.0
        assert stats["std"] > 0.0


def test_threshold_selection_sanity():
    """Verify that decision threshold is within a valid probability range."""
    meta_path = os.path.join(_API_DIR, "model_metadata.json")
    with open(meta_path, "r") as f:
        meta_doc = json.load(f)

    assert "decision_threshold" in meta_doc
    thresh = meta_doc["decision_threshold"]
    assert 0.05 <= thresh <= 0.95, f"Decision threshold {thresh} is out of realistic range"
