import sys
import json
import shlex
import os
import subprocess
from datetime import datetime, timedelta, time as dt_time
import time
import copy

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_PATH = os.path.abspath(os.path.join(BASE_DIR, ".."))

#parse scan configuration received 
scan_config = None

for arg in sys.argv[1:3]:
    try:
        scan_config = json.loads(arg)
        break
    except json.JSONDecodeError:
        continue

if not scan_config:
    print("Error: Invalid scan configuration.", flush=True)
    sys.exit(1)

scan_type = scan_config.get("scanType")
python_bin = scan_config.get("pythonBinary", "python3")

active_scan_path = os.path.join(BASE_DIR, "active_scan.py")
passive_scan_path = os.path.join(BASE_DIR, "passive_scan.py")

LOG_BASE_DIR = "/var/log/ipfluxio/logs"  
SCAN_PID_FILE = os.path.join(LOG_BASE_DIR, "schedule", "scan_pid_tracking.json")

os.makedirs(LOG_BASE_DIR, exist_ok=True)

def update_scan_pid_file(scan_type, scan_pid, log_path, running=True):
    """Update scan_pid_tracking.json with scan details."""
    try:
        scans_data = {}
        if os.path.exists(SCAN_PID_FILE):
            with open(SCAN_PID_FILE, "r") as file:
                try:
                    scans_data = json.load(file)
                except json.JSONDecodeError:
                    print("scan_pid_tracking.json is empty or invalid. Starting fresh.", flush=True)
                    scans_data = {}

        #clear data if scan of same type already exists
        scans_data = {
            pid: scan for pid, scan in scans_data.items()
            if scan["scanType"] != scan_type
        }

        #add new scan entry
        new_entry = {
            "scanType": scan_type,
            "scanPid": scan_pid,
            "logPath": log_path,
            "running": running,
            "hasStarted": True,
            "startTime": datetime.now().isoformat()
        }

        scans_data[str(scan_pid)] = new_entry

        #save 
        with open(SCAN_PID_FILE, "w") as file:
            json.dump(scans_data, file, indent=4)
        
        #output entry data for main.js to intercept and parse
        print(f"[{scan_type.upper()}] Scan Tracking JSON: {json.dumps(new_entry)}", flush=True)

    except Exception as e:
        print(f"Error updating scan_pid_tracking.json: {e}", flush=True)


#start scans as background processes 
def start_background_process(python_binary, script_path, config):
    """Launches a background scan process and captures output."""
    process = subprocess.Popen(
        [python_binary, script_path, json.dumps(config)],
        stdout=subprocess.PIPE, #capture output to extract log file path
        stderr=subprocess.PIPE,
        text=True,
        env={**os.environ, "PYTHONPATH": BACKEND_PATH}
    )

    #send pid for main.js to intercept
    if config.get("scanType") == "active":
        print(f"[ACTIVE] Starting scan process: {process.pid}", flush=True)
    elif config.get("scanType") == "passive":
        print(f"[PASSIVE] Starting scan process: {process.pid}", flush=True)

    log_path = None
    scan_pid_updated = False

    for line in iter(process.stdout.readline, ''):
        line = line.strip()
        print(line, flush=True)  #forward output to Electron main.js for tracking

        if "Log file created:" in line:
            log_path = line.split("Log file created: ")[1].strip()
            log_filename = os.path.basename(log_path)

            #create timing window schedule if configured
            if config.get("setTimingWindow", False) and config.get("scanType") == "passive":  
                schedule_timing_window_scans(config, log_filename)

        if log_path is not None and not scan_pid_updated:
            update_scan_pid_file(config.get("scanType"), process.pid, log_path)
            scan_pid_updated = True

    for err in iter(process.stderr.readline, ''):
        print(f"Python Error: {err.strip()}", flush=True)

#use passive scan config timing windows to generate scan config objects for each window
def generate_timing_window_scan_configs(base_config, log_filename):
    """Generate scan configs for each timing window and include the correct baseline log."""
    day_map = {
        "Sun": "sunday", "Mon": "monday", "Tue": "tuesday", "Wed": "wednesday",
        "Thu": "thursday", "Fri": "friday", "Sat": "saturday"
    }

    # Reverse map: 'wednesday' -> 2 (weekday index where Monday is 0)
    weekday_map = {
        "sunday": 6, "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5
    }

    timing_configs = []
    timing_windows = base_config.get("timing", {})

    start_date = datetime.strptime(base_config["start"], "%Y-%m-%dT%H:%M").date()
    end_date = datetime.strptime(base_config["end"], "%Y-%m-%dT%H:%M").date()

    current_date = start_date
    while current_date <= end_date:
        weekday_str = current_date.strftime("%a")  
        full_day = day_map.get(weekday_str)
        time_ranges = timing_windows.get(weekday_str, [])

        if not time_ranges or "No time selected" in time_ranges:
            current_date += timedelta(days=1)
            continue

        for time_range in time_ranges:
            try:
                start_str, end_str = time_range.split(" - ")

                scan_start = datetime.strptime(start_str.strip(), "%H:%M").time()
                if end_str.strip() == "24:00":
                    scan_end = (datetime.strptime("00:00", "%H:%M") + timedelta(days=1)).time()
                    end_date_adjustment = timedelta(days=1)
                else:
                    scan_end = datetime.strptime(end_str.strip(), "%H:%M").time()
                    end_date_adjustment = timedelta(0)

                # Full datetimes
                full_start = datetime.combine(current_date, scan_start)
                full_end = datetime.combine(current_date, scan_end) + end_date_adjustment

                new_scan_config = {
                    "scanType": "passive",
                    "start": full_start.strftime('%Y-%m-%dT%H:%M'),
                    "end": full_end.strftime('%Y-%m-%dT%H:%M'),
                    "day": full_day,
                    "excludePrivate": base_config["excludePrivate"],
                    "protocols": base_config["protocols"],
                    "trafficDirection": base_config["trafficDirection"],
                    "networkInterface": base_config["networkInterface"],
                    "aggInterval": base_config["aggInterval"],
                    "newBaseline": False,
                    "addToExisting": True,
                    "selectBaseline": log_filename,
                    "logPath": f"/var/log/ipfluxio/logs/baseline/{log_filename}",
                    "backgroundScan": base_config["backgroundScan"],
                    "pythonBinary": base_config["pythonBinary"]
                }

                timing_configs.append((full_day, scan_start, new_scan_config))

            except ValueError as e:
                print(f"Error parsing time range: {time_range}: {e}", flush=True)

        current_date += timedelta(days=1)

    return timing_configs


#set up schedule to automate passive baseline scans using timing window configs 
def schedule_timing_window_scans(base_config, log_filename):
    """Schedule scans to run during specified timing windows on the correct day of the week."""
    try:
        timing_configs = generate_timing_window_scan_configs(base_config, log_filename)
        print(f"Saving {len(timing_configs)} timing configs for systemd registration using baseline: {log_filename}", flush=True)
        print(f"TIMING CONFIGS: {timing_configs}", flush=True)

        os.makedirs("/var/lib/ipfluxio", exist_ok=True)
        config_path = "/var/lib/ipfluxio/scheduled_jobs.json"

        serializable_configs = [
            {
                "day": day,
                "time": time_obj.strftime("%H:%M"),
                "config": scan_config
            }
            for day, time_obj, scan_config in timing_configs
        ]

        with open(config_path, "w") as f:
            json.dump(serializable_configs, f, indent=2)

        print(f"Saved timing configs to {config_path} for systemd scheduling")

    except Exception as e:
        print(f"Failed to write scheduled timing config: {e}")


#start active scan process using scan config received from main.js
if scan_type == "active":
    start_background_process(python_bin, active_scan_path, scan_config)


#start passive scan as background process using scan config received from main.js
elif scan_type == "passive":
    if scan_config.get("setTimingWindow", False):
        print("Timing windows enabled. Waiting for log file creation to schedule scans...", flush=True)

    start_background_process(python_bin, passive_scan_path, scan_config)

else:
    print("Error: Unknown scan type.", flush=True)
    sys.exit(1)
