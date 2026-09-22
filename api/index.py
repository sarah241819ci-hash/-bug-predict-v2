"""
index.py — Bug Predict FastAPI Backend Service
=============================================
Endpoints:
- GET  /api/python/health   : Health check endpoint
- GET  /api/python/model    : Returns model metadata and evaluation statistics
- POST /api/python/analyze  : Analyzes public GitHub repository and produces defect predictions
"""

import os
import traceback
from typing import Any, Dict, List

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from .gemini_ai import generate_risk_explanation
from .github import get_file_commits, get_file_content, get_repo_tree, parse_repo_url
from .ml import _LOADER, analyze_code_complexity, predict_risk

app = FastAPI(title="Bug Predict Analytics API", version="2.0.0")
security = HTTPBearer()

SUPPORTED_EXTENSIONS = (
    ".py", ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs",
    ".java", ".go", ".cpp", ".c", ".cc", ".cxx", ".h", ".hpp",
    ".cs", ".php", ".rb"
)


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    secret = os.getenv("AUTH_SECRET")
    if not secret or credentials.credentials != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return credentials.credentials


class AnalyzeRequest(BaseModel):
    url: str


@app.get("/api/python/health")
def health_check():
    return {
        "status": "ok",
        "service": "Bug Predict Analytics Engine",
        "model_loaded": _LOADER.bst is not None,
        "features_count": len(_LOADER.expected_features),
    }


@app.get("/api/python/model")
def get_model_info():
    """Returns trained model metadata and evaluation metrics."""
    metrics_path = os.path.join(os.path.dirname(__file__), "model_metrics.json")
    metadata_path = os.path.join(os.path.dirname(__file__), "model_metadata.json")

    metrics_data = {}
    metadata_data = {}

    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as fh:
            import json
            metrics_data = json.load(fh)

    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as fh:
            import json
            metadata_data = json.load(fh)

    return {
        "metadata": metadata_data,
        "metrics": metrics_data,
    }


@app.post("/api/python/analyze")
def analyze_repo(req: AnalyzeRequest, token: str = Depends(verify_token)):
    try:
        print(f"--> Starting analysis for: {req.url}")
        owner, repo = parse_repo_url(req.url)

        # 1. Fetch Repository Tree & Discovered Default Branch
        print(f"--> Fetching repo tree for {owner}/{repo}...")
        tree, default_branch = get_repo_tree(owner, repo)
        print(f"--> Default branch: '{default_branch}', total items found: {len(tree)}")

        # 2. Filter for supported code files
        all_code_files = [
            item for item in tree
            if any(item.get("path", "").lower().endswith(ext) for ext in SUPPORTED_EXTENSIONS)
        ]

        if not all_code_files:
            return {
                "error": (
                    f"No supported source code files found in repository '{owner}/{repo}'. "
                    f"Bug Predict supports: {', '.join(SUPPORTED_EXTENSIONS)}"
                )
            }

        # 3. Limit to top 25 files by size for responsive execution
        all_code_files = sorted(all_code_files, key=lambda x: x.get("size", 0), reverse=True)[:25]
        print(f"--> Analyzing top {len(all_code_files)} code files...")

        results: List[Dict[str, Any]] = []
        overall_score = 0.0

        # 4. Extract Real Static Metrics & Run XGBoost Prediction for Each File
        for idx, file_node in enumerate(all_code_files):
            path = file_node["path"]
            print(f"    [{idx+1}/{len(all_code_files)}] Processing: {path}")

            code = get_file_content(owner, repo, path, branch=default_branch)
            if not code or not code.strip():
                continue

            # Run full prediction pipeline: Real Static Analysis -> Strict Validation -> XGBoost -> SHAP
            pred_res = predict_risk(code=code, file_path=path)
            risk_score = pred_res["risk_score"]
            overall_score += risk_score

            # Package metrics (combining model features and display metrics)
            metrics_payload = dict(pred_res["raw_metrics"])
            # Additional Project Metrics (separated from ML model features)
            metrics_payload["commit_count"] = 1
            metrics_payload["contributor_count"] = 1
            metrics_payload["top_risk_factors"] = pred_res.get("top_risk_factors", [])
            metrics_payload["top_reducing_factors"] = pred_res.get("top_reducing_factors", [])

            results.append({
                "file_path": path,
                "risk_score": risk_score,
                "risk_level": pred_res["risk_level"],
                "metrics": metrics_payload,
                "code_snippet": code,
                "shap_factors": pred_res.get("top_risk_factors", []),
                "recommendations": pred_res.get("recommendations", []),
                "ai_explanation": "",
                "test_suggestions": "",
            })

        if not results:
            return {"error": "All discovered code files were empty or inaccessible."}

        # 5. Sort by predicted risk score descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)

        # 6. Enrich top 5 riskiest files with Additional Git Project Metrics (Commit History & Churn)
        print("--> Enriching top 5 riskiest files with GitHub commit history...")
        for r in results[:5]:
            commits = get_file_commits(owner, repo, r["file_path"])
            r["metrics"]["commit_count"] = max(1, len(commits))
            authors = set()
            for c in commits:
                if isinstance(c, dict) and "commit" in c and "author" in c["commit"]:
                    author_email = c["commit"]["author"].get("email", "unknown")
                    authors.add(author_email)
            r["metrics"]["contributor_count"] = max(1, len(authors))

        # 7. Generate Qualitative Explanations & Test Plans for Top 3 Elevated-Risk Files
        print("--> Generating AI / Evidence-based explanations for top riskiest files...")
        for r in results[:3]:
            if r["risk_level"] in ("HIGH", "MEDIUM"):
                print(f"    -> Synthesizing diagnostics for: {r['file_path']}")
                ai_exp = generate_risk_explanation(
                    file_path=r["file_path"],
                    code=r["code_snippet"],
                    raw_metrics=r["metrics"],
                    risk_score=r["risk_score"],
                    shap_factors=r.get("shap_factors"),
                    recommendations=r.get("recommendations"),
                )
                r["ai_explanation"] = ai_exp.get("why", "")
                r["test_suggestions"] = ai_exp.get("test_suggestions", "")

        # Clean up temporary code snippets and internal intermediate keys
        for r in results:
            r.pop("code_snippet", None)
            r.pop("shap_factors", None)
            r.pop("recommendations", None)

        # 8. Calculate Repository-Level Aggregate Risk
        # Definition: Mean predicted defect risk across all analyzed source files
        avg_overall = overall_score / len(results) if results else 0.0
        avg_overall = float(min(max(0.0, avg_overall), 1.0))

        overall_level = "LOW"
        if avg_overall >= 0.70:
            overall_level = "HIGH"
        elif avg_overall >= 0.40:
            overall_level = "MEDIUM"

        print(f"--> Analysis complete! Scanned {len(results)} files. Overall risk: {avg_overall * 100:.1f}% ({overall_level})")

        return {
            "repository_name": f"{owner}/{repo}",
            "repository_url": req.url,
            "overall_risk": avg_overall,
            "risk_level": overall_level,
            "files": results,
            "analysis_notes": {
                "aggregation_method": "Mean predicted file-level defect probability",
                "risk_thresholds": "Low: <40%, Medium: 40-69%, High: >=70%",
                "disclaimer": (
                    "This system predicts software defect risk from static code metrics using an XGBoost "
                    "model trained on the Kaggle software defect dataset. Predictions represent model-based "
                    "risk estimates for decision support, not guarantees of actual defect occurrence."
                ),
            },
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
