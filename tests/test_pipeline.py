"""
test_pipeline.py — Unit Tests for End-to-End Pipeline & Explainability Fallback
==============================================================================
Tests:
- Complete predict_risk pipeline across multiple code samples
- Diagnostic fallback generation using SHAP factors and metrics
- Risk categorization thresholds
"""

import pytest
from api.gemini_ai import _metric_and_shap_fallback
from api.ml import predict_risk


def test_predict_risk_various_languages():
    files = [
        ("app.py", "def add(a, b): return a + b"),
        ("main.js", "function run() { console.log('hello'); }"),
        ("Service.java", "public class Service { public void doWork() {} }"),
    ]

    for fname, code in files:
        res = predict_risk(code=code, file_path=fname)
        assert res["risk_score"] >= 0.0
        assert res["risk_score"] <= 1.0
        assert res["risk_level"] in ("LOW", "MEDIUM", "HIGH")
        assert len(res["raw_metrics"]) > 0


def test_explainability_fallback_generation():
    raw_metrics = {
        "loc": 450,
        "cyclomatic_complexity": 18.0,
        "branch_count": 22.0,
        "volume": 3200.0,
    }
    shap_factors = [
        {"feature": "CYCLO", "contribution": 0.32, "direction": "INCREASES_RISK"},
        {"feature": "LOC", "contribution": 0.25, "direction": "INCREASES_RISK"},
    ]
    recs = ["Refactor nested conditionals into helper functions", "Add branch-coverage tests"]

    diag = _metric_and_shap_fallback(
        file_path="src/router.py",
        raw_metrics=raw_metrics,
        risk_score=0.82,
        shap_factors=shap_factors,
        recommendations=recs,
    )

    assert "why" in diag
    assert "test_suggestions" in diag
    assert "82%" in diag["why"]
    assert "cyclomatic complexity" in diag["why"].lower() or "lines" in diag["why"].lower()
    assert "Refactor" in diag["test_suggestions"]
