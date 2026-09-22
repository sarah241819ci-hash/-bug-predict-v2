"""
test_github.py — Unit Tests for GitHub Ingestion Module
======================================================
Tests:
- GitHub URL parsing across different formats
- Invalid URL rejection
- Header token formatting
"""

import pytest
from api.github import get_headers, parse_repo_url


def test_parse_repo_url_standard():
    owner, repo = parse_repo_url("https://github.com/facebook/react")
    assert owner == "facebook"
    assert repo == "react"


def test_parse_repo_url_with_git_suffix():
    owner, repo = parse_repo_url("https://github.com/pallets/flask.git")
    assert owner == "pallets"
    assert repo == "flask"


def test_parse_repo_url_shorthand():
    owner, repo = parse_repo_url("expressjs/express")
    assert owner == "expressjs"
    assert repo == "express"


def test_parse_repo_url_without_protocol():
    owner, repo = parse_repo_url("github.com/torvalds/linux")
    assert owner == "torvalds"
    assert repo == "linux"


def test_parse_repo_url_invalid():
    with pytest.raises(ValueError) as excinfo:
        parse_repo_url("invalid_url_without_slash")
    assert "Invalid GitHub URL" in str(excinfo.value)


def test_get_headers():
    headers = get_headers()
    assert "Accept" in headers
    assert "User-Agent" in headers
