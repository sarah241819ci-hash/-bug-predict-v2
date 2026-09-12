"""
train_model.py — Bug Predict ML Training Pipeline
===================================================
Dataset : SoftwareDefectDataset.csv (Kaggle: ziya07/software-defect-prediction-dataset)
Target  : DEFECT_LABEL (binary: 0=no defect, 1=defect)
Model   : XGBoost binary classifier
Output  : api/defect_model.json  +  api/model_features.txt

Run with:
    uv run python -m api.train_model
or locally:
    python train_model.py
"""

import os
import sys

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

# ── Paths ──────────────────────────────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(_HERE, "data", "SoftwareDefectDataset.csv")
MODEL_PATH   = os.path.join(_HERE, "defect_model.json")
FEATURES_PATH = os.path.join(_HERE, "model_features.txt")

TARGET_COL = "DEFECT_LABEL"


def train_model() -> None:
    print("=" * 60)
    print("Bug Predict — XGBoost Training Pipeline")
    print("=" * 60)

    # ── 1. Load dataset ────────────────────────────────────────────
    if not os.path.exists(DATASET_PATH):
        print(f"ERROR: Dataset not found at {DATASET_PATH}")
        print("Place SoftwareDefectDataset.csv in api/data/ and re-run.")
        sys.exit(1)

    print(f"\n[1] Loading dataset from: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)
    print(f"    Rows: {len(df)}, Columns: {list(df.columns)}")

    # ── 2. Inspect & validate ──────────────────────────────────────
    assert TARGET_COL in df.columns, f"Target column '{TARGET_COL}' not found. Found: {df.columns.tolist()}"

    # Handle PROMISE-style '?' missing values
    df = df.replace("?", pd.NA).dropna()
    print(f"    After dropping NA rows: {len(df)}")

    print(f"\n[2] Target distribution ('{TARGET_COL}'):")
    dist = df[TARGET_COL].value_counts()
    print(f"    Class 0 (no defect) : {dist.get(0, 0)}")
    print(f"    Class 1 (defect)    : {dist.get(1, 0)}")
    neg, pos = dist.get(0, 1), dist.get(1, 1)
    scale_pos_weight = neg / pos  # XGBoost class imbalance handling

    # ── 3. Features ────────────────────────────────────────────────
    X = df.drop(columns=[TARGET_COL]).astype(float)
    y = df[TARGET_COL].astype(int)
    feature_names = list(X.columns)

    print(f"\n[3] Features ({len(feature_names)}):")
    for f in feature_names:
        print(f"    - {f}")

    # ── 4. Train / test split ──────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n[4] Train: {len(X_train)} samples | Test: {len(X_test)} samples")

    # ── 5. Train XGBoost ───────────────────────────────────────────
    print("\n[5] Training XGBoost classifier...")
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,   # handles class imbalance
        eval_metric="logloss",
        random_state=42,
        use_label_encoder=False,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )
    print("    Training complete.")

    # ── 6. Evaluate ────────────────────────────────────────────────
    print("\n[6] Evaluation on held-out test set:")
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc       = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall    = recall_score(y_test, y_pred, zero_division=0)
    f1        = f1_score(y_test, y_pred, zero_division=0)
    roc_auc   = roc_auc_score(y_test, y_proba)

    print(f"    Accuracy  : {acc:.4f}")
    print(f"    Precision : {precision:.4f}")
    print(f"    Recall    : {recall:.4f}")
    print(f"    F1        : {f1:.4f}")
    print(f"    ROC-AUC   : {roc_auc:.4f}")
    print("\n    Full Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["No Defect", "Defect"]))

    # ── 7. Save model & features ───────────────────────────────────
    model.save_model(MODEL_PATH)
    with open(FEATURES_PATH, "w") as fh:
        fh.write(",".join(feature_names))

    print(f"\n[7] Model saved  -> {MODEL_PATH}")
    print(f"    Features saved -> {FEATURES_PATH}")
    print(f"    Feature order  : {feature_names}")
    print("\n[DONE] Training pipeline complete.")


if __name__ == "__main__":
    train_model()
