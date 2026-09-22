"""
ml.py — Bug Predict Machine Learning & Prediction Engine
========================================================
Handles:
- Genuine static code metric analysis
- Strict feature schema contract validation
- Model-based XGBoost defect risk prediction
- Tree SHAP feature explainability & risk contribution attribution
- Metric-driven developer recommendations
"""

import json
import math
import os
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import xgboost as xgb

from .static_analyzer import analyze_source_code, detect_language

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_HERE, "defect_model.json")
_FEATURES_TXT_PATH = os.path.join(_HERE, "model_features.txt")
_FEATURES_JSON_PATH = os.path.join(_HERE, "model_features.json")
_METRICS_PATH = os.path.join(_HERE, "model_metrics.json")
_METADATA_PATH = os.path.join(_HERE, "model_metadata.json")

# Default feature order (fallback if file is missing)
DEFAULT_FEATURE_NAMES = [
    "LOC",
    "CYCLO",
    "LENGTH",
    "VOLUME",
    "DIFFICULTY",
    "INT_FAN_IN",
    "INT_FAN_OUT",
    "NUM_OPERATORS",
    "NUM_OPERANDS",
    "BRANCH_COUNT",
]

# Standard reference scaling bounds to map measured code metrics to the [0.0, 1.0] Kaggle dataset space
DEFAULT_SCALING_BOUNDS = {
    "LOC": {"min": 0.0, "max": 1500.0, "desc": "Lines of Code"},
    "CYCLO": {"min": 1.0, "max": 25.0, "desc": "McCabe Cyclomatic Complexity v(G)"},
    "LENGTH": {"min": 0.0, "max": 3000.0, "desc": "Halstead Total Program Length (N)"},
    "VOLUME": {"min": 0.0, "max": 25000.0, "desc": "Halstead Program Volume (V)"},
    "DIFFICULTY": {"min": 0.0, "max": 100.0, "desc": "Halstead Difficulty (D)"},
    "INT_FAN_IN": {"min": 0.0, "max": 15.0, "desc": "Internal Definitions / Entry Points"},
    "INT_FAN_OUT": {"min": 0.0, "max": 25.0, "desc": "Function / Method Invocations"},
    "NUM_OPERATORS": {"min": 0.0, "max": 800.0, "desc": "Total Operator Count (N1)"},
    "NUM_OPERANDS": {"min": 0.0, "max": 800.0, "desc": "Total Operand Count (N2)"},
    "BRANCH_COUNT": {"min": 0.0, "max": 30.0, "desc": "Decision Branch Count"},
}


class ModelLoader:
    """Loads and caches XGBoost model and feature schema."""

    def __init__(self) -> None:
        self.bst: Optional[xgb.XGBClassifier] = None
        self.expected_features: List[str] = []
        self.feature_schema: Dict[str, Any] = {}
        self.scaling_bounds: Dict[str, Dict[str, float]] = {}
        self.load_model()

    def load_model(self) -> None:
        # 1. Load feature names
        if os.path.exists(_FEATURES_TXT_PATH):
            with open(_FEATURES_TXT_PATH, "r") as fh:
                self.expected_features = [f.strip() for f in fh.read().split(",") if f.strip()]
        else:
            self.expected_features = list(DEFAULT_FEATURE_NAMES)

        # 2. Load feature schema & scaling bounds
        if os.path.exists(_FEATURES_JSON_PATH):
            with open(_FEATURES_JSON_PATH, "r") as fh:
                self.feature_schema = json.load(fh)
                self.scaling_bounds = self.feature_schema.get("reference_scaling", DEFAULT_SCALING_BOUNDS)
        else:
            self.scaling_bounds = DEFAULT_SCALING_BOUNDS

        # 3. Load XGBoost model
        if os.path.exists(_MODEL_PATH):
            try:
                self.bst = xgb.XGBClassifier()
                self.bst.load_model(_MODEL_PATH)
            except Exception as e:
                print(f"Warning: Failed to load defect_model.json: {e}")
                self.bst = None
        else:
            print("Warning: defect_model.json not found. Run api.train_model first.")
            self.bst = None


_LOADER = ModelLoader()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Strict Feature Contract & Validation
# ─────────────────────────────────────────────────────────────────────────────

def build_model_features(raw_metrics: Dict[str, Any]) -> Tuple[np.ndarray, Dict[str, float], List[str]]:
    """Strict feature contract that validates, normalizes, and constructs the 10-feature vector.
    
    Returns:
    - row_array: numpy 2D array of shape (1, 10) with normalized values in exact feature order.
    - scaled_dict: dictionary of {feature_name: normalized_value}.
    - feature_names: ordered list of feature names.
    
    Raises:
    - ValueError: if required features are missing, non-numeric, NaN, or infinite.
    """
    expected = _LOADER.expected_features or DEFAULT_FEATURE_NAMES
    scaling = _LOADER.scaling_bounds or DEFAULT_SCALING_BOUNDS

    # Normalize key mapping from snake_case to uppercase Kaggle schema
    key_mapping = {
        "loc": "LOC",
        "LOC": "LOC",
        "cyclomatic_complexity": "CYCLO",
        "CYCLO": "CYCLO",
        "cyclo": "CYCLO",
        "length": "LENGTH",
        "LENGTH": "LENGTH",
        "volume": "VOLUME",
        "VOLUME": "VOLUME",
        "difficulty": "DIFFICULTY",
        "DIFFICULTY": "DIFFICULTY",
        "int_fan_in": "INT_FAN_IN",
        "INT_FAN_IN": "INT_FAN_IN",
        "int_fan_out": "INT_FAN_OUT",
        "INT_FAN_OUT": "INT_FAN_OUT",
        "num_operators": "NUM_OPERATORS",
        "NUM_OPERATORS": "NUM_OPERATORS",
        "num_operands": "NUM_OPERANDS",
        "NUM_OPERANDS": "NUM_OPERANDS",
        "branch_count": "BRANCH_COUNT",
        "BRANCH_COUNT": "BRANCH_COUNT",
    }

    # Extract raw values
    extracted_raw: Dict[str, float] = {}
    for k, v in raw_metrics.items():
        if k in key_mapping:
            target_key = key_mapping[k]
            try:
                val = float(v)
            except (ValueError, TypeError):
                raise ValueError(f"Feature '{target_key}' has non-numeric value: {v}")

            if math.isnan(val):
                raise ValueError(f"Feature '{target_key}' is NaN. Invalid numeric input.")
            if math.isinf(val):
                raise ValueError(f"Feature '{target_key}' is Infinity. Invalid numeric input.")

            extracted_raw[target_key] = val

    # Verify all expected model features exist
    missing = [f for f in expected if f not in extracted_raw]
    if missing:
        raise ValueError(
            f"Prediction could not be performed because the extracted feature schema does not match the trained model. "
            f"Missing required features: {missing}"
        )

    # Scale raw values using documented reference bounds to match the [0.0, 1.0] training space
    scaled_dict: Dict[str, float] = {}
    row_values: List[float] = []

    for fname in expected:
        raw_val = extracted_raw[fname]
        b = scaling.get(fname, {"min": 0.0, "max": 1.0})
        b_min = float(b.get("min", 0.0))
        b_max = float(b.get("max", 1.0))

        if b_max > b_min:
            scaled = (raw_val - b_min) / (b_max - b_min)
        else:
            scaled = raw_val

        # Clip into valid [0.0, 1.0] range
        scaled = float(np.clip(scaled, 0.0, 1.0))
        scaled_dict[fname] = scaled
        row_values.append(scaled)

    row_array = np.array([row_values], dtype=np.float32)
    return row_array, scaled_dict, expected


# ─────────────────────────────────────────────────────────────────────────────
# 2. Prediction & Model Explainability (SHAP / Tree Contributions)
# ─────────────────────────────────────────────────────────────────────────────

def calculate_shap_contributions(row_array: np.ndarray, feature_names: List[str]) -> Tuple[List[Dict[str, Any]], float]:
    """Calculates exact Tree SHAP feature contributions using the trained XGBoost booster.
    
    Returns:
    - contributions: list of {'feature': name, 'contribution': float, 'direction': 'INCREASES_RISK' | 'DECREASES_RISK'}
    - base_value: bias/base value of the model in margin space.
    """
    if _LOADER.bst is None:
        return [], 0.0

    try:
        booster = _LOADER.bst.get_booster()
        dm = xgb.DMatrix(row_array, feature_names=feature_names)
        contribs = booster.predict(dm, pred_contribs=True)[0]
        # Last element is the base_value (bias)
        feat_contribs = contribs[:-1]
        base_value = float(contribs[-1])

        results = []
        for fname, val in zip(feature_names, feat_contribs):
            val_float = float(val)
            results.append({
                "feature": fname,
                "contribution": val_float,
                "direction": "INCREASES_RISK" if val_float > 0 else "DECREASES_RISK",
            })

        # Sort by absolute magnitude descending
        results.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        return results, base_value
    except Exception as e:
        print(f"Warning: Failed to compute Tree SHAP contributions: {e}")
        return [], 0.0


def generate_recommendations(raw_metrics: Dict[str, Any], top_risk_factors: List[Dict[str, Any]]) -> List[str]:
    """Generates concrete developer recommendations strictly based on measured metrics."""
    recs = []
    cyclo = raw_metrics.get("cyclomatic_complexity", raw_metrics.get("CYCLO", 1.0))
    loc = raw_metrics.get("loc", raw_metrics.get("LOC", 0))
    branch_count = raw_metrics.get("branch_count", raw_metrics.get("BRANCH_COUNT", 0))
    difficulty = raw_metrics.get("difficulty", raw_metrics.get("DIFFICULTY", 0))
    fan_out = raw_metrics.get("int_fan_out", raw_metrics.get("INT_FAN_OUT", 0))

    if cyclo > 15:
        recs.append(f"Refactor deeply nested conditional branches (Cyclomatic Complexity is {cyclo:.1f}, exceeding safe threshold of 10).")
    elif cyclo > 8:
        recs.append(f"Consider breaking complex logic into smaller helper functions (Complexity: {cyclo:.1f}).")

    if loc > 400:
        recs.append(f"Split this file into smaller, modular components (Current size is {loc} lines).")
    elif loc > 200:
        recs.append(f"Review module responsibilities to prevent file bloat (Current size: {loc} lines).")

    if branch_count > 20:
        recs.append(f"Implement branch-coverage unit tests to verify all {int(branch_count)} decision paths.")

    if difficulty > 30:
        recs.append(f"Simplify operator-to-operand ratios (Halstead Difficulty is {difficulty:.1f}).")

    if fan_out > 15:
        recs.append(f"Reduce external coupling and dependency calls (Fan-Out is {int(fan_out)}).")

    if not recs:
        recs.append("Maintain existing unit test coverage and review for edge cases during pull request reviews.")

    return recs[:3]


def analyze_code_complexity(code: str, file_path: str = "") -> Dict[str, Any]:
    """Analyzes source code and returns genuine software metrics.
    Preserves backward compatibility with existing codebase callers."""
    return analyze_source_code(code, file_path)


def predict_risk(metrics: Optional[Dict[str, Any]] = None, code: Optional[str] = None, file_path: str = "") -> Dict[str, Any]:
    """Full-pipeline risk prediction:
    1. Extracts genuine metrics from code if code is supplied.
    2. Builds and validates the strict 10-feature vector.
    3. Runs XGBoost prediction to compute defect probability.
    4. Calculates Tree SHAP feature contributions for explainability.
    5. Returns transparent risk level, evidence, and recommendations.
    """
    # 1. If code is supplied, extract genuine metrics
    if code is not None:
        raw_metrics = analyze_source_code(code, file_path)
    elif metrics is not None:
        raw_metrics = dict(metrics)
    else:
        raise ValueError("Either 'code' or 'metrics' must be provided to predict_risk.")

    # 2. Build and validate features
    try:
        row_array, scaled_dict, expected_features = build_model_features(raw_metrics)
    except ValueError as e:
        print(f"Feature Contract Error: {e}")
        # Return graceful failure response
        return {
            "risk_score": 0.50,
            "risk_level": "MEDIUM",
            "raw_metrics": raw_metrics,
            "scaled_features": {},
            "shap_contributions": [],
            "top_risk_factors": [],
            "top_reducing_factors": [],
            "recommendations": ["Unable to extract complete metric schema for this file."],
            "error": str(e),
        }

    # 3. Model Prediction
    risk_score = 0.50
    if _LOADER.bst is not None:
        try:
            proba = _LOADER.bst.predict_proba(row_array)[0][1]
            risk_score = float(proba)
        except Exception:
            try:
                dm = xgb.DMatrix(row_array, feature_names=expected_features)
                proba = _LOADER.bst.get_booster().predict(dm)[0]
                risk_score = float(proba)
            except Exception as e:
                print(f"XGBoost Prediction Error: {e}")
                risk_score = 0.50

    # Ensure risk_score is within [0.0, 1.0]
    risk_score = float(np.clip(risk_score, 0.0, 1.0))

    # 4. Transparent Risk Tiers (Configurable and Documented)
    # LOW: < 40%, MEDIUM: 40% - 69%, HIGH: >= 70%
    if risk_score >= 0.70:
        risk_level = "HIGH"
    elif risk_score >= 0.40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # 5. SHAP Feature Contributions
    shap_contribs, base_val = calculate_shap_contributions(row_array, expected_features)
    top_risk_factors = [c for c in shap_contribs if c["direction"] == "INCREASES_RISK"][:3]
    top_reducing_factors = [c for c in shap_contribs if c["direction"] == "DECREASES_RISK"][:3]

    # 6. Actionable recommendations based on real metrics
    recommendations = generate_recommendations(raw_metrics, top_risk_factors)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "raw_metrics": raw_metrics,
        "scaled_features": scaled_dict,
        "shap_contributions": shap_contribs,
        "top_risk_factors": top_risk_factors,
        "top_reducing_factors": top_reducing_factors,
        "recommendations": recommendations,
    }
