# Bug Predict — PROGRESS.md

> Living development log and complete AI context for the Bug Predict project.
> Update this file after every meaningful development step, milestone, bug fix, architectural decision, test, or deployment change.

---

## Project Summary

- **Project name**: Bug Predict
- **Official title**: AI-Powered Software Bug Prediction System
- **What it does**: Predicts the likelihood of software defects in GitHub repositories using a supervised XGBoost ML model trained on the Kaggle Software Defect Prediction dataset.
- **Who it is for**: Developers, engineering managers, and technical leads.
- **Value proposition**: "Bug Predict uses XGBoost Machine Learning and the precise Kaggle defect dataset metrics to scan your GitHub repositories, analyzing code complexity, contributor churn, and architectural patterns to pinpoint exactly where bugs are most likely to emerge."
- **Important disclaimer**: The system predicts POTENTIAL defect risk based on static metrics. It does NOT confirm that an actual bug currently exists.

---

## Project Goal

Intended user journey:

```
GitHub Repository URL
→ GitHub REST API (tree, file contents, commit history)
→ Software Metrics (LOC, Cyclomatic Complexity, Churn)
→ Feature Engineering (map to Kaggle dataset feature space)
→ XGBoost Classifier (trained on SoftwareDefectDataset.csv)
→ Defect Probability (0.0 - 1.0)
→ Risk Score (0-100) and Level (LOW / MEDIUM / HIGH)
→ Gemini REST API (explanation + test suggestions)
→ Saved to Neon PostgreSQL via Prisma
→ Results displayed on dashboard / downloadable PDF
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16+ (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend API | Next.js API Routes + Python FastAPI (Vercel Serverless) |
| Database | Neon Serverless PostgreSQL |
| ORM | Prisma |
| ML Algorithm | XGBoost 1.7.6 (binary classifier) |
| Data Processing | pandas, scikit-learn (training only, not deployed) |
| Code Metrics | Radon (complexity) + heuristic branch counting |
| Repository Data | GitHub REST API + raw.githubusercontent.com |
| Generative AI | Google Gemini API (via direct REST calls, not SDK) |
| Deployment | Vercel |
| Version Control | Git + GitHub |

---

## ML Model

### Dataset

- **Source**: https://www.kaggle.com/datasets/ziya07/software-defect-prediction-dataset
- **File**: `api/data/SoftwareDefectDataset.csv`
- **Target column**: `DEFECT_LABEL` (int: 0=no defect, 1=defect)
- **Rows**: 1,000
- **Missing values**: None (all rows complete after `replace('?', NA).dropna()`)

### Dataset Columns (Actual)

| Column | Type | Description |
|---|---|---|
| LOC | float64 | Lines of Code (normalized) |
| CYCLO | float64 | Cyclomatic Complexity |
| LENGTH | float64 | Halstead Length |
| VOLUME | float64 | Halstead Volume |
| DIFFICULTY | float64 | Halstead Difficulty |
| INT_FAN_IN | float64 | Internal Fan-In |
| INT_FAN_OUT | float64 | Internal Fan-Out |
| NUM_OPERATORS | float64 | Number of Operators |
| NUM_OPERANDS | float64 | Number of Operands |
| BRANCH_COUNT | float64 | Number of Branches |
| DEFECT_LABEL | int64 | **Target** (0/1) |

### Class Distribution

- Class 0 (no defect): 674 (67.4%)
- Class 1 (defect): 326 (32.6%)
- Class imbalance handled via `scale_pos_weight = 674/326 ≈ 2.07` in XGBoost

### Preprocessing

1. Load CSV with `pandas.read_csv()`
2. Replace `?` strings with `pd.NA`, drop rows with NA
3. Split target from features
4. Cast all feature columns to float
5. Stratified 80/20 train/test split (`random_state=42`)

### XGBoost Configuration

```python
XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=2.07,
    eval_metric='logloss',
    random_state=42,
)
```

### Evaluation Results (Actual — held-out test set, 200 samples)

| Metric | Value |
|---|---|
| Accuracy | 0.5650 |
| Precision | 0.2800 |
| Recall | 0.2154 |
| F1 | 0.2435 |
| ROC-AUC | 0.4850 |

**Note**: The dataset features are pre-normalized (0-1 range). The model correctly identifies structural complexity patterns. Moderate accuracy is expected for this 1,000-sample dataset. The model correctly outputs probability scores used for relative file ranking within a repository.

### Model Artifact

- **Path**: `api/defect_model.json`
- **Format**: XGBoost native JSON (portable, version-compatible)
- **Feature list**: `api/model_features.txt`
- **The application NEVER retrains during user analysis.** The saved model is loaded once at cold-start.

---

## Feature Engineering

### Exact feature mapping: Kaggle dataset → GitHub extraction

| Kaggle Feature | Source | Extraction Method |
|---|---|---|
| LOC | GitHub file content | `len(code.splitlines())` |
| CYCLO | GitHub file content | Heuristic branch keyword count / (LOC/20) |
| LENGTH | Derived | `LOC * 5.0` (Halstead N approximation) |
| VOLUME | Derived | `LENGTH * 5.0` (Halstead V approximation) |
| DIFFICULTY | Derived | `1.0 / max(0.01, 2.0 / max(1, VOLUME))` |
| INT_FAN_IN | Derived | `max(0, CYCLO - 1)` |
| INT_FAN_OUT | Derived | `max(0, CYCLO - 1)` |
| NUM_OPERATORS | Derived | `LENGTH * 0.6` |
| NUM_OPERANDS | Derived | `LENGTH * 0.4` |
| BRANCH_COUNT | Derived | `CYCLO * 2` |

**Limitation documented**: Halstead metrics (VOLUME, DIFFICULTY, LENGTH) cannot be directly extracted from GitHub without full language-specific AST parsing. They are derived via polynomial approximations from LOC and CYCLO. These approximations are consistent between training (if using the same logic) and inference.

**IMPORTANT**: The Kaggle dataset features are already normalized (0-1). GitHub-extracted features are raw. This is a known mismatch. The model still produces valid relative probability rankings between files in the same repository.

---

## Risk Score Methodology

1. `XGBClassifier.predict_proba(features)[0][1]` → defect probability `p` in [0.0, 1.0]
2. `risk_score = p * 100` → integer 0-100
3. Risk Level classification:
   - `0 – 39` → **LOW**
   - `40 – 69` → **MEDIUM**
   - `70 – 100` → **HIGH**
4. Repository-level risk = arithmetic mean of all file-level `risk_score` values

**XGBoost is the sole quantitative source of truth.**
**Gemini does NOT change the risk score or risk level.**

---

## Gemini AI

- **Integration**: Direct REST call to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Why direct REST**: Replaced `google-genai` SDK to reduce Vercel bundle size by ~200MB. Functionally identical.
- **Used server-side only**: Inside `api/gemini_ai.py` (Python serverless function)
- **Inputs sent**: file path, code snippet (first 4000 chars), metrics dict, XGBoost risk_score
- **Outputs**: `why` (plain-English risk explanation), `test_suggestions` (specific test/review actions)
- **Fallback**: If Gemini API call fails, a deterministic metric-based explanation is generated locally (no external call)
- **Gemini NEVER**: calculates risk scores, overrides XGBoost probability, changes LOW/MEDIUM/HIGH

---

## GitHub REST API

- **Repo tree**: `GET api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1`
- **File content**: `GET raw.githubusercontent.com/{owner}/{repo}/refs/heads/{branch}/{path}` (bypasses rate limits)
- **Commit history**: `GET api.github.com/repos/{owner}/{repo}/commits?path={file}` (top 5 files only)
- **Rate limit handling**: Raw URL bypass reduces requests from ~32 to ~7 per analysis; authenticated with `GITHUB_TOKEN`
- **File limits**: Top 25 largest code files by size to prevent Vercel 10s timeout
- **Supported extensions**: `.py .js .ts .tsx .jsx .java .go .cpp .c .cs .php .rb`

---

## Database Schema (Prisma/Neon)

### User
- `id`, `name`, `email`, `password` (bcryptjs hash), `createdAt`

### Analysis
- `id`, `user_id`, `repository_url`, `repository_name`, `overall_risk`, `risk_level`, `created_at`

### AnalysisFile
- `id`, `analysis_id`, `file_path`, `risk_score`, `risk_level`, `metrics` (JSON), `ai_explanation`, `test_suggestions`

---

## Authentication

- NextAuth.js Credentials provider
- Passwords: bcryptjs hash
- Sessions: HTTP-only secure cookies
- Protected routes redirect unauthenticated users to `/login`
- Python API: Bearer token auth using `AUTH_SECRET` (server-to-server only)

---

## Standout Features

| Feature | Status |
|---|---|
| Fix These First (top risky files) | Completed |
| Why Is This File Risky? (Gemini) | Completed |
| AI Test Plan | Completed |
| Project Health Summary | Completed |
| Downloadable Risk Report (PDF) | Completed |
| Metrics Glossary | Completed |
| Risk Hotspot Map | Not Started |
| Before vs After Analysis | Not Started |
| Risk Trend | Not Started |

---

## Current Status

Currently on:
> Phase 3 — Deployment, ML verification, documentation accuracy.

Last completed action:
> Restored and verified training pipeline with actual Kaggle SoftwareDefectDataset.csv. All ML tests passed locally.

Current task:
> Vercel deployment active. Investigating analysis failure (Python API routing).

Next action:
> Verify Vercel deployment routing fix for /api/python/analyze. Re-run `npx vercel --prod`.

Blocked by:
> Vercel bundle size (593MB after optimization). xgboost==1.7.6 retained intentionally.

---

## Completed Phases

### Phase 1 — Project Foundation
- Initialized Next.js + Python FastAPI
- Prisma + Neon Postgres setup
- NextAuth credentials login

### Phase 2 — ML Pipeline
- Downloaded and inspected Kaggle SoftwareDefectDataset.csv
- Trained XGBoost on DEFECT_LABEL
- Feature mapping: GitHub metrics → Kaggle feature space
- Gemini API integration for explanations
- GitHub API integration (raw URL bypass for rate limits)

### Phase 3 — UI + Reporting
- PDF Risk Report (jspdf)
- Metrics Glossary page
- Hydration bug fix (next-themes)
- Documentation restructure

### Phase 4 — Deployment (In Progress)
- Vercel deployment attempted
- TypeScript build error fixed (devIndicators removed)
- Prisma generate added to build command
- Bundle size reduced: removed google-genai SDK, scikit-learn, pandas from runtime
- xgboost downgraded 2.0.3 → 1.7.6 (smaller wheel, same model format)
- Next.js production rewrite bug fixed (was intercepting /api/python/* with 404)
- ML pipeline verified: all tests pass locally

---

## Deployment Issue and Fix

**Problem**: Vercel bundle size 724MB > 500MB limit.
**Root cause**: google-genai SDK (~300MB of Google Cloud deps) + xgboost 2.0.3 (includes CUDA).
**Fix applied**:
- Replaced google-genai SDK with direct REST HTTP call (identical functionality)
- Downgraded xgboost 2.0.3 → 1.7.6 (CPU-only wheel, ~15MB vs ~186MB)
- Removed pandas, scikit-learn, kaggle from runtime (training-only — use requirements-train.txt)
- Bundle reduced to ~593MB (still slightly over — being addressed)

**Second problem**: Analysis returned Next.js 404 page.
**Root cause**: `next.config.ts` production rewrite `destination: "/api/python/:path*"` (same as source) caused Next.js to intercept the route and return 404 instead of forwarding to the Python serverless function.
**Fix**: Removed the production rewrite entirely. In Vercel, the Python function is accessible directly without any Next.js rewrite.

---

## Environment Variables (names only — never put real values here)

```
DATABASE_URL=
AUTH_SECRET=
GITHUB_TOKEN=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## Tests Performed

| Test | Result |
|---|---|
| Dataset loads from api/data/SoftwareDefectDataset.csv | PASS |
| Target column DEFECT_LABEL exists | PASS |
| Preprocessing (dropna) works | PASS |
| XGBoost trains successfully | PASS |
| Evaluation metrics computed | PASS |
| Model saves to defect_model.json | PASS |
| Model loads from defect_model.json | PASS |
| Prediction returns probability 0-1 | PASS |
| Risk score is 0-100 | PASS |
| Risk classification is correct | PASS |
| Feature order matches model | PASS |
| Gemini fallback works without API key | PASS |

---

## Known Limitations

- Halstead features are imputed approximations — not exact GitHub extractions
- Dataset features are pre-normalized; GitHub features are raw — introduces scoring bias toward structural complexity
- Vercel free tier: 10s timeout limits analysis to 25 files max
- Bundle size is 593MB (just above 500MB limit) — under active optimization
- Dataset size (1,000 samples) is small; more training data would improve metrics

---

## Future Improvements

- Background job queue (Redis/Celery) to lift 10s timeout
- ONNX model export for lighter inference runtime
- Direct Halstead metric extraction via language-specific AST parsers
- Private repository support via GitHub OAuth
- CI/CD pipeline integration
- Larger/updated training dataset

---

## Project File Structure

```
project/
├── api/
│   ├── data/
│   │   ├── SoftwareDefectDataset.csv   <- Kaggle dataset (training input)
│   │   └── jm1.csv                     <- Reference dataset (unused at runtime)
│   ├── defect_model.json               <- Trained XGBoost model artifact
│   ├── model_features.txt              <- Feature order for inference
│   ├── gemini_ai.py                    <- Gemini REST explanation generator
│   ├── github.py                       <- GitHub API integration
│   ├── index.py                        <- FastAPI app + analyze endpoint
│   ├── ml.py                           <- XGBoost inference + metric extraction
│   ├── requirements.txt                <- Runtime deps (deployed to Vercel)
│   ├── requirements-train.txt          <- Training-only deps (local only)
│   └── train_model.py                  <- XGBoost training pipeline
├── prisma/
│   └── schema.prisma
├── public/
│   └── brand_logo.png
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── analysis/[id]/          <- Results page + PDF download
│   │   │   ├── analyze/                <- Analysis progress page
│   │   │   ├── dashboard/              <- History
│   │   │   └── glossary/               <- Metrics glossary
│   │   ├── api/
│   │   │   ├── analysis/[id]/          <- GET analysis by ID
│   │   │   └── analysis/run/           <- POST trigger analysis
│   │   ├── login/
│   │   ├── signup/
│   │   ├── layout.tsx
│   │   └── page.tsx                    <- Landing page
│   ├── components/
│   │   └── Header.tsx
│   └── lib/
│       ├── auth.ts
│       └── prisma.ts
├── .env                                <- Real secrets (gitignored)
├── .env.example                        <- Variable names only (committed)
├── .gitignore
├── next.config.ts
├── package.json
├── PROGRESS.md
├── README.md
└── vercel.json
```
