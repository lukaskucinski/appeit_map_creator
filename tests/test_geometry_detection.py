"""Tests for geometry type detection from GeoDataFrames."""
import geopandas as gpd
from shapely.geometry import Point, LineString, Polygon

from geometry_input.load_input import detect_geometry_type, validate_input_geometry


def _gdf(geoms):
    return gpd.GeoDataFrame({'geometry': geoms}, crs='EPSG:4326')


def test_detect_point():
    assert detect_geometry_type(_gdf([Point(0, 0), Point(1, 1)])) == 'point'


def test_detect_line():
    assert detect_geometry_type(_gdf([LineString([(0, 0), (1, 1)])])) == 'line'


def test_detect_polygon():
    assert detect_geometry_type(_gdf([Polygon([(0, 0), (0, 1), (1, 1), (0, 0)])])) == 'polygon'


def test_detect_mixed():
    assert detect_geometry_type(_gdf([Point(0, 0), LineString([(0, 0), (1, 1)])])) == 'mixed'


def test_validate_ok():
    ok, msg = validate_input_geometry(_gdf([Point(0, 0)]))
    assert ok and msg == ''


def test_validate_no_crs():
    gdf = gpd.GeoDataFrame({'geometry': [Point(0, 0)]})
    ok, msg = validate_input_geometry(gdf)
    assert not ok
