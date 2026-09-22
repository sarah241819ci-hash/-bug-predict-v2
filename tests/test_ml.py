"""
test_ml.py — Unit Tests for ML Engine, Strict Feature Contract, and SHAP Explainability
========================================================================================
Tests:
- Strict feature validation and ordering contract
- Missing feature detection
- NaN and Infinity detection
- XGBoost prediction output probability range [0.0, 1.0]
- Tree SHAP contribution calculation and direction
- Risk tier classification
- Model metadata and metrics artifacts
"""

import json
import math
import os
import numpy as np
import pytest

from api.ml import (
    build_model_features,
    calculate_shap_contributions,
    generate_recommendations,
    predict_risk,
    _LOADER,
    DEFAULT_FEATURE_NAMES
)


def test_model_artifacts_exist():
    here = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "api")
    assert os.path.exists(os.path.join(here, "defect_model.json"))
    assert os.path.exists(os.path.join(here, "model_features.json"))
    assert os.path.exists(os.path.join(here, "model_features.txt"))
    assert os.path.exists(os.path.join(here, "model_metrics.json"))
    assert os.path.exists(os.path.join(here, "model_metadata.json"))


def test_build_model_features_valid():
    sample_metrics = {
        "loc": 150,
        "cyclomatic_complexity": 8.0,
        "length": 320.0,
        "volume": 1600.0,
        "difficulty": 18.0,
        "int_fan_in": 3.0,
        "int_fan_out": 8.0,
        "num_operators": 120.0,
        "num_operands": 200.0,
        "branch_count": 10.0,
    }

    row_array, scaled_dict, feature_names = build_model_features(sample_metrics)

    assert row_array.shape == (1, 10)
    assert len(scaled_dict) == 10
    assert feature_names == DEFAULT_FEATURE_NAMES

    # All scaled values must be within [0.0, 1.0]
    for fname, val in scaled_dict.items():
        assert 0.0 <= val <= 1.0, f"Feature {fname} scaled value {val} out of bounds"


def test_missing_feature_detection():
    incomplete_metrics = {
        "loc": 100,
        "cyclomatic_complexity": 5.0,
        # missing all Halstead and Fan metrics
    }

    with pytest.raises(ValueError) as excinfo:
        build_model_features(incomplete_metrics)
    assert "Missing required features" in str(excinfo.value)


def test_nan_detection():
    nan_metrics = {
        "loc": 100,
        "cyclomatic_complexity": float("nan"),
        "length": 200.0,
        "volume": 800.0,
        "difficulty": 10.0,
        "int_fan_in": 2.0,
        "int_fan_out": 4.0,
        "num_operators": 80.0,
        "num_operands": 120.0,
        "branch_count": 6.0,
    }

    with pytest.raises(ValueError) as excinfo:
        build_model_features(nan_metrics)
    assert "is NaN" in str(excinfo.value)


def test_infinity_detection():
    inf_metrics = {
        "loc": 100,
        "cyclomatic_complexity": float("inf"),
        "length": 200.0,
        "volume": 800.0,
        "difficulty": 10.0,
        "int_fan_in": 2.0,
        "int_fan_out": 4.0,
        "num_operators": 80.0,
        "num_operands": 120.0,
        "branch_count": 6.0,
    }

    with pytest.raises(ValueError) as excinfo:
        build_model_features(inf_metrics)
    assert "is Infinity" in str(excinfo.value)


def test_predict_risk_from_code():
    code = """
def process_data(items, flags):
    out = []
    if not items:
        return out
    for item in items:
        if item.get('valid') and flags > 0:
            if item.get('priority'):
                out.append(item['value'] * 2)
            else:
                out.append(item['value'])
    return out
"""
    result = predict_risk(code=code, file_path="processor.py")

    assert "risk_score" in result
    assert "risk_level" in result
    assert "shap_contributions" in result
    assert "raw_metrics" in result
    assert "recommendations" in result

    # Risk score must be a calibrated probability in [0.0, 1.0]
    assert 0.0 <= result["risk_score"] <= 1.0
    assert result["risk_level"] in ("LOW", "MEDIUM", "HIGH")
    assert isinstance(result["recommendations"], list)


def test_tree_shap_contributions():
    sample_metrics = {
        "loc": 800,
        "cyclomatic_complexity": 22.0,
        "length": 1800.0,
        "volume": 12000.0,
        "difficulty": 45.0,
        "int_fan_in": 8.0,
        "int_fan_out": 20.0,
        "num_operators": 600.0,
        "num_operands": 1200.0,
        "branch_count": 28.0,
    }
    row_array, _, feature_names = build_model_features(sample_metrics)
    shap_factors, base_val = calculate_shap_contributions(row_array, feature_names)

    assert len(shap_factors) == 10
    assert isinstance(base_val, float)

    # Check that each factor has expected schema
    for factor in shap_factors:
        assert "feature" in factor
        assert "contribution" in factor
        assert factor["direction"] in ("INCREASES_RISK", "DECREASES_RISK")
