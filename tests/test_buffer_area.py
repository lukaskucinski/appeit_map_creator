"""Tests for calculate_buffer_area, which feeds the production area-limit check.

Guards the refactor that routes area computation through the shared
utils.geometry_converters.calculate_area_sq_miles helper.
"""
from shapely.geometry import box

from geometry_input.buffering import calculate_buffer_area
from utils.geometry_converters import calculate_area_sq_miles


def test_returns_expected_keys():
    info = calculate_buffer_area(box(-72.6, 44.2, -72.5, 44.3))
    assert set(info) == {'area_sq_degrees', 'area_sq_km_approx', 'area_sq_miles_approx'}
    assert info['area_sq_miles_approx'] > 0


def test_miles_matches_shared_helper():
    geom = box(-100.0, 39.0, -99.0, 40.0)
    info = calculate_buffer_area(geom)
    assert info['area_sq_miles_approx'] == round(calculate_area_sq_miles(geom), 2)
