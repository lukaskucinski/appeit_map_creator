"""Tests for HTML escaping of user- and third-party-controlled values.

These guard against stored XSS in the generated map HTML, which is served
same-origin from peit-map-creator.com/maps/{jobId}.
"""
import geopandas as gpd
from shapely.geometry import Point

from utils.popup_formatters import format_popup_value
from utils.html_generators import generate_layer_download_sections

XSS_IMG = '<img src=x onerror=alert(1)>'
XSS_SCRIPT = '"><script>alert(1)</script>'


class TestFormatPopupValue:
    def test_plaintext_html_is_escaped(self):
        out = format_popup_value('name', XSS_IMG)
        assert '<img' not in out
        assert '&lt;img' in out

    def test_script_breakout_is_escaped(self):
        out = format_popup_value('description', XSS_SCRIPT)
        assert '<script>' not in out
        assert '&lt;script&gt;' in out

    def test_ampersand_escaped(self):
        out = format_popup_value('label', 'Salt & Pepper')
        assert '&amp;' in out

    def test_none_handling_unchanged(self):
        assert format_popup_value('count', None) == 'None'

    def test_valid_url_still_becomes_link(self):
        out = format_popup_value('website', 'https://example.com')
        assert '<a href="https://example.com"' in out
        assert 'target="_blank"' in out

    def test_javascript_url_not_rendered_as_link_and_escaped(self):
        out = format_popup_value('url', 'javascript:alert(1)')
        assert '<a ' not in out
        # rendered as inert escaped text
        assert 'javascript:alert(1)' in out or '&#' in out

    def test_url_with_html_in_it_is_escaped(self):
        # A field named url containing an angle bracket must not break the attribute
        out = format_popup_value('url', 'https://e.com/"><img src=x onerror=alert(1)>')
        assert '<img' not in out


class TestDownloadSections:
    def _empty_config(self):
        return {'layers': []}

    def test_input_filename_is_escaped(self):
        html = generate_layer_download_sections(
            layer_results={},
            config=self._empty_config(),
            input_filename=XSS_IMG,
        )
        assert '<img' not in html
        assert '&lt;img' in html

    def test_input_filename_with_quote_escaped(self):
        html = generate_layer_download_sections(
            layer_results={},
            config=self._empty_config(),
            input_filename=XSS_SCRIPT,
        )
        assert '<script>' not in html

    def test_layer_name_cannot_break_out_of_onclick_js(self):
        # A malicious layer name with a single quote must not break out of the
        # single-quoted JS argument in the download button onclick attribute.
        evil_name = "x'); alert(1);//"
        gdf = gpd.GeoDataFrame({'geometry': [Point(0, 0)]}, crs='EPSG:4326')
        html = generate_layer_download_sections(
            layer_results={evil_name: gdf},
            config={'layers': [{'name': evil_name}]},
            input_filename='input.geojson',
        )
        # The raw breakout sequence must not appear verbatim in the onclick sink.
        assert "downloadLayer('x'); alert(1);//'" not in html
        # The name is serialized as a JS string with the quote HTML-escaped.
        assert 'alert(1)' not in html or '&#x27;' in html or '&quot;' in html
