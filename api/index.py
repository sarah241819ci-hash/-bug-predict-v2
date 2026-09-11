import traceback
import os
from dotenv import load_dotenv

load_dotenv() # Load the .env file so GITHUB_TOKEN and GEMINI_API_KEY are available

from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .gemini_ai import generate_risk_explanation
from .github import get_file_commits, get_file_content, get_repo_tree, parse_repo_url
from .ml import analyze_code_complexity, predict_risk

app = FastAPI()
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    secret = os.getenv("AUTH_SECRET")
    if not secret or credentials.credentials != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return credentials.credentials

class AnalyzeRequest(BaseModel):
    url: str

@app.get("/api/python/health")
def health_check():
    return {"status": "ok", "service": "Bug Predict ML API"}

@app.post("/api/python/analyze")
def analyze_repo(req: AnalyzeRequest, token: str = Depends(verify_token)):
    try:
        owner, repo = parse_repo_url(req.url)
        
        # 1. Fetch Tree
        tree, default_branch = get_repo_tree(owner, repo)
        
        # Filter for code files — cap at 25 to keep analysis fast
        valid_exts = ('.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.cpp', '.c', '.cs', '.php', '.rb')
        all_code_files = [item for item in tree if item.get('path', '').endswith(valid_exts)]

        if not all_code_files:
            return {"error": "No recognizable code files found in this repository."}

        # Limit to 25 files (prioritise larger files by size if available)
        all_code_files = sorted(all_code_files, key=lambda x: x.get('size', 0), reverse=True)[:25]

        results = []
        overall_score = 0.0

        # Step 1: Fetch content + quick complexity metrics (NO commit fetch yet — too slow for all)
        for file_node in all_code_files:
            path = file_node['path']
            code = get_file_content(owner, repo, path, default_branch)
            if not code.strip():
                continue  # skip empty files

            metrics = analyze_code_complexity(code)
            metrics['commit_count'] = 5   # default placeholder — we'll enrich top files below
            metrics['contributor_count'] = 2

            risk_score = predict_risk(metrics)
            overall_score += risk_score

            risk_level = "LOW"
            if risk_score > 0.69:
                risk_level = "HIGH"
            elif risk_score > 0.39:
                risk_level = "MEDIUM"

            results.append({
                "file_path": path,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "metrics": metrics,
                "code_snippet": code,
                "ai_explanation": "",
                "test_suggestions": ""
            })

        # Step 2: Sort by risk descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)

        # Step 3: Enrich top 5 with real commit data
        for r in results[:5]:
            commits = get_file_commits(owner, repo, r["file_path"])
            r["metrics"]["commit_count"] = len(commits)
            authors = set()
            for c in commits:
                if isinstance(c, dict) and 'commit' in c and 'author' in c['commit']:
                    authors.add(c['commit']['author'].get('email', 'unknown'))
            r["metrics"]["contributor_count"] = len(authors)
            r["risk_score"] = predict_risk(r["metrics"])

        # Re-sort after enrichment
        results.sort(key=lambda x: x["risk_score"], reverse=True)

        # Step 4: AI explanation only for top 3 riskiest
        for r in results[:3]:
            if r["risk_level"] in ["HIGH", "MEDIUM"]:
                ai_exp = generate_risk_explanation(r["file_path"], r["code_snippet"], r["metrics"], r["risk_score"])
                r["ai_explanation"] = ai_exp.get("why", "")
                r["test_suggestions"] = ai_exp.get("test_suggestions", "")

        # Clean up temp code snippets
        for r in results:
            r.pop("code_snippet", None)

        avg_overall = overall_score / len(all_code_files) if all_code_files else 0.0
        overall_level = "LOW"
        if avg_overall > 0.69:
            overall_level = "HIGH"
        elif avg_overall > 0.39:
            overall_level = "MEDIUM"

        return {
            "repository_name": f"{owner}/{repo}",
            "repository_url": req.url,
            "overall_risk": avg_overall,
            "risk_level": overall_level,
            "files": results
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
