import time
import json
import subprocess
import os
import psutil 
from datetime import datetime
from scans.packet_utils.flagger import update_flagged_trusted

class BookKeeper:

    def monitor(self):
        """monitor scan and update endpoint dictionary"""
        print("MONITORING SCAN BOOK KEEPER STARTED", flush=True)

        while True:
            current_time = time.time()

            #do final update if scan is almost finished 
            if hasattr(self, 'scan_end') and self.scan_end:
                if self.scan_end < datetime.fromtimestamp(self.next_update_time):
                    remaining_time = (self.scan_end - datetime.now()).total_seconds()

                    sleep_time = max(remaining_time - 4, 0)
                    print(f"Scan ending soon. Book Keeper sleeping {sleep_time:.1f}s before final dictionary update.", flush=True)
                    time.sleep(sleep_time)

                    print("Final dictionary update.", flush=True)
                    self.update_endpoint_dictionary()
                    break 

            #update every interval (60s)
            if current_time >= self.next_update_time:
                print("BOOK KEEPER UPDATING DICTIONARY", flush=True)
                self.update_endpoint_dictionary()
                self.next_update_time = current_time + self.UPDATE_INTERVAL

            time.sleep(5)

    #update endpoint dictionary with scan data every 60 seconds 
    def update_endpoint_dictionary(self):
        #open endpoint dictionary 
        if not os.path.exists(self.endpoint_dict_path) or os.stat(self.endpoint_dict_path).st_size == 0:
            print(f"Warning: {self.endpoint_dict_path} does not exist or is empty; creating new", flush=True)
            endpoint_dict = {} 
        else:
            with open(self.endpoint_dict_path, "r") as dict_data:
                try:
                    endpoint_dict = json.load(dict_data)
                except json.JSONDecodeError:
                    print(f"JSONDecodeError: {self.endpoint_dict_path} is empty or corrupt; recreating", flush=True)
                    endpoint_dict = {} 
 
        #loop through current scans endpoint data 
        for ip, endpoint in self.endpoints.items():

            if ip not in endpoint_dict: #create entry for never seen endpoint 
                endpoint_dict[ip] = { 
                    "first_seen": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "last_seen": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    
                    #inbound outbound packet data
                    "total_inbound": 0,
                    "total_outbound": 0,
                    "total_packets": 0,
                    "out_in_ratio": endpoint["out_in_ratio"],
                    "avg_inbound_per_second": endpoint["avg_inbound_per_second"],
                    "avg_outbound_per_second": endpoint["avg_outbound_per_second"], 
                    "avg_inbound_per_minute": endpoint["avg_inbound_per_minute"], 
                    "avg_outbound_per_minute": endpoint["avg_outbound_per_minute"],

                    #packet size data
                    "avg_size": endpoint["avg_size"],
                    "largest_packet": endpoint["largest_packet"],
                    "total_bytes_sent": 0,
                    "total_bytes_received": 0,
                    "avg_inbound_bps": endpoint["avg_inbound_bps"],
                    "avg_outbound_bps": endpoint["avg_outbound_bps"],
                    "avg_inbound_bpm": endpoint["avg_inbound_bpm"],
                    "avg_outbound_bpm": endpoint["avg_outbound_bpm"],
                    
                    #lists
                    "port_numbers": endpoint["port_numbers"],
                    "protocols": endpoint["protocols"],
                    "processes": endpoint["processes"],
                    "location": endpoint["location"],
                    
                    #iat and ttl values
                    "avg_iat": endpoint["avg_iat"],
                    "max_iat": endpoint["max_iat"],
                    "avg_ttl": endpoint["avg_ttl"],
                    "max_ttl": endpoint["max_ttl"],
                    
                    #syn/rest count totals
                    "syn_count": endpoint["syn_count"],
                    "rst_count": endpoint["rst_count"],

                    "largest_packet_mean": endpoint["largest_packet"],
                    "largest_packet_M2": 0.0,
                    "largest_packet_stddev": 0.0,

                    "out_in_ratio_mean": endpoint["out_in_ratio"],
                    "out_in_ratio_M2": 0.0,
                    "out_in_ratio_stddev": 0.0,

                    #inbound PPS & BPS
                    "pps_in_mean": endpoint["avg_inbound_per_second"],
                    "pps_in_M2": 0.0,
                    "pps_in_stddev": 0.0,
                    "bps_in_mean": endpoint["avg_inbound_bps"],
                    "bps_in_M2": 0.0,
                    "bps_in_stddev": 0.0,

                    #outbound PPS & BPS
                    "pps_out_mean": endpoint["avg_outbound_per_second"],
                    "pps_out_M2": 0.0,
                    "pps_out_stddev": 0.0,
                    "bps_out_mean": endpoint["avg_outbound_bps"],
                    "bps_out_M2": 0.0,
                    "bps_out_stddev": 0.0,

                    "iat_mean": endpoint["avg_iat"],
                    "iat_M2": 0.0,
                    "iat_stddev": 0.0,

                    "largest_packet_n": 1,
                    "out_in_ratio_n": 1,
                    "pps_in_n": 1,
                    "bps_in_n": 1,
                    "pps_out_n": 1,
                    "bps_out_n": 1,
                    "iat_n": 1

                }
            #else: #update known endpoint data in dictionary 
            ep_data = endpoint_dict[ip]
            ep_data["last_seen"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            
            new_inbound = 0
            new_outbound = 0
            new_out_in_ratio = 0.0
            new_bytes_sent = 0
            new_bytes_received = 0
            new_packets = 0
            new_largest_packet = 0.0
            new_syn = 0
            new_rst = 0

            new_averages = {
                "avg_size": 0.0,
                "avg_iat": 0.0,
                "avg_ttl": 0.0,
                "avg_inbound_per_second": 0.0,
                "avg_outbound_per_second": 0.0,
                "avg_inbound_bps": 0.0,
                "avg_outbound_bps": 0.0
            }
            snapshot_count = 0

            #only get new data using book_keeper_seen flag
            #this avoids double counting 
            for entry in endpoint["history"]:
                if not entry.get("book_keeper_seen", False): 
                    new_inbound += entry["inbound"]
                    new_outbound += entry["outbound"]
                    new_bytes_sent += entry["bytes_sent"]
                    new_bytes_received += entry["bytes_received"]
                    new_packets += entry["inbound"] + entry["outbound"]
                    new_largest_packet = max(new_largest_packet, entry["largest_packet"])
                    new_syn += entry["syn_count"]
                    new_rst += entry["rst_count"]

                    for key in new_averages.keys():
                        new_averages[key] += entry[key]

                    snapshot_count += 1
                    #flag history entry as seen 
                    entry["book_keeper_seen"] = True            

            ep_data["total_inbound"] += new_inbound
            ep_data["total_outbound"] += new_outbound
            new_out_in_ratio = round(new_outbound / max(1, new_inbound), 3)
            ep_data["total_packets"] += new_packets
            ep_data["total_bytes_sent"] += new_bytes_sent
            ep_data["total_bytes_received"] += new_bytes_received
            #TCP flags (syn_count, rst_count)
            ep_data["syn_count"] += new_syn
            ep_data["rst_count"] += new_rst

            #average new snapshot data
            if snapshot_count > 0:
                for key in new_averages.keys():
                    new_averages[key] /= snapshot_count



            #use weighted average to merge new data with existing data
            total_packets_dict = ep_data["total_packets"]  #existing total
            total_packets_new = new_packets  #from new unseen snapshots
            total_packets_combined = total_packets_dict + total_packets_new

            if total_packets_new > 0:
                for key in new_averages.keys():
                    ep_data[key] = self.calculate_weighted_average( #from stats_utils.py
                        ep_data[key], total_packets_dict, new_averages[key], total_packets_new
                    )

                #convert seconds to minutes
                ep_data["avg_inbound_per_minute"] = round(ep_data["avg_inbound_per_second"] * 60, 3)
                ep_data["avg_outbound_per_minute"] = round(ep_data["avg_outbound_per_second"] * 60, 3)
                ep_data["avg_inbound_bpm"] = round(ep_data["avg_inbound_bps"] * 60, 3)
                ep_data["avg_outbound_bpm"] = round(ep_data["avg_outbound_bps"] * 60, 3)
                

                ep_data["out_in_ratio"] = self.calculate_weighted_average(
                    ep_data["out_in_ratio"], total_packets_dict, new_out_in_ratio, total_packets_new                
                )

            #handle data stored in lists
            unique_list_keys = ["port_numbers", "protocols", "processes", "location"]

            for key in unique_list_keys:
                if isinstance(endpoint[key], list):  
                    for item in endpoint[key]:
                        if item not in ep_data[key]: 
                            ep_data[key].append(item)

            #max values
            ep_data["max_iat"] = max(ep_data["max_iat"], endpoint["max_iat"])
            ep_data["max_ttl"] = max(ep_data["max_ttl"], endpoint["max_ttl"])
            ep_data["largest_packet"] = max(ep_data["largest_packet"], new_largest_packet)


            self._write_log() #update log with history snapshots flagged as seen

            self.update_stats_and_check_flags(ip, new_averages, new_out_in_ratio, new_largest_packet, ep_data)

            #write updated endpoint dictionary
            with open(self.endpoint_dict_path, "w") as epd:
                json.dump(endpoint_dict, epd, indent=4)

            
    def update_stats_and_check_flags(self, ip, new_averages, new_out_in_ratio, new_largest_packet, ep_data):
        flagged = False
        flag_reasons = []

        # -----------------------------
        #largest packet 
        n_key = "largest_packet_n"
        n, mean, M2, stddev = self.update_running_stats(
            ep_data.get(n_key, 1),
            ep_data.get("largest_packet_mean", new_largest_packet),
            ep_data.get("largest_packet_M2", 0.0),
            new_largest_packet
        )
        ep_data["largest_packet_mean"] = mean
        ep_data["largest_packet_M2"] = M2
        ep_data["largest_packet_stddev"] = stddev
        ep_data[n_key] = n

        if new_largest_packet > mean + 3 * stddev:
            flagged = True
            flag_reasons.append("Largest packet size anomaly")

        # -----------------------------
        #out/in ratio
        n_key = "out_in_ratio_n"
        n, mean, M2, stddev = self.update_running_stats(
            ep_data.get(n_key, 1),
            ep_data.get("out_in_ratio_mean", new_out_in_ratio),
            ep_data.get("out_in_ratio_M2", 0.0),
            new_out_in_ratio  # using updated cumulative ratio
        )
        ep_data["out_in_ratio_mean"] = mean
        ep_data["out_in_ratio_M2"] = M2
        ep_data["out_in_ratio_stddev"] = stddev
        ep_data[n_key] = n

        if ep_data["out_in_ratio"] > mean + 2 * stddev:
            flagged = True
            flag_reasons.append("Out/In ratio anomaly")

        # -----------------------------
        #PPS & BPS (inbound & outbound)
        pps_bps_keys = [
            ("avg_inbound_per_second", "pps_in"),
            ("avg_outbound_per_second", "pps_out"),
            ("avg_inbound_bps", "bps_in"),
            ("avg_outbound_bps", "bps_out"),
        ]

        for key, prefix in pps_bps_keys:
            n_key = f"{prefix}_n" 
            n, mean, M2, stddev = self.update_running_stats(
                ep_data.get(n_key, 1),
                ep_data.get(f"{prefix}_mean", new_averages[key]),
                ep_data.get(f"{prefix}_M2", 0.0),
                new_averages[key]
            )
            ep_data[f"{prefix}_mean"] = mean
            ep_data[f"{prefix}_M2"] = M2
            ep_data[f"{prefix}_stddev"] = stddev
            ep_data[n_key] = n 
            
            # Threshold check
            if n >= self.MIN_SAMPLE_THRESHOLD and new_averages[key] > mean + 3 * stddev:
                flagged = True
                flag_reasons.append(f"{prefix.upper()} anomaly")

        # -----------------------------
        # IAT
        n_key = "iat_n"
        n, mean, M2, stddev = self.update_running_stats(
            ep_data.get(n_key, 1),
            ep_data.get("iat_mean", new_averages["avg_iat"]),
            ep_data.get("iat_M2", 0.0),
            new_averages["avg_iat"]
        )
        ep_data["iat_mean"] = mean
        ep_data["iat_M2"] = M2
        ep_data["iat_stddev"] = stddev
        ep_data[n_key] = n

        if new_averages["avg_iat"] < mean - 2 * stddev:
            flagged = True
            flag_reasons.append("Low IAT anomaly")

        # -----------------------------
        #flag log
        if ep_data.get("largest_packet_n", 1) >= self.MIN_SAMPLE_THRESHOLD:
            if flagged:
                print(f"[FLAGGED] Endpoint {ip}: {', '.join(flag_reasons)}", flush=True)
                reason_str = "; ".join(flag_reasons)
                self.pass_flag(ip, "flagged", reason_str)


    def pass_flag(self, ip, status, reason):
        log_file_name = os.path.basename(self.log_path)
        update_flagged_trusted(ip, status, log_file_name, reason)
        print(f"Flag updated for {ip} ({status})", flush=True)

