import signal
import sys
import json
import os
import time
import psutil
import socket
import threading
from datetime import datetime
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
LOG_DIR = os.path.join(LOG_BASE_DIR, "active")

os.makedirs(LOG_DIR, exist_ok=True)

current_time = datetime.now()

#handle start/end time and duration
################################################
if scan_config["start"] == "now":
    start_time = current_time  
else:
    try:
        start_time = datetime.strptime(scan_config["start"], "%Y-%m-%dT%H:%M")
        if start_time < current_time:  
            print(f"Provided start time ({start_time}) is in the past. Starting scan immediately.", flush=True)
            start_time = current_time
    except ValueError:
        print("Error: Invalid start time format. Scan cannot start.", flush=True)
        sys.exit(1)

if scan_config["end"]:
    try:
        end_time = datetime.strptime(scan_config["end"], "%Y-%m-%dT%H:%M")
        remaining_time = (end_time - start_time).total_seconds()
        scan_config["duration"] = max(0, int(remaining_time))  
    except ValueError:
        print("Error: Invalid end time format. Scan cannot start.", flush=True)
        sys.exit(1)
else:
    scan_config["duration"] = None  

if scan_config["duration"] == 0:
    print("Error: End time is in the past. Scan cannot start.", flush=True)
    sys.exit(1)

if start_time > current_time:
    wait_time = (start_time - current_time).total_seconds()
    print(f"Waiting {wait_time:.2f} seconds until scan starts at {start_time.strftime('%Y-%m-%d %H:%M')}", flush=True)
    time.sleep(wait_time)


#set interface packets will be captured on 
################################################
INTERFACE = scan_config.get("networkInterface")
if not INTERFACE:
    print("Error: No network interface specified. Exiting.", flush=True)
    sys.exit(1)

print(f"Using network interface: {INTERFACE}", flush=True)


#setup log file scan data will be recorded to 
################################################
add_to_existing = False
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_filename = f"network_traffic_{timestamp}.log"
log_path = os.path.join(LOG_DIR, log_filename)

with open(log_path, "w") as log_file:
    json.dump({"scan_config": scan_config, "timestamp": timestamp, "endpoints": {}}, log_file)
    log_file.write("\n")

print(f"[ACTIVE] Log file created: {log_path}", flush=True) #log path received by main.js for tracking

def packet_filter(packet):
    if IP in packet:
        protocol = PROTOCOL_MAP.get(packet[IP].proto, f"Unknown ({packet[IP].proto})")
        return protocol in scan_config["protocols"]
    return False


#initiate packet_monitor class to start packet sniffing
#################################################################################
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

    #handle stop signal
    signal.signal(signal.SIGINT, stop_scan_factory(monitor))

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

    print("[ACTIVE] Scan Complete", flush=True) #tell main.js scan is complete 
except Exception as e:
    print(f"Error during packet sniffing: {e}", flush=True)

