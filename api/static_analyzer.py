"""
static_analyzer.py — Real Multi-Language Static Code Metric Analyzer
====================================================================
Extracts genuine software engineering metrics from source code:
- LOC (Total Lines of Code, Source Lines of Code, Blank, Comment lines)
- CYCLO (McCabe Cyclomatic Complexity v(G))
- LENGTH (Halstead Program Length N = N1 + N2)
- VOLUME (Halstead Volume V = N * log2(eta))
- DIFFICULTY (Halstead Difficulty D = (eta1 / 2) * (N2 / eta2))
- NUM_OPERATORS (Total operator tokens N1)
- NUM_OPERANDS (Total operand tokens N2)
- BRANCH_COUNT (Count of decision branch paths)
- INT_FAN_IN (Internal definitions / entry points)
- INT_FAN_OUT (External function / method calls)
"""

import ast
import math
import os
import re
from typing import Any, Dict, List, Tuple

# Supported file extensions mapped to language names
LANGUAGE_EXTENSIONS: Dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript_react",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript_react",
    ".java": "java",
    ".go": "go",
    ".c": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".h": "c_header",
    ".hpp": "cpp_header",
    ".cs": "csharp",
    ".php": "php",
    ".rb": "ruby",
}


def detect_language(file_path: str) -> str:
    """Detects programming language from file path extension."""
    ext = os.path.splitext(file_path)[1].lower()
    return LANGUAGE_EXTENSIONS.get(ext, "generic")


# ─────────────────────────────────────────────────────────────────────────────
# 1. Python AST-Based Analyzer
# ─────────────────────────────────────────────────────────────────────────────

class _PythonMetricVisitor(ast.NodeVisitor):
    """AST visitor that computes McCabe cyclomatic complexity, branch counts,
    fan-in (definitions), fan-out (calls), and AST operators/operands."""

    def __init__(self) -> None:
        self.complexity: int = 1  # Base complexity for the module
        self.branches: int = 0
        self.func_defs: int = 0
        self.class_defs: int = 0
        self.calls: int = 0
        self.operators: List[str] = []
        self.operands: List[str] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self.func_defs += 1
        self.operands.append(node.name)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self.func_defs += 1
        self.operands.append(node.name)
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.class_defs += 1
        self.operands.append(node.name)
        self.generic_visit(node)

    def visit_If(self, node: ast.If) -> None:
        self.complexity += 1
        self.branches += 2 if node.orelse else 1
        self.operators.append("if")
        self.generic_visit(node)

    def visit_IfExp(self, node: ast.IfExp) -> None:
        self.complexity += 1
        self.branches += 2
        self.operators.append("if_exp")
        self.generic_visit(node)

    def visit_For(self, node: ast.For) -> None:
        self.complexity += 1
        self.branches += 1
        self.operators.append("for")
        self.generic_visit(node)

    def visit_AsyncFor(self, node: ast.AsyncFor) -> None:
        self.complexity += 1
        self.branches += 1
        self.operators.append("async_for")
        self.generic_visit(node)

    def visit_While(self, node: ast.While) -> None:
        self.complexity += 1
        self.branches += 1
        self.operators.append("while")
        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler) -> None:
        self.complexity += 1
        self.branches += 1
        self.operators.append("except")
        self.generic_visit(node)

    def visit_With(self, node: ast.With) -> None:
        self.complexity += 1
        self.operators.append("with")
        self.generic_visit(node)

    def visit_AsyncWith(self, node: ast.AsyncWith) -> None:
        self.complexity += 1
        self.operators.append("async_with")
        self.generic_visit(node)

    def visit_Assert(self, node: ast.Assert) -> None:
        self.complexity += 1
        self.operators.append("assert")
        self.generic_visit(node)

    def visit_comprehension(self, node: ast.comprehension) -> None:
        self.complexity += 1 + len(node.ifs)
        self.branches += 1 + len(node.ifs)
        self.operators.append("comp")
        self.generic_visit(node)

    def visit_BoolOp(self, node: ast.BoolOp) -> None:
        # Each boolean op (and, or) adds a decision point in McCabe complexity
        self.complexity += len(node.values) - 1
        self.branches += len(node.values) - 1
        op_name = node.op.__class__.__name__
        self.operators.extend([op_name] * (len(node.values) - 1))
        self.generic_visit(node)

    def visit_BinOp(self, node: ast.BinOp) -> None:
        self.operators.append(node.op.__class__.__name__)
        self.generic_visit(node)

    def visit_UnaryOp(self, node: ast.UnaryOp) -> None:
        self.operators.append(node.op.__class__.__name__)
        self.generic_visit(node)

    def visit_Compare(self, node: ast.Compare) -> None:
        for op in node.ops:
            self.operators.append(op.__class__.__name__)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        self.calls += 1
        self.operators.append("call()")
        if isinstance(node.func, ast.Name):
            self.operands.append(node.func.id)
        elif isinstance(node.func, ast.Attribute):
            self.operands.append(node.func.attr)
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name) -> None:
        self.operands.append(node.id)
        self.generic_visit(node)

    def visit_Constant(self, node: ast.Constant) -> None:
        self.operands.append(repr(node.value))
        self.generic_visit(node)


def _analyze_python_ast(code: str) -> Dict[str, Any]:
    """Extracts real metrics from Python source code via AST."""
    tree = ast.parse(code)
    visitor = _PythonMetricVisitor()
    visitor.visit(tree)

    n1 = len(visitor.operators)
    n2 = len(visitor.operands)
    eta1 = len(set(visitor.operators))
    eta2 = len(set(visitor.operands))

    N = n1 + n2
    eta = eta1 + eta2
    vol = N * math.log2(max(1, eta)) if eta > 0 else 0.0
    diff = (eta1 / 2.0) * (n2 / max(1, eta2)) if eta2 > 0 else 0.0

    return {
        "cyclo": float(visitor.complexity),
        "length": float(N),
        "volume": float(vol),
        "difficulty": float(diff),
        "int_fan_in": float(visitor.func_defs + visitor.class_defs),
        "int_fan_out": float(max(0, visitor.calls - visitor.func_defs)),
        "num_operators": float(n1),
        "num_operands": float(n2),
        "branch_count": float(max(visitor.branches, visitor.complexity - 1)),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Generic Lexical / Multi-Language Tokenizer & Analyzer
# ─────────────────────────────────────────────────────────────────────────────

# Language specific keyword dictionaries
_DECISION_KEYWORDS = {
    "javascript": [r"\bif\b", r"\bfor\b", r"\bwhile\b", r"\bcase\b", r"\bcatch\b", r"&&", r"\|\|", r"\?", r"\?\?"],
    "typescript": [r"\bif\b", r"\bfor\b", r"\bwhile\b", r"\bcase\b", r"\bcatch\b", r"&&", r"\|\|", r"\?", r"\?\?"],
    "java": [r"\bif\b", r"\bfor\b", r"\bwhile\b", r"\bcase\b", r"\bcatch\b", r"&&", r"\|\|", r"\?"],
    "c": [r"\bif\b", r"\bfor\b", r"\bwhile\b", r"\bcase\b", r"&&", r"\|\|", r"\?"],
    "cpp": [r"\bif\b", r"\bfor\b", r"\bwhile\b", r"\bcase\b", r"\bcatch\b", r"&&", r"\|\|", r"\?"],
    "csharp": [r"\bif\b", r"\bfor\b", r"\bwhile\b", r"\bcase\b", r"\bcatch\b", r"&&", r"\|\|", r"\?", r"\?\?"],
    "go": [r"\bif\b", r"\bfor\b", r"\bcase\b", r"\bselect\b", r"&&", r"\|\|"],
    "php": [r"\bif\b", r"\bfor\b", r"\bforeach\b", r"\bwhile\b", r"\bcase\b", r"\bcatch\b", r"&&", r"\|\|", r"\?", r"\?\?"],
    "ruby": [r"\bif\b", r"\bunless\b", r"\bfor\b", r"\bwhile\b", r"\buntil\b", r"\bwhen\b", r"\brescue\b", r"&&", r"\|\|", r"\band\b", r"\bor\b"],
    "generic": [r"\bif\b", r"\bfor\b", r"\bwhile\b", r"\bcase\b", r"\bcatch\b", r"&&", r"\|\|", r"\?"],
}

_OPERATOR_PATTERN = re.compile(
    r"===|!==|==|!=|<=|>=|<<|>>|\+\+|--|\+=|-=|\*=|/=|%=|->|::|\?\.|\?\?|&&|\|\||"
    r"\+|-|\*|/|%|=|<|>|!|&|\||\^|~|\?|:|"
    r"\b(if|else|elif|for|foreach|while|do|switch|case|default|break|continue|return|throw|try|catch|finally|"
    r"new|delete|typeof|instanceof|await|async|def|function|fn|class|import|from|export|package|public|private|protected|static)\b"
)


def _strip_comments_and_strings(code: str, lang: str) -> Tuple[str, int, int]:
    """Strips comments and replaces string literals with tokens.
    Returns (cleaned_code, blank_lines, comment_lines)."""
    lines = code.splitlines()
    blank_lines = sum(1 for line in lines if not line.strip())
    comment_lines = 0

    if lang == "python":
        cleaned = re.sub(r'#.*', '', code)
        cleaned = re.sub(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'', '', cleaned)
    elif lang in ("ruby",):
        cleaned = re.sub(r'#.*', '', code)
        cleaned = re.sub(r'=begin[\s\S]*?=end', '', cleaned)
    else:
        # C-style comments (// and /* */)
        cleaned = re.sub(r'//.*', '', code)
        cleaned = re.sub(r'/\*[\s\S]*?\*/', '', cleaned)

    # Count comment lines
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(('#', '//', '/*', '*')):
            comment_lines += 1

    # Replace string literals so their contents don't pollute operator/operand counts
    cleaned = re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`', ' STRING_LITERAL ', cleaned)

    return cleaned, blank_lines, comment_lines


def _analyze_lexical(code: str, lang: str) -> Dict[str, Any]:
    """Multi-language lexical analyzer computing cyclomatic complexity and Halstead metrics."""
    clean_code, _, _ = _strip_comments_and_strings(code, lang)

    # 1. Operators
    op_matches = _OPERATOR_PATTERN.findall(clean_code)
    # findall with capturing groups can return strings or tuples; flatten
    operators: List[str] = []
    for m in _OPERATOR_PATTERN.finditer(clean_code):
        operators.append(m.group(0))

    # 2. Operands (Identifiers and Numbers)
    no_ops = _OPERATOR_PATTERN.sub(' ', clean_code)
    operand_tokens = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b|\b\d+(?:\.\d+)?\b', no_ops)

    n1 = len(operators)
    n2 = len(operand_tokens)
    eta1 = len(set(operators))
    eta2 = len(set(operand_tokens))

    N = n1 + n2
    eta = eta1 + eta2
    vol = N * math.log2(max(1, eta)) if eta > 0 else 0.0
    diff = (eta1 / 2.0) * (n2 / max(1, eta2)) if eta2 > 0 else 0.0

    # 3. Cyclomatic Complexity
    patterns = _DECISION_KEYWORDS.get(lang, _DECISION_KEYWORDS["generic"])
    decision_regex = re.compile('|'.join(patterns))
    decision_count = len(decision_regex.findall(clean_code))
    cyclo = 1.0 + decision_count
    branch_count = decision_count * 2

    # 4. Internal Fan-In / Fan-Out
    func_def_patterns = [
        r'\b(?:def|function|fn)\s+([a-zA-Z_][a-zA-Z0-9_]*)',
        r'\b(?:public|private|protected|static|\bvoid|\bint|\bString|\bbool)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(',
        r'\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)',
    ]
    func_defs = 0
    for pat in func_def_patterns:
        func_defs += len(re.findall(pat, clean_code))

    func_calls = max(0, len(re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', clean_code)) - func_defs)

    return {
        "cyclo": float(cyclo),
        "length": float(N),
        "volume": float(vol),
        "difficulty": float(diff),
        "int_fan_in": float(max(1, func_defs)),
        "int_fan_out": float(func_calls),
        "num_operators": float(n1),
        "num_operands": float(n2),
        "branch_count": float(branch_count),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Public Unified Analysis Function
# ─────────────────────────────────────────────────────────────────────────────

def analyze_source_code(code: str, file_path: str = "") -> Dict[str, Any]:
    """Analyzes source code and returns genuine software metrics across all supported languages.
    
    Returns a dictionary containing:
    - loc: Total line count
    - sloc: Source lines of code (excluding blanks and comments)
    - cyclomatic_complexity: McCabe v(G)
    - length: Halstead N
    - volume: Halstead V
    - difficulty: Halstead D
    - num_operators: Total operators N1
    - num_operands: Total operands N2
    - branch_count: Decision branch count
    - int_fan_in: Internal definitions / entry points
    - int_fan_out: Function/method invocations
    - language: Detected programming language
    """
    if not code or not code.strip():
        return {
            "loc": 0,
            "sloc": 0,
            "cyclomatic_complexity": 1.0,
            "length": 0.0,
            "volume": 0.0,
            "difficulty": 0.0,
            "num_operators": 0.0,
            "num_operands": 0.0,
            "branch_count": 0.0,
            "int_fan_in": 0.0,
            "int_fan_out": 0.0,
            "language": "empty",
        }

    lang = detect_language(file_path) if file_path else "generic"
    lines = code.splitlines()
    total_loc = len(lines)
    _, blank_lines, comment_lines = _strip_comments_and_strings(code, lang)
    sloc = max(1, total_loc - blank_lines - comment_lines)

    # 1. Try Python AST if Python
    metrics: Dict[str, Any] = {}
    if lang == "python":
        try:
            metrics = _analyze_python_ast(code)
        except Exception:
            # Fall back to lexical analysis on syntax errors (e.g. snippets)
            metrics = _analyze_lexical(code, lang)
    else:
        metrics = _analyze_lexical(code, lang)

    metrics["loc"] = total_loc
    metrics["sloc"] = sloc
    metrics["cyclomatic_complexity"] = metrics.pop("cyclo")
    metrics["language"] = lang

    return metrics
