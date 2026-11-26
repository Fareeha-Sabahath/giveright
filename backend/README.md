# GiveRight — Python FastAPI + Google OR-Tools ILP Backend

This folder contains the true **Google OR-Tools (`pywraplp`) SCIP/CBC Integer Linear Programming** microservice for GiveRight.

## Setup & Execution

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Once running at `http://localhost:8000`, switch the solver mode on GiveRight's **Matching Engine** page from **Client-Side TypeScript ILP Demo Solver** to **Python FastAPI + Google OR-Tools Backend** to execute live SCIP/CBC optimization over HTTP.
