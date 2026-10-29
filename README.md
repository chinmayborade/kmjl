# UK Wind Forecast Portal: Day-Ahead Power Procurement Desk

A full-stack quantitative decision support application for a UK energy utility trading desk. It enables day-ahead procurement teams to evaluate wind generation forecasts available at auction gate closure, strictly enforces zero look-ahead bias, and quantifies forecast error distributions and risk percentiles across delivery days in **January 2026**.

**Live Demo:** [https://kmjl.vercel.app](https://kmjl.vercel.app) &nbsp;|&nbsp; **API Docs:** [https://kmjl.vercel.app/docs](https://kmjl.vercel.app/docs) &nbsp;|&nbsp; **Repo:** [https://github.com/chinmayborade/kmjl](https://github.com/chinmayborade/kmjl)

---

## 1. Directory Structure

```text
.
├── Dockerfile                  # Multi-stage production container build (Node.js + Python)
├── docker-compose.yml          # Container orchestration with volume mounts
├── pytest.ini                  # Pytest runner configuration
├── requirements.txt            # Backend dependencies reference
├── backend/
│   ├── requirements.txt        # Backend dependencies (FastAPI, pandas, pyarrow, etc.)
│   ├── app/
│   │   ├── main.py             # FastAPI entry point & static SPA mount
│   │   ├── config.py           # Environment-driven settings (pydantic-settings)
│   │   ├── data/
│   │   │   └── loader.py       # In-memory Parquet cache & evaluation alignment manager
│   │   ├── routes/
│   │   │   ├── health.py       # System health & data coverage (/api/health, /api/config)
│   │   │   ├── forecast.py     # Decision forecasts & curve feeds (/api/decision-forecast)
│   │   │   └── metrics.py      # Statistical evaluation endpoints (/api/metrics, /api/error-distribution)
│   │   └── services/
│   │       ├── decision_forecast.py # Strict zero look-ahead decision rule & lineage tracking
│   │       ├── metrics.py      # Bias (ME), MAE, RMSE, nMAE, and horizon quantiles (P10-P90)
│   │       └── alignment.py    # Temporal alignment (hourly WINDFOR to 30-min settlement periods)
│   ├── scripts/
│   │   ├── refresh_data.py     # Offline ingestion from Elexon BMRS API (FUELHH & WINDFOR)
│   │   └── run_benchmarks.py   # Latency & load verification script
│   └── tests/
│       ├── conftest.py         # Test fixtures & synthetic datasets
│       ├── test_api.py         # API contract & response schema tests
│       ├── test_decision_forecast.py # Look-ahead exclusion & cutoff equality tests
│       ├── test_edge_cases.py  # 12 boundary tests (microsecond leaks, 0 MW division, 31-day loop)
│       └── test_metrics.py     # Hand-computed accuracy metric validations
├── data/
│   ├── actuals.parquet         # Cleaned Elexon FUELHH actual wind generation (1,728 rows)
│   ├── forecasts.parquet       # Elexon WINDFOR national wind forecasts (21,024 rows)
│   └── metadata.json           # Ingestion timestamp & coverage bounds
├── docs/
│   ├── edge_cases_report.md    # Comprehensive test execution & benchmark report
│   ├── reint_challenge.txt     # Original challenge requirements brief
│   └── uk_wind_design.txt      # Architecture and delivery specification
└── frontend/
    ├── package.json            # React 19, TypeScript, Vite, Recharts, React Flow
    ├── vite.config.ts          # Vite build config with /api dev proxy
    ├── src/
    │   ├── api/client.ts       # Typed Axios API client
    │   ├── types/index.ts      # TypeScript interfaces mirroring API contracts
    │   ├── context/
    │   │   └── ProcurementContext.tsx # Global state for delivery date, cutoff, and feeds
    │   └── components/
    │       ├── decision/       # Decision Desk (Power curves, deltas, 48-period settlement table)
    │       ├── pipeline/       # React Flow visual interactive DAG with look-ahead audit node
    │       ├── accuracy/       # Metric scorecards (MAE, RMSE, nMAE, Bias by horizon bucket)
    │       └── risk/           # Signed error distribution histogram & P10/P90 hedge envelope
```

---

## 2. Core Methodology & Zero Look-Ahead Rule

To procure electricity on day $D-1$ for delivery day $D$, a trader relies on forecasts published prior to auction gate closure.

### Decision Rule Algorithm (`app/services/decision_forecast.py`)
1. **Target Filtering:** Select all forecast records with `startTime` falling within delivery day $D$ ($00:00:00$ to $23:59:59$ UTC).
2. **Cutoff Exclusion:** Retain only rows where `publishTime <= cutoff_datetime` on Day $D-1$ (Default: `12:00:00 UTC`, configurable to `11:00` or `14:00`). Any forecast published even $1\,\text{ms}$ after cutoff is rejected.
3. **Latest Revision Selection:** Sort remaining records and select the latest `publishTime` per target timestamp.
4. **Settlement Period Mapping:** Expand hourly forecasts across 48 standard half-hour UK settlement periods.
5. **Lineage Audit:** Every API response returns audit counters: `forecasts_eligible`, `forecasts_superseded`, `forecasts_excluded_post_cutoff`, and `leaked_periods` (which must be strictly `0`).

---

## 3. How to Start the Application Locally

### Option A: Using Docker & Docker Compose (Recommended)

1. **Build and launch container:**
   ```bash
   docker compose up --build
   ```
2. **Access application:**
   - Web App UI: [http://localhost:8000](http://localhost:8000)
   - Interactive Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Health Endpoint: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option B: Running Manually Without Docker

#### Step 1: Start Backend (Python 3.11+)
```bash
# From repository root
cd backend
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 2: Start Frontend (Node 20+)
```bash
# In a separate terminal, from repository root
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. (API requests are automatically proxied to `http://localhost:8000`).

---

## 4. Running Tests & Benchmarks

Run the complete test suite (26 tests including look-ahead edge cases):
```bash
# From repository root
pytest -v
```

Run latency and throughput benchmarks:
```bash
python backend/scripts/run_benchmarks.py
```

---

## 5. Project Links & Deployment

| Resource | URL | Description |
| :--- | :--- | :--- |
| **Live Web Application** | [https://kmjl.vercel.app](https://kmjl.vercel.app) | Production deployment hosted on Vercel |
| **Interactive API Docs (Swagger)** | [https://kmjl.vercel.app/docs](https://kmjl.vercel.app/docs) | FastAPI OpenAPI documentation & test console |
| **System Health & Coverage** | [https://kmjl.vercel.app/api/health](https://kmjl.vercel.app/api/health) | In-memory dataset verification & alignment count |
| **Public GitHub Repository** | [https://github.com/chinmayborade/kmjl](https://github.com/chinmayborade/kmjl) | Full source code with Docker & test suite |
| **Video Demo (YouTube)** | `https://youtu.be/<YOUR_VIDEO_ID>` *(Insert unlisted link)* | Part 1 (Client pitch ≤5 min) + Part 2 (Tech walkthrough ≤5 min) |

> *Note: All live links are verified accessible in an incognito window with full zero look-ahead decision views and settlement table functionality.*

---

## 6. AI Tool Usage Disclosure

As required by Section 2 of the project brief:
- AI tools (Anthropic Claude Opus 3.7 / 5.5 and Google Gemini via Antigravity) were utilized during the development of this project.

