"""
Station interpolation for beam force diagrams.

Given end forces (N1, V1, M1) and the known load distribution,
compute N(x), V(x), M(x) at 21 stations along the beam.
"""

from typing import List, Tuple

NUM_STATIONS = 21


def interpolate_stations(
    N1: float,
    V1: float,
    M1: float,
    L: float,
    qx_local: float,
    qy_local: float,
    startT: float = 0.0,
    endT: float = 1.0,
    num_stations: int = NUM_STATIONS,
) -> Tuple[List[float], List[float], List[float], List[float]]:
    """
    Interpolate internal forces along a beam element.

    For a partial distributed load from startT*L to endT*L, the equilibrium
    equations differ inside vs. outside the loaded region.

    Returns (stations, normalForce, shearForce, bendingMoment).
    """
    a = startT * L  # start of loaded region
    b = endT * L    # end of loaded region

    stations = []
    normal_force = []
    shear_force = []
    bending_moment = []

    for i in range(num_stations):
        x = (i / (num_stations - 1)) * L
        stations.append(x)

        if x < a:
            # Before the loaded region: only end-force contribution
            N_x = N1
            V_x = V1
            M_x = M1 + V1 * x
        elif x <= b:
            # Inside the loaded region
            xi = x - a  # distance into loaded region
            N_x = N1 + qx_local * xi
            V_x = V1 + qy_local * xi
            M_x = M1 + V1 * x + qy_local * xi * xi / 2.0
        else:
            # After the loaded region
            load_len = b - a
            N_x = N1 + qx_local * load_len
            V_x = V1 + qy_local * load_len
            M_x = (
                M1
                + V1 * x
                + qy_local * load_len * (x - a - load_len / 2.0)
            )

        normal_force.append(N_x)
        shear_force.append(V_x)
        bending_moment.append(M_x)

    return stations, normal_force, shear_force, bending_moment
