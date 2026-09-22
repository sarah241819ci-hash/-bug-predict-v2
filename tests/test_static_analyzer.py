"""
test_static_analyzer.py — Unit Tests for Static Code Metric Extraction
======================================================================
Tests:
- LOC and SLOC extraction
- Cyclomatic complexity (McCabe v(G))
- Halstead metrics (Length, Volume, Difficulty, Operators, Operands)
- Branch count calculation
- Fan-in and Fan-out
- Multi-language support (Python, JavaScript/TypeScript, Java, C++)
- Empty and invalid source code handling
"""

import pytest
from api.static_analyzer import analyze_source_code, detect_language


def test_empty_and_whitespace_code():
    res_empty = analyze_source_code("", "empty.py")
    assert res_empty["loc"] == 0
    assert res_empty["cyclomatic_complexity"] == 1.0
    assert res_empty["length"] == 0.0
    assert res_empty["volume"] == 0.0

    res_whitespace = analyze_source_code("   \n\n\t  \n", "space.js")
    assert res_whitespace["loc"] == 0
    assert res_whitespace["cyclomatic_complexity"] == 1.0


def test_language_detection():
    assert detect_language("src/app.py") == "python"
    assert detect_language("frontend/main.tsx") == "typescript_react"
    assert detect_language("lib/util.js") == "javascript"
    assert detect_language("src/main/App.java") == "java"
    assert detect_language("pkg/server.go") == "go"
    assert detect_language("core/engine.cpp") == "cpp"
    assert detect_language("Models/User.cs") == "csharp"
    assert detect_language("index.php") == "php"
    assert detect_language("config.rb") == "ruby"
    assert detect_language("unknown.xyz") == "generic"


def test_python_ast_metric_extraction():
    python_code = """import os

def calculate_discount(price, is_member, loyalty_years):
    # Calculate customer discount
    if price <= 0:
        return 0.0
    
    discount = 0.0
    if is_member and loyalty_years > 2:
        for tier in [5, 10, 15]:
            if loyalty_years >= tier:
                discount = price * (tier / 100.0)
            else:
                break
    elif is_member:
        discount = price * 0.05
    else:
        discount = 0.0
        
    return discount"""

    metrics = analyze_source_code(python_code, "discount.py")

    assert metrics["language"] == "python"
    assert metrics["loc"] == len(python_code.splitlines())
    assert metrics["sloc"] > 10
    assert metrics["cyclomatic_complexity"] >= 6.0
    assert metrics["branch_count"] >= 5.0
    assert metrics["num_operators"] > 0
    assert metrics["num_operands"] > 0
    assert metrics["length"] == metrics["num_operators"] + metrics["num_operands"]
    assert metrics["volume"] > 0.0
    assert metrics["difficulty"] > 0.0
    assert metrics["int_fan_in"] >= 1.0


def test_javascript_metric_extraction():
    js_code = """function evaluateGrade(score, attendanceRate) {
    if (score < 0 || score > 100) {
        throw new Error("Invalid score");
    }
    
    if (attendanceRate < 0.75) {
        return "INCOMPLETE";
    }
    
    if (score >= 90) {
        return "A";
    } else if (score >= 80) {
        return "B";
    } else if (score >= 70) {
        return "C";
    } else {
        return "F";
    }
}"""

    metrics = analyze_source_code(js_code, "grade.js")

    assert metrics["language"] == "javascript"
    assert metrics["loc"] == len(js_code.splitlines())
    assert metrics["cyclomatic_complexity"] >= 6.0
    assert metrics["num_operators"] > 0
    assert metrics["num_operands"] > 0
    assert metrics["volume"] > 0.0


def test_java_metric_extraction():
    java_code = """package com.example;

public class OrderService {
    public double processOrder(double amount, boolean isPriority, int itemsCount) {
        if (amount <= 0) {
            return 0.0;
        }
        
        double shipping = 5.0;
        if (isPriority) {
            shipping += 10.0;
        }
        
        for (int i = 0; i < itemsCount; i++) {
            if (i > 10) {
                shipping += 1.0;
            }
        }
        
        return amount + shipping;
    }
}"""

    metrics = analyze_source_code(java_code, "OrderService.java")

    assert metrics["language"] == "java"
    assert metrics["loc"] == len(java_code.splitlines())
    assert metrics["cyclomatic_complexity"] >= 4.0
    assert metrics["int_fan_in"] >= 1.0
    assert metrics["length"] > 0.0
    assert metrics["volume"] > 0.0
