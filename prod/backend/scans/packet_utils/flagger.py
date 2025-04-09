import argparse
import json
import os
from datetime import datetime, time
import time


#paths
LOG_BASE_DIR = "/var/log/ipfluxio/logs"  
FLAGGED_FILE = os.path.join(LOG_BASE_DIR, 'archive', 'flagged_dictionary.json')
TRUSTED_FILE = os.path.join(LOG_BASE_DIR, 'archive', 'trusted_dictionary.json')


def read_json(file_path):
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            content = f.read().strip()
            if not content:  
                return {}
            return json.loads(content)


def write_json(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)


def append_history(entry, reason, log_file):
    timestamp = time.time()  
    history_entry = {
        "timestamp": timestamp,
        "reason": reason,
        "log_file": log_file
    }
    if "history" not in entry:
        entry["history"] = []
    entry["history"].append(history_entry)


def update_flagged_trusted(ip, status, log_file, reason):
    flagged_data = read_json(FLAGGED_FILE)
    trusted_data = read_json(TRUSTED_FILE)
    timestamp_iso = datetime.utcnow().isoformat()

    if status == "flagged":
        #update flagged dictionary
        if ip not in flagged_data:
            flagged_data[ip] = {
                "ip": ip,
                "first_flagged": timestamp_iso,
                "last_flagged": timestamp_iso,
                "currently_flagged": True,
                "currently_trusted": False,
                "history": []
            }
        else:
            flagged_data[ip]["last_flagged"] = timestamp_iso
            flagged_data[ip]["currently_flagged"] = True
            flagged_data[ip]["currently_trusted"] = False

        append_history(flagged_data[ip], reason, log_file)

        #reflect update in trusted dictionary 
        if ip in trusted_data:
            trusted_data[ip]["currently_trusted"] = False
            trusted_data[ip]["currently_flagged"] = True

    elif status == "trusted":
        #update trusted dictionary
        if ip not in trusted_data:
            trusted_data[ip] = {
                "ip": ip,
                "first_trusted": timestamp_iso,
                "last_trusted": timestamp_iso,
                "currently_flagged": False,
                "currently_trusted": True,
                "history": []
            }
        else:
            trusted_data[ip]["last_trusted"] = timestamp_iso
            trusted_data[ip]["currently_trusted"] = True
            trusted_data[ip]["currently_flagged"] = False

        append_history(trusted_data[ip], reason, log_file)

        #reflect update in flagged dictionary 
        if ip in flagged_data:
            flagged_data[ip]["currently_flagged"] = False
            flagged_data[ip]["currently_trusted"] = True

    elif status == "none":
        if ip in flagged_data:
            flagged_data[ip]["currently_flagged"] = False
            flagged_data[ip]["currently_trusted"] = False
        if ip in trusted_data:
            trusted_data[ip]["currently_trusted"] = False
            trusted_data[ip]["currently_flagged"] = False

    #save updates
    write_json(FLAGGED_FILE, flagged_data)
    write_json(TRUSTED_FILE, trusted_data)

    #output result to main.js
    print(json.dumps({"success": True, "ip": ip, "status": status}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update flagged/trusted dictionaries")
    parser.add_argument("--ip", required=True)
    parser.add_argument("--status", required=True, choices=["flagged", "trusted", "none"])
    parser.add_argument("--log-file", required=True)
    parser.add_argument("--reason", required=True)
    args = parser.parse_args()

    update_flagged_trusted(args.ip, args.status, args.log_file, args.reason)



