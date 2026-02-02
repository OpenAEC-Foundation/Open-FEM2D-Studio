"""
Convert the JSON payload from the frontend into an OpenSeesPy model.

Handles:
- Nodes and boundary conditions
- Spring supports (via zeroLength elements)
- Beam elements with end releases (via duplicate nodes + equalDOF)
- Distributed loads (full-span via eleLoad, partial via equivalent nodal forces)
- Nodal loads
- Geometric transformation (Linear or PDelta)

Uses the openseespy procedural API (global state via ops.wipe/ops.model).
"""

import math
from typing import Dict, List, Tuple

import openseespy.opensees as ops


# ── helpers ──────────────────────────────────────────────────────────────────

def _beam_geometry(n1: dict, n2: dict) -> Tuple[float, float]:
    """Return (length, angle) for a beam defined by two node dicts."""
    dx = n2["x"] - n1["x"]
    dy = n2["y"] - n1["y"]
    L = math.sqrt(dx * dx + dy * dy)
    angle = math.atan2(dy, dx)
    return L, angle


def _hermite_integrals(La: float, Lb: float, L: float):
    """Hermite shape function integrals for partial load equivalent forces."""

    def _N1(x):
        return x - x**3 / (L * L) + x**4 / (2 * L**3)

    def _N2(x):
        return x**2 / 2 - 2 * x**3 / (3 * L) + x**4 / (4 * L**2)

    def _N3(x):
        return x**3 / (L * L) - x**4 / (2 * L**3)

    def _N4(x):
        return -(x**3) / (3 * L) + x**4 / (4 * L**2)

    return (
        _N1(Lb) - _N1(La),
        _N2(Lb) - _N2(La),
        _N3(Lb) - _N3(La),
        _N4(Lb) - _N4(La),
    )


def _partial_equivalent_forces(
    L: float, qx: float, qy: float, startT: float, endT: float
) -> List[float]:
    """Equivalent nodal forces for a partial distributed load (local coords)."""
    a = startT
    b = endT
    span = (b - a) * L
    La = a * L
    Lb = b * L

    intN1, intN2, intN3, intN4 = _hermite_integrals(La, Lb, L)

    # Axial: linear shape functions
    intL1 = span * (1 - (a + b) / 2)
    intL2 = span * (a + b) / 2

    return [
        qx * intL1,   # Fx1
        qy * intN1,   # Fy1
        qy * intN2,   # M1
        qx * intL2,   # Fx2
        qy * intN3,   # Fy2
        qy * intN4,   # M2
    ]


def _transform_local_to_global(local_forces: List[float], angle: float) -> List[float]:
    """Transform 6-DOF local force vector to global coordinates (T^T * f_local)."""
    c = math.cos(angle)
    s = math.sin(angle)
    f = local_forces
    return [
        c * f[0] - s * f[1],
        s * f[0] + c * f[1],
        f[2],
        c * f[3] - s * f[4],
        s * f[3] + c * f[4],
        f[5],
    ]


# ── counter for internal IDs ────────────────────────────────────────────────

class _IdCounter:
    def __init__(self, start: int = 9000):
        self._val = start

    def next(self) -> int:
        self._val += 1
        return self._val


# ── public entry point ──────────────────────────────────────────────────────

def build_model(data: dict) -> Dict:
    """
    Build an OpenSeesPy model from the JSON payload.

    Calls ops.wipe() and ops.model() to initialise global state, then
    creates all nodes, elements, loads, etc.

    Returns metadata dict containing mappings needed for result extraction.
    """
    ops.wipe()
    ops.model("basic", "-ndm", 2, "-ndf", 3)

    counter = _IdCounter(max(n["id"] for n in data["nodes"]) * 100)

    nodes_by_id: Dict[int, dict] = {n["id"]: n for n in data["nodes"]}
    materials_by_id: Dict[int, dict] = {m["id"]: m for m in data["materials"]}

    # Keep track of node ordering for displacement mapping
    node_id_order: List[int] = [n["id"] for n in data["nodes"]]

    # ── 1. Nodes ─────────────────────────────────────────────────────────
    for n in data["nodes"]:
        ops.node(n["id"], n["x"], n["y"])

    # ── 2. Boundary conditions ───────────────────────────────────────────
    for n in data["nodes"]:
        c = n.get("constraints", {})
        fx = [int(c.get("x", False)), int(c.get("y", False)), int(c.get("rotation", False))]
        if any(v == 1 for v in fx):
            ops.fix(n["id"], *fx)

    # ── 3. Spring supports ───────────────────────────────────────────────
    spring_mat_counter = _IdCounter(8000)
    for n in data["nodes"]:
        springs = n.get("springs", {})
        kx = springs.get("kx", 0)
        ky = springs.get("ky", 0)
        kr = springs.get("kr", 0)
        if kx > 0 or ky > 0 or kr > 0:
            # Create ground node
            gnd = counter.next()
            ops.node(gnd, n["x"], n["y"])
            ops.fix(gnd, 1, 1, 1)

            # Create elastic materials for each spring DOF
            mat_tags = []
            for k_val in [kx, ky, kr]:
                mt = spring_mat_counter.next()
                if k_val > 0:
                    ops.uniaxialMaterial("Elastic", mt, k_val)
                else:
                    # Very stiff connection for this DOF (effectively rigid)
                    ops.uniaxialMaterial("Elastic", mt, 1e20)
                mat_tags.append(mt)

            zt = counter.next()
            ops.element(
                "zeroLength", zt, gnd, n["id"],
                "-mat", *mat_tags,
                "-dir", 1, 2, 3,
            )

    # ── 4. Geometric transformation ──────────────────────────────────────
    geom_nonlinear = data.get("geometricNonlinear", False)
    transf_tag = 1
    if geom_nonlinear:
        ops.geomTransf("PDelta", transf_tag)
    else:
        ops.geomTransf("Linear", transf_tag)

    # ── 5. Beam elements (with end release handling) ─────────────────────
    # Map: OpenSees element tag -> original beam dict (for result extraction)
    beam_tag_map: Dict[int, dict] = {}
    # Map: original beam id -> OpenSees element tag
    beam_id_to_tag: Dict[int, int] = {}
    # Track duplicate nodes for end releases
    release_node_map: Dict[int, Dict[str, int]] = {}

    for beam in data["beams"]:
        n1_id = beam["nodeIds"][0]
        n2_id = beam["nodeIds"][1]
        mat = materials_by_id[beam["materialId"]]
        sec = beam["section"]
        E = mat["E"]
        A = sec["A"]
        I = sec["I"]

        releases = beam.get("endReleases", {})
        start_released = releases.get("startMoment", False)
        end_released = releases.get("endMoment", False)

        actual_n1 = n1_id
        actual_n2 = n2_id
        release_info = {}

        if start_released:
            dup = counter.next()
            n1_data = nodes_by_id[n1_id]
            ops.node(dup, n1_data["x"], n1_data["y"])
            # Share translations, free rotation
            ops.equalDOF(n1_id, dup, 1, 2)
            actual_n1 = dup
            release_info["start"] = dup

        if end_released:
            dup = counter.next()
            n2_data = nodes_by_id[n2_id]
            ops.node(dup, n2_data["x"], n2_data["y"])
            ops.equalDOF(n2_id, dup, 1, 2)
            actual_n2 = dup
            release_info["end"] = dup

        if release_info:
            release_node_map[beam["id"]] = release_info

        elem_tag = beam["id"]
        ops.element(
            "elasticBeamColumn", elem_tag,
            actual_n1, actual_n2,
            A, E, I, transf_tag,
        )
        beam_tag_map[elem_tag] = beam
        beam_id_to_tag[beam["id"]] = elem_tag

    # ── 6. Loads ─────────────────────────────────────────────────────────
    ops.timeSeries("Constant", 1)
    ops.pattern("Plain", 1, 1)

    # 6a. Nodal loads
    for n in data["nodes"]:
        loads = n.get("loads", {})
        fx = loads.get("fx", 0)
        fy = loads.get("fy", 0)
        mz = loads.get("moment", 0)
        if fx != 0 or fy != 0 or mz != 0:
            ops.load(n["id"], fx, fy, mz)

    # 6b. Distributed loads on beams
    for beam in data["beams"]:
        dl = beam.get("distributedLoad")
        if not dl:
            continue

        qx = dl.get("qx", 0)
        qy = dl.get("qy", 0)
        if qx == 0 and qy == 0:
            continue

        startT = dl.get("startT", 0)
        endT = dl.get("endT", 1)
        coord_system = dl.get("coordSystem", "local")

        n1_data = nodes_by_id[beam["nodeIds"][0]]
        n2_data = nodes_by_id[beam["nodeIds"][1]]
        L, angle = _beam_geometry(n1_data, n2_data)

        # Transform global loads to local if needed
        qx_local = qx
        qy_local = qy
        if coord_system == "global":
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)
            qx_local = qx * cos_a + qy * sin_a
            qy_local = -qx * sin_a + qy * cos_a

        elem_tag = beam_id_to_tag[beam["id"]]

        if startT <= 0 and endT >= 1:
            # Full-span load: use eleLoad directly
            # beamUniform takes (Wy, Wx) — note the order!
            ops.eleLoad("-ele", elem_tag, "-type", "beamUniform", qy_local, qx_local)
        else:
            # Partial load: compute equivalent nodal forces in Python
            local_forces = _partial_equivalent_forces(L, qx_local, qy_local, startT, endT)
            global_forces = _transform_local_to_global(local_forces, angle)

            n1_id = beam["nodeIds"][0]
            n2_id = beam["nodeIds"][1]
            ops.load(n1_id, global_forces[0], global_forces[1], global_forces[2])
            ops.load(n2_id, global_forces[3], global_forces[4], global_forces[5])

    # ── Build metadata for result extraction ─────────────────────────────
    metadata = {
        "node_id_order": node_id_order,
        "beam_tag_map": beam_tag_map,
        "beam_id_to_tag": beam_id_to_tag,
        "nodes_by_id": nodes_by_id,
        "materials_by_id": materials_by_id,
        "release_node_map": release_node_map,
        "geom_nonlinear": geom_nonlinear,
    }

    return metadata
