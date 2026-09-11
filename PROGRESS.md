# 🐞 PROGRESS.md — Bug Predict

> Living development log and complete AI context for the Bug Predict project.
> Update this file after every meaningful development step, milestone, bug fix, architectural decision, test, or deployment change.

---

## 🧠 Project Summary

- **Project name**: Bug Predict
- **Official project title**: AI-Powered Software Bug Prediction System
- **What the project does**: Predicts the likelihood of software defects in GitHub repositories using machine learning and provides human-readable explanations via LLMs.
- **The problem it solves**: Proactively identifies high-risk areas in large codebases before bugs reach production, moving beyond simple static linting into historical and complexity-based prediction.
- **Who it is designed for**: Developers, engineering managers, and technical leads.
- **Main value proposition**: 
  "Bug Predict uses XGBoost Machine Learning and the precise Kaggle defect dataset metrics to scan your GitHub repositories, analyzing code complexity, contributor churn, and architectural patterns to pinpoint exactly where bugs are most likely to emerge."

*Disclaimer: The system predicts potential defect risk based on historical software metrics and does NOT confirm that an actual bug currently exists in the code.*

---

## 🎯 Project Goal

To provide a seamless, full-stack application that analyzes public GitHub repositories and generates actionable insights on code health. 

**Intended User Journey**:
GitHub Repository → GitHub REST API → Repository/Data Collection → Software Metrics → Feature Engineering → XGBoost → Defect Risk Prediction → Risk Analysis → Gemini Explanation → Recommended Actions → Suggested Tests → Saved Analysis → History / Comparison.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Backend/API | Next.js API Routes + Python FastAPI Serverless Functions |
| Database | Neon PostgreSQL |
| ORM | Prisma |
| ML | Python |
| ML Algorithm | XGBoost |
| Data Processing | pandas, scikit-learn |
| Code Metrics | Radon |
| Repository Data | GitHub REST API & raw.githubusercontent.com |
| Generative AI | Google Gemini API |
| Package Manager | npm (Node) / pip (Python) |
| Deployment | Vercel |
| Version Control | Git + GitHub |

---

## 🔬 ML MODEL

### Dataset
- **Dataset**: https://www.kaggle.com/datasets/ziya07/software-defect-prediction-dataset
- **Dataset file**: SoftwareDefectDataset.csv
- **Target**: `DEFECT_LABEL` (boolean or probabilistic representation of defect existence)

**Current Implementation**:
- The dataset is cleaned (handling missing `?` values) and split into train/test sets.
- An `XGBClassifier` is trained on the dataset using Python's `xgboost` library.
- The trained model is serialized and exported to `api/defect_model.json`.
- During inference (`api/ml.py`), the model is loaded to predict the probability of defects for new GitHub repository files.
- The model outputs a raw probability score (0.0 - 1.0).

---

## 🧩 Feature Engineering

- **Direct Features**: `loc` (Lines of Code) and `cyclomatic_complexity` (measured using `radon` for Python scripts) map directly to the Kaggle dataset (`loc` and `v(g)`).
- **Imputed/Mapped Features**: Exact Halstead metrics (volume, effort, operator counts) are computationally expensive to calculate quickly for every language on GitHub. Instead, these are mapped/imputed based on strong correlations with LOC and Cyclomatic Complexity derived from the training set.
- **Historical Features**: GitHub `commit_count` and `contributor_count` are fetched to enrich the data, but the XGBoost model evaluates the codebase metrics strictly aligned to its training data.
- **Strict Rule**: We do not randomly invent missing feature values. Missing values are handled via deterministic imputation scaling based on file length/complexity.

---

## 📊 Model Evaluation

- **Status**: ✅ Completed.
- Model trains successfully via `api/train_model.py`.
- Generates `defect_model.json`.
- Effectively identifies massive, complex files (e.g. 200,000 line monoliths) as extremely high risk based on training parameters. 

---

## 🎯 Risk Score Methodology

The `XGBClassifier` outputs a raw defect probability score between 0.0 and 1.0. This is multiplied by 100 to get the Risk Score (0-100).

**Risk Levels**:
- **LOW**: 0–39
- **MEDIUM**: 40–69
- **HIGH**: 70–100

*XGBoost is the absolute quantitative source of truth. Gemini does not modify or override the numerical prediction or the risk level assigned to a file.*

---

## 🧠 Gemini AI

- **Integration**: Google Gemini API via `google-genai` Python SDK.
- **Usage**: Used strictly on the server-side (`api/gemini_ai.py`).
- **Inputs**: File path, raw code snippet, extracted software metrics, and the XGBoost Risk Score.
- **Output**: Generates a JSON-structured response containing a plain-English explanation of why the code is risky and actionable test suggestions.
- **Limitation**: Gemini is used exclusively for explanation and recommendations, **not** for quantitative defect prediction.

---

## 🐙 GitHub REST API

**Current Implementation** (`api/github.py`):
- Uses `api.github.com` to fetch the default branch and the recursive repository tree.
- Uses `raw.githubusercontent.com` to fetch the actual raw file contents, successfully bypassing the strict 60 requests/hour authenticated limit for downloading code.
- Fetches commit history (`/commits?path=`) for the top 5 riskiest files to determine `commit_count` and `contributor_count`.
- Handles rate-limiting by skipping expensive commit-history requests for low-risk files.
- Limits scanning to the top 25 largest code files to prevent Vercel Serverless Function 10-second timeouts.

---

## 🗄️ Database

**Prisma & Neon PostgreSQL Schema**:

### User
- `id` (String)
- `name` (String)
- `email` (String, unique)
- `password` (String)
- `createdAt` (DateTime)

### Analysis
- `id` (String)
- `user_id` (String, relation to User)
- `repository_url` (String)
- `repository_name` (String)
- `overall_risk` (Float)
- `risk_level` (String)
- `created_at` (DateTime)

### AnalysisFile
- `id` (String)
- `analysis_id` (String, relation to Analysis)
- `file_path` (String)
- `risk_score` (Float)
- `risk_level` (String)
- `metrics` (JSON)
- `ai_explanation` (String)
- `test_suggestions` (String)

---

## 🔐 Authentication

- Uses **NextAuth.js** with a Credentials Provider.
- Passwords are securely hashed using `bcryptjs`.
- Session tokens are maintained via secure HTTP-only cookies.
- Protected routes (Dashboard, Analyze) redirect unauthenticated users to `/login`.
- Row-level isolation ensures users can only view their own `Analysis` history.

---

## 🎨 UI / UX

### Landing
- Bug Predict custom branding (shield/bug logo).
- Hero section with gradient text.
- Product description and value propositions.
- Clean pricing tier layout.
- Login/Signup CTA navigation.

### Dashboard
- Displays user's recent analyses.
- Overview of project health.
- Quick link to start a new analysis.

### New Analysis
- Input for GitHub URL.
- Live progress steps (Fetching, Extracting, ML Scoring, AI Explanation).
- Graceful error handling for invalid repos or rate limits.

### Results
- Executive Summary (Overall Risk, Health, Risk Distribution).
- "Fix These First" section for top riskiest files.
- Why Is This File Risky? (Gemini-generated explanation).
- Recommended Actions & Test Plan.
- **Download Risk Report** (PDF Generation).

### Metrics Glossary
- Dedicated `/glossary` page defining Cyclomatic Complexity, LOC, Defect Probability, etc.

---

## ⭐ Standout Features

| Feature | Status |
|---|---|
| Fix These First | ✅ |
| Why Is This File Risky? | ✅ |
| AI Test Plan | ✅ |
| Project Health | ✅ |
| Downloadable Risk Report | ✅ |
| Metrics Glossary | ✅ |
| Risk Hotspot Map | ⬜ |
| Before vs After Analysis | ⬜ |
| Risk Trend | ⬜ |

---

## 📈 Current Status

Currently on:
> Phase 3 — Refinement, PDF Reports, and Documentation Consolidation.

Last completed action:
> Restructured PROGRESS.md according to strict guidelines. Fixed next-themes hydration mismatch bug in Header.tsx.

Current task:
> Finalizing documentation rewrite.

Next action:
> Await further feature requests or enhancements to the risk hotspot map.

Blocked by:
> None.

---

## ✅ Completed Phases

### Phase 1 — Project Foundation ✅
- Initialized Next.js frontend and Python FastAPI backend.
- Created `api/index.py` and basic routing.
- Set up Tailwind CSS styling.

### Phase 2 — Authentication & ML Pipeline ✅
- Integrated Neon Postgres and Prisma.
- Implemented NextAuth credentials login.
- Trained XGBoost on Kaggle Defect Dataset.
- Connected Google Gemini API for explanations.
- Integrated GitHub API for repository fetching.

### Phase 3 — UI Refinement & Reporting ✅
- Added metrics glossary.
- Bypassed GitHub rate limits using `raw.githubusercontent.com`.
- Added client-side PDF Generation (`jspdf`) for Risk Reports.
- Consolidated internal documentation into `PROGRESS.md`.
- Fixed hydration mismatches on the client theme toggle.

---

## 📁 Project Structure

```text
project/
├── api/
│   ├── data/
│   ├── defect_model.json
│   ├── gemini_ai.py
│   ├── github.py
│   ├── index.py
│   ├── ml.py
│   ├── requirements.txt
│   └── train_model.py
├── prisma/
│   └── schema.prisma
├── public/
│   └── brand_logo.png
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── analysis/[id]/
│   │   │   ├── analyze/
│   │   │   ├── dashboard/
│   │   │   └── glossary/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── Header.tsx
│   └── lib/
│       ├── auth.ts
│       └── prisma.ts
├── .env
├── package.json
├── PROGRESS.md
├── README.md
└── tailwind.config.ts
```
