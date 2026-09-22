"""
github.py — GitHub Repository Ingestion & Mining Module
======================================================
Handles:
- Repository URL parsing and validation
- Recursive repository tree discovery and default branch detection
- Raw file content fetching with default branch support
- Commit history retrieval for churn and contributor metrics
"""

import os
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse

import requests


def get_headers() -> Dict[str, str]:
    """Builds authorization and API headers for GitHub requests."""
    token = os.getenv("GITHUB_TOKEN")
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "BugPredict-Analyzer/2.0",
    }
    if token and token.strip():
        headers["Authorization"] = f"token {token.strip()}"
    return headers


def parse_repo_url(url: str) -> Tuple[str, str]:
    """Parses a GitHub repository URL into (owner, repo).
    Supports formats like:
    - https://github.com/owner/repo
    - https://github.com/owner/repo.git
    - github.com/owner/repo
    - owner/repo
    """
    url = url.strip()
    if not url.startswith("http"):
        if "github.com" in url:
            url = "https://" + url
        else:
            url = "https://github.com/" + url

    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.split("/") if p]

    if len(path_parts) >= 2:
        owner = path_parts[0]
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]
        return owner, repo

    raise ValueError(f"Invalid GitHub URL: '{url}'. Expected format: 'https://github.com/owner/repo'")


def get_repo_tree(owner: str, repo: str) -> Tuple[List[Dict[str, Any]], str]:
    """Fetches the default branch and recursive tree structure for a GitHub repository."""
    headers = get_headers()
    url = f"https://api.github.com/repos/{owner}/{repo}"

    # 1. Fetch Repo Info & Default Branch (with retry for transient network hiccups)
    resp = None
    for attempt in range(2):
        try:
            resp = requests.get(url, headers=headers, timeout=25)
            if resp.status_code == 200:
                break
        except requests.exceptions.RequestException:
            if attempt == 1:
                raise Exception(
                    f"GitHub connection timed out while reaching repository '{owner}/{repo}'. "
                    f"Please check your internet connection or verify the repository exists."
                )

    if not resp or resp.status_code != 200:
        err_msg = resp.text if resp else "No response received"
        if resp and resp.status_code == 404:
            raise Exception(f"Repository '{owner}/{repo}' not found on GitHub or is private.")
        raise Exception(f"Failed to fetch repository metadata for '{owner}/{repo}': {err_msg}")

    default_branch = resp.json().get("default_branch", "main")

    # 2. Fetch Recursive Git Tree
    tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
    tree_resp = None
    for attempt in range(2):
        try:
            tree_resp = requests.get(tree_url, headers=headers, timeout=30)
            if tree_resp.status_code == 200:
                break
        except requests.exceptions.RequestException:
            if attempt == 1:
                raise Exception(
                    f"GitHub tree fetch timed out for '{owner}/{repo}'. "
                    f"The repository might be exceptionally large or the connection is slow."
                )

    if not tree_resp or tree_resp.status_code != 200:
        err_msg = tree_resp.text if tree_resp else "No response received"
        raise Exception(f"Failed to fetch repository file tree for '{owner}/{repo}': {err_msg}")

    tree_data = tree_resp.json().get("tree", [])
    return tree_data, default_branch


def get_file_content(owner: str, repo: str, path: str, branch: str = "main") -> str:
    """Fetches raw source file content using the repository's discovered default branch."""
    url = f"https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{branch}/{path}"
    try:
        resp = requests.get(url, timeout=20)
        if resp.status_code == 200:
            return resp.text
        # Fallback to standard raw URL if refs/heads format fails
        fallback_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
        fallback_resp = requests.get(fallback_url, timeout=20)
        if fallback_resp.status_code == 200:
            return fallback_resp.text
    except Exception as e:
        print(f"Warning: Failed to fetch {path} on branch {branch} due to error: {e}")
    return ""


def get_file_commits(owner: str, repo: str, path: str) -> List[Dict[str, Any]]:
    """Fetches commit history for a specific file to compute additional project metrics (churn & contributors)."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?path={path}"
    try:
        resp = requests.get(url, headers=get_headers(), timeout=20)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Warning: Failed to fetch commits for {path} due to error: {e}")
    return []
