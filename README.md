# CleanSheet AI 📊✨

> **Transform messy, inconsistent spreadsheets into clean, structured, analysis-ready datasets with deterministic precision and Gemini AI assistance.**

CleanSheet AI is a full-stack web application designed to eliminate spreadsheet data chaos. It combines deterministic data cleaning algorithms (powered by Python & Pandas) with Google Gemini AI to interpret natural-language cleaning instructions, propose validated transformation plans, and execute them safely.

---

## 🚀 Key Features

- **Multi-Format Ingestion**: Supports `.csv`, `.tsv`, and `.xlsx` (Excel) spreadsheets up to 25MB with auto-delimiter sniffing and encoding fallback.
- **Instant Profiling & Quality Scoring**: Real-time evaluation of data quality (0–100 score) calculating missingness, duplicates, structural issues, and formatting anomalies.
- **AI-Assisted Cleaning (Google Gemini)**: Describe desired cleaning operations in natural language. Gemini translates intent into a structured JSON plan with human-readable explanations and risk assessments.
- **Deterministic & Safe Execution**: AI never runs arbitrary code. Operations are strictly validated against an allowlist and executed via deterministic Python algorithms.
- **Resilient Heuristic Fallback**: Full functionality even when Gemini or MongoDB are offline. Operates in smart rule-based mode automatically.
- **MongoDB Atlas Integration**: Stores reusable cleaning pipelines (recipes), session audit logs, and user profiles. Gracefully falls back to local in-memory storage if Atlas is unconfigured or unreachable.
- **Zero Raw Data Persistence**: Spreadsheets are processed in volatile memory with a 2-hour TTL. Raw spreadsheet contents are never stored permanently in any database.
- **Interactive Before-and-After Previews**: Compare raw vs cleaned records side-by-side with cell-level change highlighting.
- **Audit Reports & One-Click Export**: Export cleaned datasets to CSV or auto-formatted Excel (`.xlsx`), alongside transparent audit changelogs.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Data Processing** | Pandas 2.2+, OpenPyXL |
| **Database** | MongoDB Atlas (PyMongo) with resilient local fallback |
| **AI Integration** | Google Gemini API (`google-genai` SDK) with heuristic fallback |
| **Testing** | Pytest, HTTPX TestClient |

---

## 📂 Project Architecture

```
CleanSheet AI/
├── backend/
│   ├── app/
│   │   ├── models/          # Pydantic schemas (requests, responses, auth)
│   │   ├── routers/         # API endpoints (data, clean, ai, recipes, history, auth, health)
│   │   ├── services/        # Business logic (cleaning_engine, ai_cleaner, auth, session_storage)
│   │   ├── config.py        # Environment settings (pydantic-settings)
│   │   ├── database.py      # MongoDB Atlas client & in-memory fallback
│   │   └── main.py          # FastAPI application & lifespan manager
│   ├── tests/               # Pytest automated test suite (17 comprehensive tests)
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template
│   └── .env                 # Local configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # React components (Navbar, Console, Table, Modals, etc.)
│   │   ├── services/        # Axios API client
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx          # Main dashboard coordinator
│   │   └── main.tsx         # React root
│   ├── package.json         # Frontend dependencies & scripts
│   └── vite.config.ts       # Vite proxy and configuration
├── sample_data/
│   ├── messy_sales_data.csv # Realistically messy CSV test file
│   └── messy_customers.xlsx # Realistically messy Excel test file
├── .env.example             # Root configuration reference
└── README.md                # Documentation & setup guide
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** (tested on Python 3.12)
- **Node.js 18+** & npm
- (Optional) **MongoDB Atlas URI** & **Google Gemini API Key**

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
# Windows:
python -m venv .venv
.\.venv\Scripts\activate

# macOS / Linux:
# python3 -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Copy .env.example to .env and optionally add your Atlas URI and Gemini key
cp .env.example .env

# Run FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend API will start at `http://127.0.0.1:8000` (API documentation available at `http://127.0.0.1:8000/docs`).

---

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```

The frontend application will be live at `http://localhost:5173`.

---

## 🧪 Running Automated Tests

Run the complete backend test suite covering duplicate handling, missing-value imputation, inconsistent dates, currency parsing, identifier preservation, empty files, downloads, AI fallback, and database resilience:

```bash
cd backend
.\.venv\Scripts\pytest -v
```

All 17 tests run in under 4 seconds with zero failures.

---

## 🔒 Security & Privacy Guarantees

1. **Zero Long-Term Storage**: Uploaded files reside only in volatile RAM with an explicit 2-hour TTL. No raw spreadsheet contents are written to MongoDB.
2. **Deterministic AI Boundaries**: Gemini AI proposes transformation parameters; execution is performed by audited, pure Python routines. `eval()` or arbitrary dynamic code execution is strictly prohibited.
3. **Privacy Masking**: Gemini only receives column names, inferred data types, and up to 2 anonymized sample snippets. Entire datasets never leave your private server.
4. **Secure Authentication**: User passwords are encrypted with bcrypt salt hashes. JWT bearer tokens are issued with expiry. Guest mode is supported out of the box without requiring registration.
5. **Connection Honesty**: The system tests MongoDB with a direct ping (`client.admin.command('ping')`) and never claims connection without verification.

---

## 📊 Sample Datasets for Instant Testing

CleanSheet AI includes realistic messy datasets ready for one-click testing:
- **`sample_data/messy_sales_data.csv`**: Unquoted currency strings (`$1,200.50`), mixed date formats (`2023-01-15`, `15/01/2023`, `Jan 16, 2023`), leading-zero customer codes (`00101`), duplicate orders (`ORD-002`, `ORD-009`), and missing values.
- **`sample_data/messy_customers.xlsx`**: Excel file with mixed casing (`BOB DYLAN`), leading spaces (`  alice cooper  `), boolean flags (`yes`, `1`, `true`), and missing email addresses.

Click **Messy Sales (CSV)** or **Messy Customers (Excel)** in the dashboard to test instantly!
