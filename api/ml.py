import numpy as np
import pandas as pd
import xgboost as xgb
from radon.complexity import cc_visit

import os
import numpy as np
import pandas as pd
import xgboost as xgb

# Load the genuinely trained XGBoost model from the Kaggle dataset
_model_path = os.path.join(os.path.dirname(__file__), 'defect_model.json')
_features_path = os.path.join(os.path.dirname(__file__), 'model_features.txt')

_bst = xgb.XGBClassifier()
if os.path.exists(_model_path):
    _bst.load_model(_model_path)
    with open(_features_path, 'r') as f:
        _expected_features = f.read().split(',')
else:
    print("Warning: defect_model.json not found. Run train_model.py first.")
    _expected_features = []

def analyze_code_complexity(code: str) -> dict:
    """Calculates LOC and a heuristic-based cyclomatic complexity for all languages."""
    lines = code.splitlines()
    loc = len(lines)
    
    # Heuristic cyclomatic complexity (count branches, loops, conditionals)
    branch_keywords = ["if ", "else", "switch", "case", "for ", "while ", "catch", "=>", "?", "&&", "||"]
    complexity_score = 1.0
    
    for line in lines:
        line_clean = line.strip().lower()
        if not line_clean.startswith("//") and not line_clean.startswith("#"):
            for kw in branch_keywords:
                if kw in line_clean:
                    complexity_score += 1.0

    avg_cc = min(max(1.0, complexity_score / max(1, loc / 20)), 50.0)
        
    return {
        "loc": loc,
        "cyclomatic_complexity": avg_cc
    }

def predict_risk(metrics: dict) -> float:
    """Uses the trained XGBoost model to predict defect probability."""
    if not _expected_features:
        return 0.5 # Fallback if model isn't loaded

    loc = float(metrics.get('loc', 10))
    v_g = float(metrics.get('cyclomatic_complexity', 1.0))
    
    # Map to Kaggle dataset features (JM1/PC1 metrics)
    # The dataset uses Halstead metrics which we impute based on loc and v(g) if missing
    n = loc * 5.0
    v = n * 5.0
    l_val = max(0.01, 2.0 / max(1, v))
    d = 1.0 / l_val
    
    feature_values = {
        'LOC': loc,
        'CYCLO': v_g,
        'LENGTH': n,
        'VOLUME': v,
        'DIFFICULTY': d,
        'INT_FAN_IN': max(0.0, v_g - 1),
        'INT_FAN_OUT': max(0.0, v_g - 1),
        'NUM_OPERATORS': n * 0.6,
        'NUM_OPERANDS': n * 0.4,
        'BRANCH_COUNT': v_g * 2
    }
    
    # Build dataframe in exact order expected by the model
    row = {feat: feature_values.get(feat, 0.0) for feat in _expected_features}
    features = pd.DataFrame([row])
    
    proba = _bst.predict_proba(features)[0][1]
    return float(proba)
