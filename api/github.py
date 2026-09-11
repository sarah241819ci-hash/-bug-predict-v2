import base64
import os
from typing import Any

import requests

def get_headers():
    token = os.getenv("GITHUB_TOKEN")
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    if token:
        headers["Authorization"] = f"token {token}"
    return headers

from urllib.parse import urlparse

def parse_repo_url(url: str):
    url = url.strip()
    if not url.startswith("http"):
        if "github.com" in url:
            url = "https://" + url
        else:
            url = "https://github.com/" + url

    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.split('/') if p]
    
    if len(path_parts) >= 2:
        owner = path_parts[0]
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]
        return owner, repo
        
    raise ValueError(f"Invalid GitHub URL: {url}")

def get_repo_tree(owner: str, repo: str) -> tuple[list[dict[str, Any]], str]:
    """Fetches the default branch tree recursively."""
    url = f"https://api.github.com/repos/{owner}/{repo}"
    resp = requests.get(url, headers=get_headers())
    if resp.status_code != 200:
        raise Exception(f"Failed to fetch repo info: {resp.text}")
    
    default_branch = resp.json().get("default_branch", "main")
    
    tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
    tree_resp = requests.get(tree_url, headers=get_headers())
    
    if tree_resp.status_code != 200:
        raise Exception(f"Failed to fetch repo tree: {tree_resp.text}")
        
    return tree_resp.json().get("tree", []), default_branch

def get_file_content(owner: str, repo: str, path: str, branch: str = "main") -> str:
    """Fetch raw file content bypassing the standard API rate limit."""
    url = f"https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{branch}/{path}"
    resp = requests.get(url)
    if resp.status_code == 200:
        return resp.text
    return ""

def get_file_commits(owner: str, repo: str, path: str) -> list[dict[str, Any]]:
    """Get commit history for a specific file to calculate churn and contributors."""
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?path={path}"
    resp = requests.get(url, headers=get_headers())
    if resp.status_code == 200:
        return resp.json()
    return []
