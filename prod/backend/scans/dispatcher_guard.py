#!/opt/ipfluxio/venv/bin/python

import sys
import os
import json
from subprocess import run

TRACKING_PATH = "/var/log/ipfluxio/logs/schedule/scan_pid_tracking.json"
DISPATCHER_PATH = "/opt/ipfluxio/backend/scans/dispatcher.py"

def main():
    if len(sys.argv) < 2:
        print("Missing config JSON argument", flush=True)
        sys.exit(1)

    try:
        config = json.loads(sys.argv[1])
        log_path = config.get("logPath")
        if not log_path:
            print("Missing logPath in config", flush=True)
            sys.exit(1)

        if os.path.exists(TRACKING_PATH):
            with open(TRACKING_PATH, "r") as f:
                tracking_data = json.load(f)
                for entry in tracking_data.values():
                    if entry.get("logPath") == log_path and entry.get("hasStarted") is True:
                        print(f"Scan for {log_path} has already started. Skipping.")
                        return 0  #prevent re-run

        # If not started, run dispatcher
        print(f"Launching dispatcher for {log_path}", flush=True)
        result = run([sys.executable, DISPATCHER_PATH, sys.argv[1]])
        return result.returncode

    except Exception as e:
        print(f"Error checking or launching dispatcher: {e}", flush=True)
        sys.exit(1)

if __name__ == "__main__":
    sys.exit(main())
