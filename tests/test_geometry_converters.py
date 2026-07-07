"""Tests for ESRI JSON <-> GeoJSON conversion and geometry utilities."""
import math

import pytest
from shapely.geometry import Point, Polygon, MultiPolygon, box

from utils.geometry_converters import (
    convert_esri_point,
    convert_esri_linestring,
    convert_esri_polygon,
    convert_esri_to_geojson,
    shapely_to_esri_polygon,
    count_geometry_vertices,
    calculate_area_sq_miles,
)


class TestEsriPoint:
    def test_basic_point(self):
        f = convert_esri_point({'x': -73.98, 'y': 40.75}, {'name': 'NYC'})
        assert f['geometry']['type'] == 'Point'
        assert f['geometry']['coordinates'] == [-73.98, 40.75]
        assert f['properties']['name'] == 'NYC'

    def test_missing_coords_returns_none(self):
        assert convert_esri_point({'x': 1.0}, {}) is None
        assert convert_esri_point({}, {}) is None


class TestEsriLine:
    def test_single_path_is_linestring(self):
        f = convert_esri_linestring({'paths': [[[0, 0], [1, 1]]]}, {})
        assert f['geometry']['type'] == 'LineString'
        assert f['geometry']['coordinates'] == [[0, 0], [1, 1]]

    def test_multi_path_is_multilinestring(self):
        f = convert_esri_linestring({'paths': [[[0, 0], [1, 1]], [[2, 2], [3, 3]]]}, {})
        assert f['geometry']['type'] == 'MultiLineString'

    def test_empty_paths_returns_none(self):
        assert convert_esri_linestring({'paths': []}, {}) is None


class TestEsriPolygon:
    def test_rings_to_polygon(self):
        rings = [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
        f = convert_esri_polygon({'rings': rings}, {'id': 1})
        assert f['geometry']['type'] == 'Polygon'
        assert f['geometry']['coordinates'] == rings

    def test_empty_rings_returns_none(self):
        assert convert_esri_polygon({'rings': []}, {}) is None


class TestDispatcher:
    def test_dispatch_point(self):
        f = convert_esri_to_geojson({'geometry': {'x': 1, 'y': 2}, 'attributes': {'a': 1}})
        assert f['geometry']['type'] == 'Point'
        assert f['properties'] == {'a': 1}

    def test_dispatch_line(self):
        f = convert_esri_to_geojson({'geometry': {'paths': [[[0, 0], [1, 1]]]}})
        assert f['geometry']['type'] == 'LineString'

    def test_dispatch_polygon(self):
        f = convert_esri_to_geojson({'geometry': {'rings': [[[0, 0], [0, 1], [1, 0], [0, 0]]]}})
        assert f['geometry']['type'] == 'Polygon'

    def test_no_geometry_returns_none(self):
        assert convert_esri_to_geojson({'attributes': {}}) is None

    def test_unknown_geometry_returns_none(self):
        assert convert_esri_to_geojson({'geometry': {'weird': 1}}) is None


class TestShapelyToEsri:
    def test_polygon_roundtrip_structure(self):
        poly = box(0, 0, 1, 1)
        esri = shapely_to_esri_polygon(poly)
        assert esri['spatialReference'] == {'wkid': 4326}
        assert len(esri['rings']) == 1
        assert esri['rings'][0][0] == list(esri['rings'][0][-1])  # closed ring

    def test_multipolygon(self):
        mp = MultiPolygon([box(0, 0, 1, 1), box(2, 2, 3, 3)])
        esri = shapely_to_esri_polygon(mp)
        assert len(esri['rings']) == 2

    def test_none_and_empty(self):
        assert shapely_to_esri_polygon(None) is None
        assert shapely_to_esri_polygon(Polygon()) is None

    def test_point_unsupported(self):
        assert shapely_to_esri_polygon(Point(0, 0)) is None


class TestVertexCount:
    def test_box_has_five_vertices(self):
        # a closed square ring has 5 coordinates
        assert count_geometry_vertices(box(0, 0, 1, 1)) == 5


class TestArea:
    def test_area_positive_and_scaled_by_latitude(self):
        # 1x1 degree box near the equator vs near 60N: higher latitude -> smaller area
        equator = box(0, 0, 1, 1)
        high_lat = box(0, 59, 1, 60)
        a_eq = calculate_area_sq_miles(equator)
        a_hi = calculate_area_sq_miles(high_lat)
        assert a_eq > 0
        assert a_hi < a_eq  # cos(lat) shrinks longitude scale

    def test_empty_geometry_zero(self):
        assert calculate_area_sq_miles(Polygon()) == 0.0
