import json
import os
import requests

def _metric_fallback(file_path: str, metrics: dict, risk_score: float) -> dict:
    """Generate a meaningful fallback explanation purely from available metrics."""
    loc = metrics.get("loc", 0)
    complexity = metrics.get("cyclomatic_complexity", 1)
    commits = metrics.get("commit_count", 0)
    contributors = metrics.get("contributor_count", 1)
    risk_pct = round(risk_score * 100)

    reasons = []
    if complexity > 10:
        reasons.append(f"high cyclomatic complexity ({complexity:.1f}), indicating deeply nested branching logic")
    elif complexity > 5:
        reasons.append(f"moderate complexity ({complexity:.1f}) with several conditional branches")

    if loc > 300:
        reasons.append(f"a large file size ({loc} lines) that is harder to review and test thoroughly")
    elif loc > 150:
        reasons.append(f"a medium-sized file ({loc} lines) with moderate cognitive load")

    if commits > 20:
        reasons.append(f"high churn ({commits} commits), suggesting this area changes frequently and accumulates risk over time")
    elif commits > 8:
        reasons.append(f"moderate commit churn ({commits} changes), which can introduce subtle regressions")

    if contributors > 4:
        reasons.append(f"many different contributors ({contributors}), which can lead to inconsistent patterns and ownership gaps")

    if not reasons:
        reasons.append(f"a combination of size, complexity, and activity patterns that exceed safe thresholds")

    why = f"This file was flagged with a {risk_pct}% risk score by the XGBoost model due to {', and '.join(reasons[:2])}."

    suggestions = []
    if complexity > 10:
        suggestions.append("refactor deeply nested conditionals into smaller helper functions")
    if loc > 300:
        suggestions.append("split this file into smaller, single-responsibility modules")
    if commits > 15:
        suggestions.append("add regression tests to cover the most frequently changed code paths")
    if contributors > 3:
        suggestions.append("establish a clear code owner for this module to maintain consistency")

    if not suggestions:
        suggestions.append("add unit tests covering the primary logic paths")
        suggestions.append("review for any uncaught edge cases")

    test_suggestions = f"To reduce risk in `{file_path.split('/')[-1]}`: {'; '.join(suggestions[:3])}."

    return {"why": why, "test_suggestions": test_suggestions}


def generate_risk_explanation(file_path: str, code: str, metrics: dict, risk_score: float) -> dict:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return _metric_fallback(file_path, metrics, risk_score)

    prompt = f"""You are a senior software engineer performing a code review.
Analyze this file and its risk metrics. Our XGBoost model gave it a defect risk score of {risk_score*100:.1f}%.

File: {file_path}
Metrics: {json.dumps(metrics)}

Code snippet (first 150 lines):
{code[:4000]}

Respond in valid JSON with exactly two keys:
1. "why": 1-2 plain-English sentences explaining why this file is risky based on these metrics.
2. "test_suggestions": 1-2 specific, actionable recommendations for what to test or review.
"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2
            }
        }
        resp = requests.post(url, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        result = json.loads(text)
        why = result.get("why", "").strip()
        suggestions = result.get("test_suggestions", "").strip()

        if not why or len(why) < 20:
            return _metric_fallback(file_path, metrics, risk_score)

        return {"why": why, "test_suggestions": suggestions or _metric_fallback(file_path, metrics, risk_score)["test_suggestions"]}
    except Exception as e:
        print(f"Gemini Error: {e} — using metric-based fallback")
        return _metric_fallback(file_path, metrics, risk_score)
