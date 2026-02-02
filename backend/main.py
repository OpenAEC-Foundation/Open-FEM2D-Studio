"""
FastAPI backend for the OpenSees-based FEM solver.

Provides endpoints:
  POST /api/solve         — Run FEM analysis
  POST /api/chat          — AI agent via Claude CLI
  GET  /api/erpnext/projects — Search ERPNext projects
  GET  /api/erpnext/project/{name} — Get ERPNext project details

Uses openseespy for the analysis engine. Since openseespy uses global state,
a threading lock serialises concurrent requests.
"""

import os
import threading
import traceback
import subprocess

import requests as http_requests
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

import openseespy.opensees as ops

from model_builder import build_model
from result_extractor import extract_results

app = FastAPI(title="Open FEM2D Solver Backend")

# ── ERPNext configuration ────────────────────────────────────────────────────
ERPNEXT_URL = os.environ.get("ERPNEXT_URL", "")
ERPNEXT_API_KEY = os.environ.get("ERPNEXT_API_KEY", "")
ERPNEXT_API_SECRET = os.environ.get("ERPNEXT_API_SECRET", "")

# CORS for local development (Vite dev server on port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenSeesPy uses global state — serialise access
_solver_lock = threading.Lock()


# ── Request / Response models ────────────────────────────────────────────────

class SolveRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    beams: List[Dict[str, Any]]
    materials: List[Dict[str, Any]]
    analysisType: str = "frame"
    geometricNonlinear: bool = False


class SolveResponse(BaseModel):
    success: bool
    displacements: Optional[List[float]] = None
    reactions: Optional[List[float]] = None
    beamForces: Optional[Dict[str, Any]] = None
    nodeIdOrder: Optional[List[int]] = None
    error: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    with _solver_lock:
        try:
            data = req.model_dump()

            # Build the OpenSeesPy model (calls ops.wipe + ops.model internally)
            metadata = build_model(data)

            # Configure analysis
            ops.system("BandSPD")
            ops.numberer("RCM")
            ops.constraints("Transformation")

            geom_nl = data.get("geometricNonlinear", False)

            if geom_nl:
                # P-Delta: use load stepping for convergence
                ops.test("NormDispIncr", 1e-8, 50)
                ops.algorithm("Newton")
                ops.integrator("LoadControl", 0.1)
                ops.analysis("Static")
                result_code = ops.analyze(10)
            else:
                # Linear static analysis
                ops.algorithm("Linear")
                ops.integrator("LoadControl", 1.0)
                ops.analysis("Static")
                result_code = ops.analyze(1)

            if result_code != 0:
                return SolveResponse(
                    success=False,
                    error=f"Analysis did not converge (code {result_code})",
                )

            # Calculate reactions
            ops.reactions()

            # Extract results
            result = extract_results(data, metadata)
            return SolveResponse(**result)

        except Exception as e:
            traceback.print_exc()
            return SolveResponse(success=False, error=str(e))


# ── AI Chat endpoint (Claude CLI) ───────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None  # Model context for the agent


class ChatResponse(BaseModel):
    response: Optional[str] = None
    error: Optional[str] = None


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        system_prompt = (
            "You are a structural engineering AI assistant inside Open FEM2D Studio. "
            "Help the user with structural analysis, design checks, code compliance, "
            "and modelling questions. Be concise and technical."
        )
        prompt = req.message
        if req.context:
            prompt = f"Current model context:\n{req.context}\n\nUser question: {req.message}"

        result = subprocess.run(
            ["claude", "-p", "--output-format", "text", prompt],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0 and not result.stdout.strip():
            return ChatResponse(error=result.stderr.strip() or "Claude CLI failed")
        return ChatResponse(response=result.stdout.strip())
    except subprocess.TimeoutExpired:
        return ChatResponse(error="Request timed out")
    except FileNotFoundError:
        return ChatResponse(error="Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code")
    except Exception as e:
        return ChatResponse(error=str(e))


# ── ERPNext proxy endpoints ──────────────────────────────────────────────────

def _erpnext_headers():
    return {"Authorization": f"token {ERPNEXT_API_KEY}:{ERPNEXT_API_SECRET}"}


@app.get("/api/erpnext/projects")
def erpnext_projects(search: str = Query("", description="Search text")):
    if not ERPNEXT_URL:
        return {"data": [], "error": "ERPNext not configured"}
    try:
        params = {
            "doctype": "Project",
            "txt": search,
            "filters": '{"status":"Open"}',
            "fields": '["name","project_name","customer","status","company"]',
            "limit_page_length": 20,
        }
        resp = http_requests.get(
            f"{ERPNEXT_URL}/api/resource/Project",
            params=params,
            headers=_erpnext_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return {"data": resp.json().get("data", []), "error": None}
    except Exception as e:
        return {"data": [], "error": str(e)}


@app.get("/api/erpnext/project/{name}")
def erpnext_project_detail(name: str):
    if not ERPNEXT_URL:
        return {"data": None, "error": "ERPNext not configured"}
    try:
        resp = http_requests.get(
            f"{ERPNEXT_URL}/api/resource/Project/{name}",
            headers=_erpnext_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return {"data": resp.json().get("data"), "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}
