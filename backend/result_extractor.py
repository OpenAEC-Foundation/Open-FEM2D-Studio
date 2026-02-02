"""
Extract results from a solved OpenSeesPy model and convert to the JSON
response format expected by the frontend.

Sign convention mapping:
  OpenSees eleForce(tag) returns [N1, V1, M1, N2, V2, M2] in local coordinates.
  These are forces ON the element from the nodes (action).

  Frontend IBeamForces expects internal forces (reaction = -action for some DOFs):
    N1 =  raw[0]     tension positive at start
    V1 =  raw[1]     shear at start
    M1 = -raw[2]     moment at start (flip for internal convention)
    N2 = -raw[3]     axial at end (flip direction)
    V2 = -raw[4]     shear at end (flip)
    M2 =  raw[5]     moment at end
"""

import math
from typing import Dict, List, Any

import openseespy.opensees as ops

from beam_interpolation import interpolate_stations


def extract_results(data: dict, metadata: dict) -> dict:
    """
    Extract displacements, reactions, and beam forces from the solved
    OpenSeesPy global state.

    Returns the JSON-serialisable response dict.
    """
    node_id_order: List[int] = metadata["node_id_order"]
    beam_tag_map: Dict[int, dict] = metadata["beam_tag_map"]
    nodes_by_id: Dict[int, dict] = metadata["nodes_by_id"]

    # ── 1. Displacements ─────────────────────────────────────────────────
    displacements: List[float] = []
    for nid in node_id_order:
        d = list(ops.nodeDisp(nid))
        displacements.extend(d)  # [ux, uy, rz]

    # ── 2. Reactions ─────────────────────────────────────────────────────
    reactions: List[float] = []
    for nid in node_id_order:
        r = list(ops.nodeReaction(nid))
        reactions.extend(r)  # [Rx, Ry, Rm]

    # ── 3. Beam forces ───────────────────────────────────────────────────
    beam_forces: Dict[str, Any] = {}

    for elem_tag, beam in beam_tag_map.items():
        raw = list(ops.eleForce(elem_tag))
        # raw = [N1, V1, M1, N2, V2, M2] in local coordinates

        # Sign convention mapping to match frontend
        N1 = raw[0]
        V1 = raw[1]
        M1 = -raw[2]
        N2 = -raw[3]
        V2 = -raw[4]
        M2 = raw[5]

        # Get beam geometry
        n1_data = nodes_by_id[beam["nodeIds"][0]]
        n2_data = nodes_by_id[beam["nodeIds"][1]]
        dx = n2_data["x"] - n1_data["x"]
        dy = n2_data["y"] - n1_data["y"]
        L = math.sqrt(dx * dx + dy * dy)
        angle = math.atan2(dy, dx)

        # Get distributed load parameters (in local coordinates)
        dl = beam.get("distributedLoad")
        qx_local = 0.0
        qy_local = 0.0
        startT = 0.0
        endT = 1.0

        if dl:
            qx = dl.get("qx", 0)
            qy = dl.get("qy", 0)
            startT = dl.get("startT", 0)
            endT = dl.get("endT", 1)
            coord_system = dl.get("coordSystem", "local")

            qx_local = qx
            qy_local = qy
            if coord_system == "global":
                cos_a = math.cos(angle)
                sin_a = math.sin(angle)
                qx_local = qx * cos_a + qy * sin_a
                qy_local = -qx * sin_a + qy * cos_a

        # Interpolate force diagrams
        stations, normal_force, shear_force, bending_moment = interpolate_stations(
            N1, V1, M1, L, qx_local, qy_local, startT, endT
        )

        # Max absolute values for diagram scaling
        maxN = max((abs(v) for v in normal_force), default=1e-10)
        maxV = max((abs(v) for v in shear_force), default=1e-10)
        maxM = max((abs(v) for v in bending_moment), default=1e-10)
        maxN = max(maxN, 1e-10)
        maxV = max(maxV, 1e-10)
        maxM = max(maxM, 1e-10)

        beam_forces[str(beam["id"])] = {
            "elementId": beam["id"],
            "N1": N1,
            "V1": V1,
            "M1": M1,
            "N2": N2,
            "V2": V2,
            "M2": M2,
            "stations": stations,
            "normalForce": normal_force,
            "shearForce": shear_force,
            "bendingMoment": bending_moment,
            "maxN": maxN,
            "maxV": maxV,
            "maxM": maxM,
        }

    return {
        "success": True,
        "displacements": displacements,
        "reactions": reactions,
        "beamForces": beam_forces,
        "nodeIdOrder": node_id_order,
    }
