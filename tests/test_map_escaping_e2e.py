"""End-to-end regression test: the generated map HTML must never contain
unescaped user-controlled payloads.

Guards against stored XSS via the input filename / project name, which are
rendered into the map served same-origin from peit-map-creator.com/maps/{jobId}.
Runs the real create_web_map pipeline (no network) with empty layer results.
"""
import geopandas as gpd
from shapely.geometry import Polygon, Point

from config.config_loader import load_config
from core.map_builder import create_web_map

IMG_PAYLOAD = '<img src=x onerror=alert(document.domain)>'
SCRIPT_PAYLOAD = '</title><script>alert(1)</script>'


def _render(original_geometry_gdf=None):
    config = load_config()
    poly = Polygon([(-72.6, 44.2), (-72.6, 44.3), (-72.5, 44.3), (-72.5, 44.2)])
    polygon_gdf = gpd.GeoDataFrame({'geometry': [poly]}, crs='EPSG:4326')
    m = create_web_map(
        polygon_gdf,
        layer_results={},
        metadata={},
        config=config,
        input_filename=IMG_PAYLOAD,
        project_name=SCRIPT_PAYLOAD,
        original_geometry_gdf=original_geometry_gdf,
        job_id='abcdef0123456789',
    )
    return m.get_root().render()


def test_polygon_input_has_no_unescaped_payload():
    html = _render()
    assert '<img src=x onerror' not in html
    assert '<script>alert(1)</script>' not in html
    assert '&lt;img src=x onerror' in html  # escaped form present


def test_buffered_input_has_no_unescaped_payload():
    orig = gpd.GeoDataFrame({'geometry': [Point(-72.55, 44.25)]}, crs='EPSG:4326')
    html = _render(original_geometry_gdf=orig)
    assert '<img src=x onerror' not in html
    assert '<script>alert(1)</script>' not in html
