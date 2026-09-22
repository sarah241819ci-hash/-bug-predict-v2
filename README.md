# Bug Predict 🚀
> **AI-Powered Software Defect Risk Prediction & Explainability Platform**

Bug Predict is an end-to-end software quality and defect risk analysis platform. It combines **multi-language static code analysis**, a calibrated **XGBoost machine learning classifier**, **Tree SHAP local explainability**, and **grounded LLM synthesis (Google Gemini)** to identify high-risk source code files and provide actionable refactoring guidance before bugs reach production.

---

## 📌 Table of Contents
1. [Key Features](#-key-features)
2. [System Architecture](#-system-architecture)
3. [How It Works](#-how-it-works)
4. [Software Metrics Extracted](#-software-metrics-extracted)
5. [Tech Stack](#-tech-stack)
6. [Prerequisites](#-prerequisites)
7. [Getting Started & Installation](#-getting-started--installation)
8. [Environment Variables](#-environment-variables)
9. [Running the Application](#-running-the-application)
10. [Running Automated Tests](#-running-automated-tests)
11. [Project Structure](#-project-structure)
12. [Academic Disclaimer & Limitations](#-academic-disclaimer--limitations)

---

## 🌟 Key Features

* **Multi-Language Static Code Analysis**: Native AST parser for Python and lexical tokenizers for JavaScript, TypeScript, TSX/JSX, Java, Go, C/C++, C#, PHP, and Ruby.
* **Strict ML Feature Contract**: Validates, scales, and ensures complete 10-feature schema integrity with active NaN/Inf and missing feature detection.
* **XGBoost Defect Prediction**: Gradient Boosted Trees trained on Stratified 5-Fold Cross Validation outputting calibrated file risk scores (`LOW`, `MEDIUM`, `HIGH`).
* **Exact Tree SHAP Explainability**: Computes per-feature Shapley contributions (`pred_contribs=True`) for transparent, mathematical risk factor attribution.
* **Grounded Gemini AI Explanations**: Generates qualitative explanations grounded strictly in computed SHAP factors and code metrics—eliminating AI hallucination.
* **Deterministic Fallback Engine**: Provides 100% offline, zero-downtime metric-driven explanations if API keys are unset or rate-limited.
* **Separation of Concerns**: Software metrics (ML input) are kept strictly separate from repository process metrics (commit count, author count, code churn).
* **Enterprise Dashboard & PDF Export**: Clean Next.js dashboard with directory risk hotspot maps, language distributions, and shareable PDF audit reports.

---

## 🏗 System Architecture

```
[ GitHub Repository ]
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│ 1. GitHub Ingestion & Mining Module (api/github.py)        │
│    • Resolves dynamic default branch (main/master/dev)     │
│    • Fetches recursive Git tree & raw source code          │
│    • Gathers commit history for repository context         │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│ 2. Multi-Language Static Analyzer (api/static_analyzer.py) │
│    • Python: Native AST Visitor (ast.NodeVisitor)          │
│    • Other: Tokenizer for JS, TS, Java, Go, C/C++, etc.    │
│    • Computes LOC, Cyclomatic Complexity, Halstead metrics │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│ 3. Feature Contract & Scaler (api/ml.py)                   │
│    • Schema validation & NaN/Infinity safety check         │
│    • Reference bound scaling into normalized model space   │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│ 4. XGBoost Defect Classifier & Tree SHAP Engine            │
│    • Predicts Defect Risk Score (0.0 – 1.0) & Risk Tier    │
│    • Native Tree SHAP calculates exact feature impacts     │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│ 5. Grounded AI Explanation Engine (api/gemini_ai.py)       │
│    • Translates SHAP evidence into plain-English reasons   │
│    • Deterministic metric-driven offline fallback          │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│ 6. Full-Stack Web Application (Next.js 16 + Prisma)        │
│    • Saves analysis to PostgreSQL (Neon)                   │
│    • Renders risk dashboard, hotspots, and PDF export      │
└────────────────────────────────────────────────────────────┘
```

---

## 🔬 Software Metrics Extracted

The machine learning engine evaluates code across 10 standard software metrics:

| Index | Metric Name | Category | Mathematical / Empirical Definition |
|---|---|---|---|
| 0 | `LOC` | Size | Non-blank, non-comment source lines of code |
| 1 | `CYCLO` | Complexity | McCabe Cyclomatic Complexity: $v(G) = 1 + \text{Decision Nodes}$ |
| 2 | `LENGTH` | Halstead | Total program length: $N = N_1 + N_2$ (Operators + Operands) |
| 3 | `VOLUME` | Halstead | Program volume: $V = N \times \log_2(\text{Vocabulary})$ |
| 4 | `DIFFICULTY` | Halstead | Program difficulty: $D = (\eta_1 / 2) \times (N_2 / \eta_2)$ |
| 5 | `INT_FAN_IN` | Coupling | Internal module definitions and entry points |
| 6 | `INT_FAN_OUT` | Coupling | External function invocations and import directives |
| 7 | `NUM_OPERATORS` | Halstead | Total operator token count ($N_1$) |
| 8 | `NUM_OPERANDS` | Halstead | Total operand token count ($N_2$) |
| 9 | `BRANCH_COUNT` | Complexity | Total conditional branch exit paths |

---

## 🛠 Tech Stack

* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, jsPDF & jsPDF-AutoTable.
* **Backend & ML API**: FastAPI (Python 3.12+), Uvicorn, Requests.
* **Machine Learning**: XGBoost (`xgboost>=1.7.6`), Scikit-Learn, NumPy, Pandas.
* **Explainability & AI**: Native Tree SHAP (`pred_contribs=True`), Google Gemini API (`@google/genai`).
* **Database & Auth**: PostgreSQL (Neon Serverless), Prisma ORM, NextAuth.js.
* **Testing**: Pytest (unit, static analysis, ML contract, and pipeline integration tests).

---

## 📋 Prerequisites

* **Node.js**: v18.0.0 or higher
* **Python**: v3.10 or higher
* **PostgreSQL Database**: (e.g., Neon serverless or local Postgres)
* **GitHub Token** *(Optional)*: For higher GitHub API rate limits.
* **Google Gemini API Key** *(Optional)*: For LLM explanations (falls back gracefully if unset).

---

## 🚀 Getting Started & Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/bug-predict.git
cd bug-predict
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Setup Python Virtual Environment & Dependencies
```bash
# Create virtual environment
python -m venv .venv

# Activate on Windows:
.venv\Scripts\activate
# Activate on macOS/Linux:
source .venv/bin/activate

# Install Python ML dependencies
pip install -r api/requirements.txt
```

---

## 🔐 Environment Variables

Create a `.env` or `.env.local` file in the project root:

```env
# Database (PostgreSQL / Neon)
DATABASE_URL="postgresql://username:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-nextauth-secret-key"

# GitHub API Token (Optional, increases rate limits)
GITHUB_TOKEN="ghp_yourGitHubPersonalAccessToken"

# Google Gemini API Key (Optional, uses deterministic fallback if unset)
GEMINI_API_KEY="AIzaSyYourGeminiApiKey"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 💻 Running the Application

### Step 1: Push Prisma Database Schema
```bash
npx prisma db push
```

### Step 2: Start the FastAPI ML Analysis Server (Port 5328)
```bash
# In your Python virtual environment:
python -m uvicorn api.index:app --host 127.0.0.1 --port 5328 --reload
```

### Step 3: Start the Next.js Frontend (Port 3000)
```bash
# In a separate terminal:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the dashboard.

---

## 🧪 Running Automated Tests

The repository includes a comprehensive 24-test suite covering GitHub mining, static AST analyzers, feature schema contracts, model artifacts, and pipeline execution:

```bash
# Run pytest with full verbosity
.venv/bin/pytest -v
# On Windows:
.venv\Scripts\python.exe -m pytest -v
```

---

## 📂 Project Structure

```
bug-predict/
├── api/                             # Python ML Backend Engine
│   ├── data/
│   │   └── SoftwareDefectDataset.csv# Kaggle defect training dataset
│   ├── defect_model.json           # Trained XGBoost Booster
│   ├── gemini_ai.py                # Grounded Gemini explanation & fallback engine
│   ├── github.py                   # GitHub repository mining & ingestion
│   ├── index.py                    # FastAPI server entrypoint
│   ├── ml.py                       # Prediction, feature contract & Tree SHAP
│   ├── model_experiments.json      # Complete CV & benchmark experiment logs
│   ├── model_features.json         # Feature schema & reference scaling bounds
│   ├── model_features.txt          # Ordered feature names
│   ├── model_metadata.json         # Model version & parameters
│   ├── model_metrics.json          # Evaluation & cross-validation metrics
│   ├── requirements.txt            # Python dependencies
│   ├── static_analyzer.py          # Multi-language static code analyzer
│   └── train_model.py              # ML retraining & evaluation pipeline
├── prisma/
│   └── schema.prisma               # Prisma schema (Analysis & File records)
├── src/
│   ├── app/                        # Next.js App Router (Dashboard, Analysis, Auth)
│   │   ├── (app)/analysis/[id]/    # Interactive Analysis Inspector & PDF export
│   │   ├── (app)/dashboard/        # Repository history & summary dashboard
│   │   └── api/analysis/run/       # Next.js analysis route proxy
│   ├── components/                 # UI components
│   └── lib/                        # Prisma client & NextAuth configuration
├── tests/                          # Automated Pytest Suite (24 tests)
│   ├── test_github.py
│   ├── test_ml.py
│   ├── test_ml_experiments.py
│   ├── test_pipeline.py
│   └── test_static_analyzer.py
├── package.json
└── README.md
```

---

## ⚖️ Academic Disclaimer & Limitations

> [!IMPORTANT]
> **Decision Support Notice**:
> This platform predicts **software defect risk** from static code complexity and Halstead metrics using an XGBoost classifier.
> 
> * **Model Risk Estimate**: The prediction represents a **probabilistic risk estimate for decision support** rather than a guarantee that a defect exists in the code.
> * **Static Complexity Signal**: Static code metrics capture cognitive complexity, branching density, and volume—structural factors correlated with defect occurrence—but do not execute or formally verify runtime logic.
> * **Public Repositories**: Currently optimized for public GitHub repositories with source files up to standard limits.

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
