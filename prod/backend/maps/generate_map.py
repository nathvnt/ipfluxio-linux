import math
import json
import os
import sys
import folium
from jinja2 import Template
from folium import Tooltip
from folium.map import Marker
from folium.plugins import FastMarkerCluster
from folium.features import DivIcon
from collections import defaultdict
import geoip2.database
import geopandas as gpd
from shapely.geometry import Point

#paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
LOG_BASE_DIR = "/var/log/ipfluxio/logs"  

ACTIVE_LOG_PATH = os.path.join(LOG_BASE_DIR, "active")  
PASSIVE_LOG_PATH = os.path.join(LOG_BASE_DIR, "baseline")  
MAP_FILE = os.path.join(BASE_DIR, "network_traffic_map.html")
URBAN_AREAS_PATH = os.path.join(BASE_DIR, "geo_json", "urban_areas.geojson")

os.makedirs(ACTIVE_LOG_PATH, exist_ok=True)  
os.makedirs(PASSIVE_LOG_PATH, exist_ok=True)

urban_polygons = gpd.read_file(URBAN_AREAS_PATH)

#marker states
MARKER_COLORS = {}  

#load scan data from a given log file
def load_scan(log_filename):
    if log_filename.startswith("network_traffic_"):
        log_file_path = os.path.join(ACTIVE_LOG_PATH, log_filename)
    elif log_filename.startswith("baseline_"):
        log_file_path = os.path.join(PASSIVE_LOG_PATH, log_filename)
    else:
        print(f"Error: Could not determine log type for {log_filename}.")
        return None

    if not os.path.exists(log_file_path):
        print(f"Log file {log_filename} does not exist. Returning empty map.")
        return None

    try:
        with open(log_file_path, "r") as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading log file {log_filename}: {e}")
        return None

#override default Folium Marker template
click_template = """{% macro script(this, kwargs) %}
    var {{ this.get_name() }} = L.marker(
        {{ this.location|tojson }},
        {{ this.options|tojson }}
    ).addTo({{ this._parent.get_name() }}).on('click', function() {
        const message = "[MAP-CLICK] LOCATION: [" + {{ this.location }}.join(", ") + "]";
        console.log(message);

        //Send message to parent window (Electron Renderer)
        window.parent.postMessage({ type: "mapClick", location: {{ this.location }} }, "*");
    });
{% endmacro %}"""

Marker._template = Template(click_template)

color_scale = [
    "#5EEAD4",  
    "#2DD4BF",  
    "#14B8A6", 
    "#8B5CF6", 
    "#6D28D9",  
    "#4C1D95", 
]

def get_color(count, low, avg, high):
    if count <= low:
        return color_scale[0]
    elif count < avg:
        return color_scale[1]
    elif count == int(avg):
        return color_scale[2]
    elif count < high:
        return color_scale[3]
    elif count == high:
        return color_scale[4]
    else:
        return color_scale[5]


def generate_map(mode="update", log_filename=None, highlighted_markers="[]", map_type="bubble"):

    global MARKER_COLORS 

    if mode == "reset":
        print("Resetting map to empty state...")
        if os.path.exists(MAP_FILE):
            os.remove(MAP_FILE)
            print("Deleted old map file.")

        map_ = folium.Map(location=[42.345553, -50.732378], 
                        zoom_start=3,
                        tiles='CartoDB dark_matter')
        map_.save(MAP_FILE)
        print(f"Empty map created: {MAP_FILE}")
        return

    log_data = load_scan(log_filename) if log_filename else None
    map_ = folium.Map(location=[42.345553, -50.732378], 
                    zoom_start=3,
                    tiles='CartoDB dark_matter')

    custom_css = folium.Element("""
    <style>
        .bubble-label-text {
            font-weight: 500;
            color: #ffffffbf;
            text-align: center;
            text-shadow: 1px 1px 2px black;
            transform: translate(-50%, -50%);
            position: relative;
            white-space: nowrap;
        }
    </style>
    """)
    map_.get_root().html.add_child(custom_css)


    #parse highlighted markers list
    try:
        highlighted_markers = json.loads(highlighted_markers) if highlighted_markers else []
        highlighted_markers_set = set(highlighted_markers)
    except json.JSONDecodeError:
        print("Error decoding highlighted markers JSON, resetting to empty list.")
        highlighted_markers_set = set()


    coord_counts = defaultdict(list)
    region_counts = defaultdict(int)

    if log_data and "endpoints" in log_data:

        for ip, info in log_data["endpoints"].items():
            coordinates = info.get("location")
            if coordinates and coordinates != [0, 0]:
                coord_key = tuple(coordinates)
                coord_counts[coord_key].append(ip)

        #count repeat coordinates for showing density 
        all_counts = [len(ips) for ips in coord_counts.values()]
        if all_counts:
            low = min(all_counts)
            high = max(all_counts)
            avg = sum(all_counts) / len(all_counts)

        if map_type == "bubble":
            for (lat, lng), ips in coord_counts.items():

                count = len(ips)
                radius = max(4, min(35, 6 + math.log2(count) * 3))
                fill_color = "#10B981" if f"{lat},{lng}" in highlighted_markers_set else get_color(count, low, avg, high)

                #add bubble
                folium.CircleMarker(
                    location=(lat, lng),
                    radius=radius,
                    color=fill_color,
                    fill=True,
                    fill_opacity=0.6
                ).add_to(map_)

                
                #add count label
                font_size = max(8, radius * 1.1) 
                if count > 9:
                    anchor_offset = int(font_size // 2)  
                else:
                    anchor_offset = int(font_size // 4)  
                
                folium.Marker(
                    location=(lat, lng),
                    icon=DivIcon(
                        icon_size=(0, 0),
                        icon_anchor=(anchor_offset, 0),
                        class_name="bubble-label",
                        html=f"""
                        <div class="bubble-label-text" style="font-size: {font_size}px;">{count}</div>
                        """
                    )
                ).add_to(map_)


        elif map_type == "choropleth":
            #turn coord_counts into GeoDataFrame of points
            points = []
            counts = []

            for (lat, lng), ips in coord_counts.items():
                points.append(Point(lng, lat)) 
                counts.append(len(ips))

            points_gdf = gpd.GeoDataFrame({'count': counts}, geometry=points, crs="EPSG:4326")

            #spatial join with urban polygons
            joined = gpd.sjoin(points_gdf, urban_polygons, how="inner", predicate="within")

            #aggregate counts for each matched polygon
            region_count_series = joined.groupby(joined.index_right)["count"].sum()

            #assign counts to the urban_polygons GeoDataFrame
            urban_polygons["traffic_count"] = urban_polygons.index.map(region_count_series).fillna(0)

            #assign color
            for _, row in urban_polygons.iterrows():
                count = row["traffic_count"]
                if count > 0:
                    fill_color = get_color(count, low, avg, high)

                    folium.GeoJson(
                        data={
                            "type": "Feature",
                            "geometry": json.loads(gpd.GeoSeries([row.geometry]).to_json())["features"][0]["geometry"],
                            "properties": {"traffic_count": count},
                        },
                        style_function=lambda feature, fc=fill_color: {
                            "fillColor": fc,
                            "color": "black",
                            "weight": 0.5,
                            "fillOpacity": 0.75,
                        }
                    ).add_to(map_)

        else:
            print(f"Unknown map type: {map_type}.")

    #inject legend
    gradient_legend = """
    <div 
        style="
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            background-color: rgba(0, 0, 0, 0.45);
            padding: 5px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
    >
        <div style="justify-content: center; text-align: center;" >Density</div>
        <div style="display: flex; align-items: center;">
            <span style="margin-right: 6px;">Low</span>
            <div 
                style="
                    flex: 1;
                    height: 11px;
                    width: 150px;
                    background: linear-gradient(to right,
                        #5EEAD4, #2DD4BF, #14B8A6, #8B5CF6, #6D28D9, #4C1D95);
                    border-radius: 4px;"
            >
            </div>
            <span style="margin-left: 6px;">High</span>
        </div>
    </div>
    """
    map_.get_root().html.add_child(folium.Element(gradient_legend))

    #save updated map
    map_.save(MAP_FILE)

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "update"
    log_filename = sys.argv[2] if len(sys.argv) > 2 else None
    highlighted_markers = sys.argv[3] if len(sys.argv) > 3 else "[]"
    map_type = sys.argv[4] if len(sys.argv) > 4 else "bubble"  

    generate_map(mode, log_filename, highlighted_markers, map_type)

