"""
Backend unit tests for the solver.

Verifies that the OpenSeesPy-based solver produces correct results
for standard structural engineering problems.
"""

import sys

from main import solve, SolveRequest


def _make_request(nodes, beams, materials=None, geometric_nl=False):
    """Helper to build a SolveRequest."""
    if materials is None:
        materials = [{"id": 1, "E": 210e9, "nu": 0.3}]
    return SolveRequest(
        nodes=nodes,
        beams=beams,
        materials=materials,
        analysisType="frame",
        geometricNonlinear=geometric_nl,
    )


def test_simply_supported_beam_point_load():
    """
    Simply supported beam with point load at midspan.
    L = 6 m, F = 10 kN at midspan.
    Expected: R1 = R3 = 5 kN, M_max = 15 kNm at midpoint.
    """
    nodes = [
        {"id": 1, "x": 0, "y": 0, "constraints": {"x": True, "y": True, "rotation": False}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
        {"id": 2, "x": 3, "y": 0, "constraints": {"x": False, "y": False, "rotation": False}, "loads": {"fx": 0, "fy": -10000, "moment": 0}},
        {"id": 3, "x": 6, "y": 0, "constraints": {"x": False, "y": True, "rotation": False}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
    ]
    ipe200 = {"A": 28.5e-4, "I": 1940e-8, "h": 0.200}
    beams = [
        {"id": 1, "nodeIds": [1, 2], "materialId": 1, "section": ipe200},
        {"id": 2, "nodeIds": [2, 3], "materialId": 1, "section": ipe200},
    ]

    resp = solve(_make_request(nodes, beams))
    assert resp.success, f"Solver failed: {resp.error}"

    # reactions: [Rx1, Ry1, Rm1, Rx2, Ry2, Rm2, Rx3, Ry3, Rm3]
    Ry1 = resp.reactions[1]
    Ry3 = resp.reactions[7]

    assert abs(Ry1 - 5000) < 1, f"Ry1 expected ~5000, got {Ry1}"
    assert abs(Ry3 - 5000) < 1, f"Ry3 expected ~5000, got {Ry3}"

    print("  PASS: Simply supported beam with point load")


def test_simply_supported_beam_uniform_load():
    """
    Simply supported beam with uniform distributed load.
    L = 4 m, q = -5000 N/m.
    Expected: R1 = R2 = qL/2 = 10000 N, M_max = qL^2/8 = 10000 Nm.
    """
    nodes = [
        {"id": 1, "x": 0, "y": 0, "constraints": {"x": True, "y": True, "rotation": False}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
        {"id": 2, "x": 4, "y": 0, "constraints": {"x": False, "y": True, "rotation": False}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
    ]
    ipe300 = {"A": 53.8e-4, "I": 8360e-8, "h": 0.300}
    beams = [
        {
            "id": 1,
            "nodeIds": [1, 2],
            "materialId": 1,
            "section": ipe300,
            "distributedLoad": {"qx": 0, "qy": -5000, "startT": 0, "endT": 1, "coordSystem": "local"},
        },
    ]

    resp = solve(_make_request(nodes, beams))
    assert resp.success, f"Solver failed: {resp.error}"

    Ry1 = resp.reactions[1]
    Ry2 = resp.reactions[4]
    assert abs(Ry1 - 10000) < 10, f"Ry1 expected ~10000, got {Ry1}"
    assert abs(Ry2 - 10000) < 10, f"Ry2 expected ~10000, got {Ry2}"

    # Check max moment at midspan (station index 10 of 21)
    bf = resp.beamForces["1"]
    M_mid = bf["bendingMoment"][10]
    expected_M = 5000 * 4 * 4 / 8  # qL^2/8 = 10000 Nm (negative because q is downward)
    assert abs(abs(M_mid) - expected_M) < 50, f"M_mid expected ~{expected_M}, got {M_mid}"

    print("  PASS: Simply supported beam with uniform load")


def test_cantilever_point_load():
    """
    Cantilever beam with point load at free end.
    L = 3 m, F = -5000 N at tip.
    Expected: R_y = 5000 N, M_fixed = F*L = 15000 Nm.
    """
    nodes = [
        {"id": 1, "x": 0, "y": 0, "constraints": {"x": True, "y": True, "rotation": True}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
        {"id": 2, "x": 3, "y": 0, "constraints": {"x": False, "y": False, "rotation": False}, "loads": {"fx": 0, "fy": -5000, "moment": 0}},
    ]
    ipe200 = {"A": 28.5e-4, "I": 1940e-8, "h": 0.200}
    beams = [
        {"id": 1, "nodeIds": [1, 2], "materialId": 1, "section": ipe200},
    ]

    resp = solve(_make_request(nodes, beams))
    assert resp.success, f"Solver failed: {resp.error}"

    Ry1 = resp.reactions[1]
    Rm1 = resp.reactions[2]
    assert abs(Ry1 - 5000) < 1, f"Ry1 expected ~5000, got {Ry1}"
    assert abs(abs(Rm1) - 15000) < 10, f"Rm1 expected ~15000, got {Rm1}"

    print("  PASS: Cantilever with point load")


def test_portal_frame():
    """
    Portal frame: 2 columns (4m) + 1 beam (6m) with uniform load on beam.
    Fixed supports at base.
    """
    nodes = [
        {"id": 1, "x": 0, "y": 0, "constraints": {"x": True, "y": True, "rotation": True}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
        {"id": 2, "x": 0, "y": 4, "constraints": {"x": False, "y": False, "rotation": False}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
        {"id": 3, "x": 6, "y": 4, "constraints": {"x": False, "y": False, "rotation": False}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
        {"id": 4, "x": 6, "y": 0, "constraints": {"x": True, "y": True, "rotation": True}, "loads": {"fx": 0, "fy": 0, "moment": 0}},
    ]
    hea200 = {"A": 53.8e-4, "I": 3690e-8, "h": 0.190}
    beams = [
        {"id": 1, "nodeIds": [1, 2], "materialId": 1, "section": hea200},
        {
            "id": 2,
            "nodeIds": [2, 3],
            "materialId": 1,
            "section": hea200,
            "distributedLoad": {"qx": 0, "qy": -8000, "startT": 0, "endT": 1, "coordSystem": "local"},
        },
        {"id": 3, "nodeIds": [3, 4], "materialId": 1, "section": hea200},
    ]

    resp = solve(_make_request(nodes, beams))
    assert resp.success, f"Solver failed: {resp.error}"

    # Total vertical load = 8000 * 6 = 48000 N
    # Sum of vertical reactions should equal total load
    Ry1 = resp.reactions[1]   # node 1 y
    Ry4 = resp.reactions[10]  # node 4 y
    total_Ry = Ry1 + Ry4
    assert abs(total_Ry - 48000) < 50, f"Total Ry expected ~48000, got {total_Ry}"

    print("  PASS: Portal frame")


if __name__ == "__main__":
    print("Running backend solver tests...")
    print()

    tests = [
        test_simply_supported_beam_point_load,
        test_simply_supported_beam_uniform_load,
        test_cantilever_point_load,
        test_portal_frame,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"  FAIL: {test.__name__}: {e}")
            failed += 1

    print()
    print(f"Results: {passed}/{passed + failed} passed")
    if failed > 0:
        sys.exit(1)
