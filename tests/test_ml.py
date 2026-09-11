from api.ml import analyze_code_complexity, predict_risk
from api.github import parse_repo_url

def test_analyze_code_complexity():
    code = """
def hello():
    if True:
        print("World")
    """
    metrics = analyze_code_complexity(code)
    assert metrics["loc"] == 5
    assert metrics["cyclomatic_complexity"] > 0

def test_predict_risk():
    metrics = {
        "loc": 500,
        "cyclomatic_complexity": 25.0,
        "commit_count": 50,
        "contributor_count": 5
    }
    risk = predict_risk(metrics)
    assert 0.0 <= risk <= 1.0

def test_parse_repo_url():
    owner, repo = parse_repo_url("https://github.com/facebook/react")
    assert owner == "facebook"
    assert repo == "react"
