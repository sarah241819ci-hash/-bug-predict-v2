"""
gemini_ai.py — Generative AI Qualitative Diagnostic Module
==========================================================
Role:
- Translates quantitative XGBoost predictions and Tree SHAP evidence into plain-English developer guidance.
- Gemini does NOT fabricate or calculate the risk score; it receives the actual ML evidence.
- If Gemini is unreachable or unconfigured, an intelligent deterministic fallback generates explanations
  directly from the measured metrics and SHAP contributions.
"""

import json
import os
from typing import Any, Dict, List, Optional

import requests


def _metric_and_shap_fallback(
    file_path: str,
    raw_metrics: Dict[str, Any],
    risk_score: float,
    shap_factors: Optional[List[Dict[str, Any]]] = None,
    recommendations: Optional[List[str]] = None,
) -> Dict[str, str]:
    """Generates a rich, evidence-based diagnostic explanation purely from measured metrics and SHAP factors."""
    loc = raw_metrics.get("loc", raw_metrics.get("LOC", 0))
    complexity = raw_metrics.get("cyclomatic_complexity", raw_metrics.get("CYCLO", 1.0))
    branch_count = raw_metrics.get("branch_count", raw_metrics.get("BRANCH_COUNT", 0))
    volume = raw_metrics.get("volume", raw_metrics.get("VOLUME", 0))
    risk_pct = round(risk_score * 100)

    # Build evidence description from top SHAP factors or metrics
    evidence_items = []
    if shap_factors:
        for factor in shap_factors[:2]:
            fname = factor.get("feature", "")
            contrib = factor.get("contribution", 0.0)
            if fname == "CYCLO":
                evidence_items.append(f"high cyclomatic complexity ({complexity:.1f})")
            elif fname == "LOC":
                evidence_items.append(f"file size ({loc} lines)")
            elif fname == "BRANCH_COUNT":
                evidence_items.append(f"a high branch count ({int(branch_count)} paths)")
            elif fname in ("VOLUME", "LENGTH"):
                evidence_items.append(f"high code volume ({volume:.0f} Halstead volume)")
            elif fname in ("NUM_OPERATORS", "NUM_OPERANDS"):
                evidence_items.append(f"high operator and operand density")

    if not evidence_items:
        if complexity > 10:
            evidence_items.append(f"high cyclomatic complexity ({complexity:.1f}) with deeply nested branches")
        if loc > 300:
            evidence_items.append(f"large file size ({loc} lines)")
        if not evidence_items:
            evidence_items.append("a combination of size and control-flow density")

    filename = os.path.basename(file_path) if file_path else "this file"
    why = (
        f"The XGBoost model assigned {filename} a {risk_pct}% defect risk score primarily driven by "
        f"{', and '.join(evidence_items)}. "
        f"These structural patterns increase cognitive load and make edge cases harder to test thoroughly."
    )

    # Recommendations
    if recommendations and len(recommendations) > 0:
        test_suggestions = "; ".join(recommendations)
    else:
        test_suggestions = (
            f"Add unit tests covering the primary execution branches in `{filename}`; "
            f"refactor complex methods to reduce nesting; verify error-handling paths."
        )

    return {"why": why, "test_suggestions": test_suggestions}


def generate_risk_explanation(
    file_path: str,
    code: str,
    raw_metrics: Dict[str, Any],
    risk_score: float,
    shap_factors: Optional[List[Dict[str, Any]]] = None,
    recommendations: Optional[List[str]] = None,
) -> Dict[str, str]:
    """Synthesizes human-readable risk explanations and targeted test recommendations.
    
    Passes the exact XGBoost predicted score, SHAP feature contributions, and raw metrics to Gemini.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or not gemini_key.strip():
        return _metric_and_shap_fallback(file_path, raw_metrics, risk_score, shap_factors, recommendations)

    # Format model evidence for prompt
    shap_summary = []
    if shap_factors:
        for sf in shap_factors:
            direction = sf.get("direction", "")
            contrib = sf.get("contribution", 0.0)
            feat = sf.get("feature", "")
            shap_summary.append(f"- {feat}: contribution {contrib:+.4f} ({direction})")

    shap_text = "\n".join(shap_summary) if shap_summary else "No individual SHAP factors available."

    prompt = f"""You are a senior software quality engineer performing an architectural review for the Bug Predict platform.
Our XGBoost defect prediction model analyzed this source file and produced the following mathematical evidence:

File: {file_path}
Predicted Defect Risk: {risk_score * 100:.1f}%

Measured Static Metrics:
- Lines of Code (LOC): {raw_metrics.get('loc', raw_metrics.get('LOC', 'N/A'))}
- Cyclomatic Complexity (v(G)): {raw_metrics.get('cyclomatic_complexity', raw_metrics.get('CYCLO', 'N/A'))}
- Halstead Program Length: {raw_metrics.get('length', raw_metrics.get('LENGTH', 'N/A'))}
- Halstead Volume: {raw_metrics.get('volume', raw_metrics.get('VOLUME', 'N/A'))}
- Halstead Difficulty: {raw_metrics.get('difficulty', raw_metrics.get('DIFFICULTY', 'N/A'))}
- Branch Count: {raw_metrics.get('branch_count', raw_metrics.get('BRANCH_COUNT', 'N/A'))}
- Internal Fan-In: {raw_metrics.get('int_fan_in', raw_metrics.get('INT_FAN_IN', 'N/A'))}
- Internal Fan-Out: {raw_metrics.get('int_fan_out', raw_metrics.get('INT_FAN_OUT', 'N/A'))}

XGBoost Tree SHAP Feature Attributions:
{shap_text}

Code snippet (first 120 lines):
{code[:3500]}

CRITICAL INSTRUCTIONS:
1. Base your explanation strictly on the provided ML evidence, SHAP contributions, and measured metrics.
2. Do NOT invent bugs, vulnerabilities, or claims not supported by the metrics.
3. Explain why the model's top positive SHAP factors represent risk in this code.
4. Provide 2-3 specific, actionable unit/integration testing or refactoring suggestions.

Respond in valid JSON with exactly two keys:
1. "why": 2-3 plain-English sentences explaining the risk based on the model evidence.
2. "test_suggestions": 2-3 actionable, concrete test/review recommendations.
"""

    models_to_try = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash"]
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }

    for model_name in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key.strip()}"
            resp = requests.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                result = json.loads(text)

                raw_why = result.get("why", "")
                raw_sugg = result.get("test_suggestions", "")

                if isinstance(raw_why, list):
                    why = " ".join(str(w) for w in raw_why).strip()
                else:
                    why = str(raw_why).strip()

                if isinstance(raw_sugg, list):
                    suggestions = "; ".join(str(s) for s in raw_sugg).strip()
                else:
                    suggestions = str(raw_sugg).strip()

                if why and len(why) >= 20:
                    return {
                        "why": why,
                        "test_suggestions": suggestions or "; ".join(recommendations or []),
                    }
        except Exception as e:
            print(f"Notice: Gemini API ({model_name}) call bypassed: {e}")

    # Fallback if API call fails
    return _metric_and_shap_fallback(file_path, raw_metrics, risk_score, shap_factors, recommendations)
