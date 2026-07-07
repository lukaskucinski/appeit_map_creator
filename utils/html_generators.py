"""
HTML generation utilities for PEIT Map Creator.

This module provides functions to generate HTML and JavaScript code for map UI elements.
Used by the map builder to create download menus and embed GeoJSON data.

Functions:
    generate_layer_download_sections: Create HTML for layer download menu
    generate_layer_data_mapping: Embed GeoJSON data in JavaScript
"""

import html
import json
import geopandas as gpd
from typing import Dict, Optional


def _escape_json_for_html_script(json_str: str) -> str:
    """Escape a JSON string for safe embedding inside HTML <script> tags.

    Prevents XSS by escaping characters that could break out of the script context:
    - </  -> <\\/  (prevents </script> injection)
    - <!--  -> <\\!-- (prevents HTML comment injection)
    - U+2028/U+2029 (JS line terminators that break string literals)
    """
    return (
        json_str
        .replace('</', '<\\/')
        .replace('<!--', '<\\!--')
        .replace('\u2028', '\\u2028')
        .replace('\u2029', '\\u2029')
    )


def generate_layer_download_sections(
    layer_results: Dict[str, gpd.GeoDataFrame],
    config: Dict,
    input_filename: str,
    original_geometry_gdf: Optional[gpd.GeoDataFrame] = None
) -> str:
    """
    Generate HTML for individual layer download sections.

    Creates download button groups for each layer (GeoJSON, SHP, KMZ, GPKG formats).
    Only includes layers that have features.

    Parameters:
    -----------
    layer_results : Dict[str, gpd.GeoDataFrame]
        Dictionary of layer results (layer name -> GeoDataFrame)
    config : Dict
        Configuration dictionary with layer definitions
    input_filename : str
        Name of input file for the input polygon section
    original_geometry_gdf : Optional[gpd.GeoDataFrame]
        Original pre-buffer geometry (None if no buffering was applied)

    Returns:
    --------
    str
        HTML string with download sections for all layers

    Example Output:
        <div class="download-section">
            <div class="download-layer-name">RCRA Sites (150)</div>
            <div class="download-format-buttons">
                <button onclick="...">GeoJSON</button>
                <button onclick="...">SHP</button>
                <button onclick="...">KMZ</button>
            </div>
        </div>
    """
    sections_html = ""

    # Escape the user-controlled filename/project name before embedding in HTML
    # (prevents stored XSS in the map served same-origin from /maps/{jobId}).
    safe_input_filename = html.escape(input_filename) if input_filename else ""

    # Add original input geometry section (if buffer was applied)
    if original_geometry_gdf is not None:
        sections_html += f"""
        <div class="download-section">
            <div class="download-layer-name">{safe_input_filename} (Original Input)</div>
            <div class="download-format-buttons">
                <button class="download-format-btn" onclick="downloadLayer('Original Geometry', 'geojson'); event.stopPropagation();">GeoJSON</button>
                <button class="download-format-btn" onclick="downloadLayer('Original Geometry', 'shp'); event.stopPropagation();">SHP</button>
                <button class="download-format-btn" onclick="downloadLayer('Original Geometry', 'kmz'); event.stopPropagation();">KMZ</button>
                <button class="download-format-btn" onclick="downloadLayer('Original Geometry', 'gpkg'); event.stopPropagation();">GPKG</button>
            </div>
        </div>
        """

    # Add input polygon section (buffered polygon or original if no buffering)
    sections_html += f"""
        <div class="download-section">
            <div class="download-layer-name">{safe_input_filename} (Input Area)</div>
            <div class="download-format-buttons">
                <button class="download-format-btn" onclick="downloadLayer('Input Polygon', 'geojson'); event.stopPropagation();">GeoJSON</button>
                <button class="download-format-btn" onclick="downloadLayer('Input Polygon', 'shp'); event.stopPropagation();">SHP</button>
                <button class="download-format-btn" onclick="downloadLayer('Input Polygon', 'kmz'); event.stopPropagation();">KMZ</button>
                <button class="download-format-btn" onclick="downloadLayer('Input Polygon', 'gpkg'); event.stopPropagation();">GPKG</button>
            </div>
        </div>
        """

    # Add sections for each intersected layer
    for layer_config in config['layers']:
        layer_name = layer_config['name']

        # Skip layers without features
        if layer_name not in layer_results or len(layer_results[layer_name]) == 0:
            continue

        feature_count = len(layer_results[layer_name])

        safe_layer_name = html.escape(layer_name)
        # layer_name is also passed as a JS string argument inside the double-quoted
        # onclick attribute. json.dumps produces a valid JS string literal (escaping
        # quotes/backslashes/control chars); html.escape then encodes the resulting
        # double quotes so they can't break out of the HTML attribute.
        js_layer_name = html.escape(json.dumps(layer_name))
        sections_html += f"""
        <div class="download-section">
            <div class="download-layer-name">{safe_layer_name} ({feature_count})</div>
            <div class="download-format-buttons">
                <button class="download-format-btn" onclick="downloadLayer({js_layer_name}, 'geojson'); event.stopPropagation();">GeoJSON</button>
                <button class="download-format-btn" onclick="downloadLayer({js_layer_name}, 'shp'); event.stopPropagation();">SHP</button>
                <button class="download-format-btn" onclick="downloadLayer({js_layer_name}, 'kmz'); event.stopPropagation();">KMZ</button>
                <button class="download-format-btn" onclick="downloadLayer({js_layer_name}, 'gpkg'); event.stopPropagation();">GPKG</button>
            </div>
        </div>
        """

    return sections_html


def generate_layer_data_mapping(
    layer_results: Dict[str, gpd.GeoDataFrame],
    polygon_gdf: gpd.GeoDataFrame,
    original_geometry_gdf: Optional[gpd.GeoDataFrame] = None
) -> str:
    """
    Generate JavaScript object with embedded GeoJSON data.

    Converts all GeoDataFrames to GeoJSON and embeds them as a JavaScript object.
    This avoids CORS issues with external file loading in the browser.

    Parameters:
    -----------
    layer_results : Dict[str, gpd.GeoDataFrame]
        Dictionary of layer results (layer name -> GeoDataFrame)
    polygon_gdf : gpd.GeoDataFrame
        Input polygon GeoDataFrame (buffered polygon or original if no buffering)
    original_geometry_gdf : Optional[gpd.GeoDataFrame]
        Original pre-buffer geometry (None if no buffering was applied)

    Returns:
    --------
    str
        JavaScript string defining layerData object

    Example Output:
        "Original Input": {type: "FeatureCollection", features: [...]},
        "Input Polygon": {type: "FeatureCollection", features: [...]},
        "RCRA Sites": {type: "FeatureCollection", features: [...]}
    """
    mappings = []

    # Add original input geometry (if buffer was applied)
    if original_geometry_gdf is not None:
        original_geojson = json.loads(original_geometry_gdf.to_json())
        original_geojson_str = json.dumps(original_geojson, separators=(',', ':'))
        original_geojson_str = _escape_json_for_html_script(original_geojson_str)
        mappings.append(f'"Original Geometry": {original_geojson_str}')

    # Add input polygon (convert GeoDataFrame to GeoJSON dict)
    input_geojson = json.loads(polygon_gdf.to_json())
    input_geojson_str = json.dumps(input_geojson, separators=(',', ':'))
    input_geojson_str = _escape_json_for_html_script(input_geojson_str)
    mappings.append(f'"Input Polygon": {input_geojson_str}')

    # Add each intersected layer
    for layer_name, gdf in layer_results.items():
        # Skip empty layers - no point embedding empty FeatureCollections
        if len(gdf) == 0:
            continue
        layer_geojson = json.loads(gdf.to_json())
        layer_geojson_str = json.dumps(layer_geojson, separators=(',', ':'))
        layer_geojson_str = _escape_json_for_html_script(layer_geojson_str)
        # Use json.dumps for the layer name key to safely escape all special chars
        safe_key = json.dumps(layer_name)
        mappings.append(f'{safe_key}: {layer_geojson_str}')

    return ",\n        ".join(mappings)
