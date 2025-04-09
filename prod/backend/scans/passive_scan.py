import signal
import sys
import json
import os
import psutil
import socket
import threading
from inotify_simple import INotify, flags
from datetime import datetime, time as dt_time
import time
from scapy.all import sniff, IP, TCP, UDP, ICMP, conf
from scans.packet_utils.packet_monitor import PROTOCOL_MAP, PacketMonitor

#flag to track running state and kill scan process 
running = True  

#parse scan configuration
try:
    scan_config = json.loads(sys.argv[1])
except (IndexError, json.JSONDecodeError):
    print("Error: Invalid scan configuration.", flush=True)
    sys.exit(1)

#paths to logs 
LOG_BASE_DIR = "/var/log/ipfluxio/logs"  
LOG_DIR = os.path.join(LOG_BASE_DIR, "baseline")
scan_pid_tracking = os.path.join(LOG_BASE_DIR, "schedule", "scan_pid_tracking.json")

os.makedirs(LOG_DIR, exist_ok=True)

current_time = datetime.now()

#first check if config is for timing window or fresh from gui to parse interval correctly 
###########################################################################################
#use 'day' to uniquely identify scheduled timing window configs
if "day" in scan_config:
    print(f"Detected timing window scan for {scan_config['day']} from {scan_config['start']} to {scan_config['end']}", flush=True)

    #calculate scan start and end 
    try:
        start_time = datetime.strptime(scan_config['start'], "%Y-%m-%dT%H:%M")
        end_time = datetime.strptime(scan_config['end'], "%Y-%m-%dT%H:%M")

        current_time = datetime.now()
        if not (start_time.time() <= current_time.time() < end_time.time()):
            print(f"Not inside the timing window ({scan_config['start']} - {scan_config['end']}). Exiting scan.", flush=True)
            sys.exit(0)

        #calculate scan duration 
        duration_seconds = int((end_time - start_time).total_seconds())
        scan_config["duration"] = duration_seconds

        print(f"Calculated timing window duration: {scan_config['duration']} seconds", flush=True)

        log_file_path = os.path.join(LOG_DIR, scan_config.get("selectBaseline", ""))

        #update log duration
        if os.path.exists(log_file_path):
            with open(log_file_path, "r") as log_file:
                try:
                    log_data = json.load(log_file)
                    endpoints = log_data.get("endpoints", {})

                    if not endpoints: 
                        print("Log file exists but contains no endpoints. Replacing duration with timing window duration.", flush=True)
                        scan_config["duration"] = duration_seconds
                    else:
                        previous_duration = log_data.get("scan_config", {}).get("duration", 0)
                        scan_config["duration"] = previous_duration + duration_seconds
                        print(f"Updated cumulative duration: {scan_config['duration']} seconds", flush=True)

                    log_data["scan_config"]["duration"] = scan_config["duration"]
                    with open(log_file_path, "w") as log_file:
                        json.dump(log_data, log_file, indent=4)

                except json.JSONDecodeError:
                    print("Error: Failed to read log file JSON.", flush=True)

    except ValueError:
        print("Error: Invalid start or end format for timing window scan.", flush=True)
        sys.exit(1)

#handle start/end time and duration for non scheudled configs
else:
    if scan_config["start"] == "now":
        start_time = current_time
    else:
        try:
            start_time = datetime.strptime(scan_config["start"], "%Y-%m-%dT%H:%M")
            if start_time < current_time:
                print(f"Provided start time ({start_time}) is in the past. Starting scan immediately.", flush=True)
                start_time = current_time
        except ValueError:
            print("Error: Invalid start time format.", flush=True)
            sys.exit(1)

    if scan_config["end"]:
        try:
            end_time = datetime.strptime(scan_config["end"], "%Y-%m-%dT%H:%M")
            remaining_time = (end_time - start_time).total_seconds()
            scan_config["duration"] = max(0, int(remaining_time))  
        except ValueError:
            print("Error: Invalid end time format.", flush=True)
            sys.exit(1)
    else:
        scan_config["duration"] = None 

    if scan_config["duration"] == 0:
        print("Error: End time is in the past. Scan cannot start.", flush=True)
        sys.exit(1)

    if start_time > current_time:
        sys.exit(1)


#set interface packets will be captured on 
################################################
INTERFACE = scan_config.get("networkInterface")
if not INTERFACE:
    print("Error: No network interface specified.", flush=True)
    sys.exit(1)

print(f"Using network interface: {INTERFACE}", flush=True)


#setup log file scan data will be recorded to 
##############################################
log_path = None
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
existing_log_data = None
add_to_existing = scan_config.get("addToExisting", False)

#extending existing baseline log
if add_to_existing and scan_config.get("selectBaseline"):

    selected_log = scan_config["selectBaseline"]
    log_path = os.path.join(LOG_DIR, selected_log)

    if os.path.exists(log_path):

        try:
            with open(log_path, "r") as log_file:
                existing_log_data = json.load(log_file)

            print(f"[PASSIVE] Log file created: {log_path}", flush=True) #log path received by main.js for tracking
            print(f"Using existing data from {log_path}", flush=True)
        except json.JSONDecodeError:
            print("Warning: Existing log file could not be parsed. Creating a fresh log.", flush=True)
            existing_log_data = None
    else:
        print(f"Error: Selected baseline log '{selected_log}' does not exist.", flush=True)
        sys.exit(1)

#new baseline log        
elif scan_config.get("newBaseline"):
    log_filename = f"baseline_{timestamp}.log"
    log_path = os.path.join(LOG_DIR, log_filename)
    existing_log_data = None
    
    with open(log_path, "w") as log_file:
        json.dump({"scan_config": scan_config, "timestamp": timestamp, "endpoints": {}}, log_file)
        log_file.write("\n")
    os.chmod(log_path, 0o666)
    
    print(f"[PASSIVE] Log file created: {log_path}", flush=True) #log path received by main.js for tracking


#before starting traffic capture check if scan is figured with timing windows and respect those
###############################################################################################
if scan_config.get("setTimingWindow", False):
    if not scan_config.get("insideTimingWindow", True):
        print("[PASSIVE] Not inside any active timing window. Exiting scan.", flush=True)
        sys.exit(0)

#initiate packet_monitor class to start packet sniffing
#################################################################################
#for stopping scans started by systemctl service
def should_stop(scan_pid, tracking_path):
    try:
        with open(tracking_path, "r") as f:
            pid_data = json.load(f)
        entry = pid_data.get(str(scan_pid))
        return entry is not None and not entry.get("running", True)
    except Exception as e:
        print(f"Failed to check scan status in tracking file: {e}", flush=True)
        return False

def watch_for_soft_kill(scan_pid, monitor, tracking_path):
    global running
    inotify = INotify()
    wd = inotify.add_watch(tracking_path, flags.MODIFY)

    while running:
        for event in inotify.read():
            if event.mask & flags.MODIFY:
                if should_stop(scan_pid, tracking_path):
                    print("Soft stop requested via tracking file. Finalizing scan...", flush=True)
                    running = False
                    monitor.update_endpoint_dictionary()
                    time.sleep(1)
                    inotify.rm_watch(wd)
                    os._exit(0)
        time.sleep(0.1)

#for stopping scans started by electron user 
def stop_scan_factory(monitor):
    def stop_scan(signum, frame):
        global running
        print("Received stop signal. Finalizing scan...", flush=True)
        running = False
        
        print("dictionary update triggered before shutdown", flush=True)
        monitor.update_endpoint_dictionary()
        time.sleep(1)
        sys.exit(0) 
    return stop_scan

try:
    monitor = PacketMonitor(scan_config, log_path, timestamp, add_to_existing)

    #handle stop signals
    signal.signal(signal.SIGINT, stop_scan_factory(monitor))

    soft_kill_thread = threading.Thread(
        target=watch_for_soft_kill,
        args=(os.getpid(), monitor, scan_pid_tracking),
        daemon=True
    )
    soft_kill_thread.start()

    #start monitor in a background thread
    monitor_thread = threading.Thread(target=monitor.monitor, daemon=True)
    monitor_thread.start()

    #start packet sniffing
    sniff(
        iface=monitor.interface,
        prn=monitor.process_packet,
        store=0,
        promisc=True,
        timeout=scan_config["duration"],
        lfilter=lambda pkt: IP in pkt and PROTOCOL_MAP.get(pkt[IP].proto, None) in scan_config["protocols"],
        stop_filter=lambda pkt: not running
    )

    print("[PASSIVE] Scan Complete", flush=True) #tell main.js scan is complete 
except Exception as e:
    print(f"Error during packet sniffing: {e}", flush=True)


