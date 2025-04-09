import json
import requests
import time
import sys
import os

#paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))  
LOG_BASE_DIR = "/var/log/ipfluxio/logs"  
GEO_HISTORY_FILE = os.path.join(LOG_BASE_DIR, "archive", "geo_history.json")

#free geolocation providers
GEO_PROVIDERS = [
    {"name": "ipinfo.io", "url": "https://ipinfo.io/{ip}/json"},
    {"name": "freegeoip.app", "url": "https://freegeoip.app/json/{ip}"},
    {"name": "ip-api", "url": "http://ip-api.com/json/{ip}"},
    {"name": "geoplugin", "url": "http://www.geoplugin.net/json.gp?ip={ip}"}
]

#load existing geolocation data
def load_geo_history():
    try:
        with open(GEO_HISTORY_FILE, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return {}  
    except json.JSONDecodeError:
        return {} 

#save updated geolocation data
def save_geo_history(geo_data):
    with open(GEO_HISTORY_FILE, "w") as file:
        json.dump(geo_data, file, indent=4)

#check if IP is in history
def get_cached_location(ip, geo_history):
    return geo_history.get(ip, None)

def get_geolocation(ip):
    geo_history = load_geo_history()
    
    #check if IP has known coordinates
    cached_location = get_cached_location(ip, geo_history)
    if cached_location:
        return cached_location  
    
    #cycle through providers
    for provider in GEO_PROVIDERS:
        try:
            response = requests.get(provider["url"].format(ip=ip), timeout=5)
            response.raise_for_status()
            data = response.json()

            #extract latitude & longitude from API response
            if "loc" in data:  #ipinfo.io
                coords = tuple(map(float, data["loc"].split(",")))
            elif "latitude" in data and "longitude" in data:  #freegeoip
                coords = (data["latitude"], data["longitude"])
            elif "lat" in data and "lon" in data:  #ip-api
                coords = (data["lat"], data["lon"])
            elif "geoplugin_latitude" in data and "geoplugin_longitude" in data:  #geoplugin
                coords = (data["geoplugin_latitude"], data["geoplugin_longitude"])
            else:
                coords = None 

            #save & return
            if coords:
                geo_history[ip] = coords
                save_geo_history(geo_history)
                return coords
        except requests.RequestException:
            continue  #try the next provider

    #fail case
    geo_history[ip] = "Unknown"
    save_geo_history(geo_history)
    return "Unknown"
