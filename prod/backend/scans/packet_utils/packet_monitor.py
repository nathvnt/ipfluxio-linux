import sys
import json
import os
import time
import psutil
import ipaddress
import socket
from datetime import datetime
from scapy.all import sniff, IP, TCP, UDP, ICMP, conf
from scans.packet_utils.book_keeper import BookKeeper #watches scan to update endpoint dictionary
from scans.packet_utils.stats_utils import StatsUtils #functions for calculating statistics 
from scans.packet_utils.geo_locator import get_geolocation #for resolving lat/long of endpoints 


def get_process_info(ip):
    for conn in psutil.net_connections():
        if conn.laddr.ip == ip or (conn.raddr and conn.raddr.ip == ip):
            try:
                return psutil.Process(conn.pid).name()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                return "N/A"
    return "N/A"


def is_private_ip(ip):
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return False

PROTOCOL_MAP = {
    1: "ICMP",
    6: "TCP",
    17: "UDP",
    41: "IPv6",
    89: "OSPF"
}

class PacketMonitor(BookKeeper, StatsUtils):
    def __init__(self, scan_config, log_path, timestamp, add_to_existing):
        """
        init PacketMonitor using scan config
        """
        self.scan_config = scan_config
        self.log_path = log_path
        self.endpoint_dict_path = "/var/log/ipfluxio/logs/archive/endpoint_dictionary.json"
        self.timestamp = timestamp
        self.add_to_existing = add_to_existing
        self.interface = scan_config.get("networkInterface")
        self.host_ip = self._get_host_ip()
        self.config_direction = scan_config.get("trafficDirection")
        self.exclude_private = scan_config.get("excludePrivate", False)
        self.start_time = time.time()
        self.history = []
        self.last_agg_time = time.time()
        self.history_buffer = {}  
        self.agg_interval = self.scan_config.get("aggInterval")
        self.UPDATE_INTERVAL = 30  #for book keeper
        self.MIN_SAMPLE_THRESHOLD = 100
        self.next_update_time = time.time() + self.UPDATE_INTERVAL
        self.endpoints = self.extract_existing_endpoints() if self.add_to_existing else {}
        #parse scan config end time to datetime object
        end_str = self.scan_config.get("end")
        if end_str:
            try:
                self.scan_end = datetime.strptime(end_str, "%Y-%m-%dT%H:%M")
            except ValueError:
                print(f"Invalid end time format: {end_str}", flush=True)
                self.scan_end = None
        else:
            self.scan_end = None


    def extract_existing_endpoints(self): 
        """Extract existing endpoints from log file if it exists."""
        try:
            with open(self.log_path, "r") as log_file:
                log_data = json.load(log_file)  
                endpoints = log_data.get("endpoints", {})

            if endpoints:
                return endpoints
            else:
                return {}

        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Warning: Could not read existing endpoints: {e}", flush=True)
            return {}


    def _get_host_ip(self):
        """determine host IP"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.connect(("8.8.8.8", 80))
            host_ip = sock.getsockname()[0]
            sock.close()
            return host_ip
        except Exception as e:
            print(f"[Warning] Could not determine host IP: {e}")
            return None


    def process_packet(self, pkt):
        if not pkt.haslayer(IP):
            return

        #extract data from packet 
        src_ip = pkt[IP].src
        dst_ip = pkt[IP].dst
        ttl_value = pkt[IP].ttl
        proto = PROTOCOL_MAP.get(pkt[IP].proto, "Unknown")
        src_port, dst_port = None, None
        if pkt.haslayer(TCP):
            src_port, dst_port = pkt[TCP].sport, pkt[TCP].dport
        elif pkt.haslayer(UDP):
            src_port, dst_port = pkt[UDP].sport, pkt[UDP].dport
        packet_size = len(pkt) 
        timestamp = time.time()

        if proto not in self.scan_config["protocols"]:
            return

        #determine traffic direction
        direction = 'outbound' if src_ip == self.host_ip else 'inbound'
        remote_ip = dst_ip if direction == 'outbound' else src_ip

        if remote_ip == self.host_ip:
            return

        #filter out private ips if configured 
        if self.exclude_private and is_private_ip(remote_ip):
            #print(f"[Filtered: Private Endpoint] {remote_ip} (Direction: {direction})", flush=True)
            return

        #check if configured to filter based on direction
        if self.config_direction in ['inbound', 'outbound'] and self.config_direction != direction:
            return

        if remote_ip not in self.endpoints: #add object if not in log yet 
            self.endpoints[remote_ip] = {
                "source": "N/A", "destination": "N/A",
                "inbound": 0, "outbound": 0, "out_in_ratio": 0.0,
                "avg_inbound_per_second": 0.0, "avg_outbound_per_second": 0.0,
                "avg_inbound_per_minute": 0.0, "avg_outbound_per_minute": 0.0,
                "port_numbers": [], "protocols": [], 
                "processes": [], "location": None,
                "avg_size": 0.0, "largest_packet": 0,
                "bytes_sent": 0, "bytes_received": 0,
                "avg_inbound_bps": 0.0, "avg_outbound_bps": 0.0,
                "avg_inbound_bpm": 0.0, "avg_outbound_bpm": 0.0,
                "avg_iat": 0.0, "max_iat": 0.0,
                "last_packet_time": None,
                "avg_ttl": 0.0, "max_ttl": 0, 
                "syn_count": 0, "rst_count": 0,
                "history": []
            }
            self.history_buffer[remote_ip] = {
                "inbound": 0, "outbound": 0,
                "avg_inbound_per_second": 0.0, "avg_outbound_per_second": 0.0,
                "bytes_sent": 0, "bytes_received": 0,
                "avg_inbound_bps": 0.0, "avg_outbound_bps": 0.0,
                "avg_size": 0.0, "largest_packet": 0.0,
                "avg_iat": 0.0, "avg_ttl": 0.0,
                "syn_count": 0, "rst_count": 0,
            }

        endpoint = self.endpoints[remote_ip]

        #add history buffer for existing endpoints when extending previous scan
        if remote_ip not in self.history_buffer and self.add_to_existing:
            self.history_buffer[remote_ip] = {
                "inbound": 0, "outbound": 0,
                "avg_inbound_per_second": 0.0, "avg_outbound_per_second": 0.0,
                "bytes_sent": 0, "bytes_received": 0,
                "avg_inbound_bps": 0.0, "avg_outbound_bps": 0.0,
                "avg_size": 0.0, "largest_packet": 0.0,
                "avg_iat": 0.0, "avg_ttl": 0.0,
                "syn_count": 0, "rst_count": 0,
            }

        buffer = self.history_buffer[remote_ip]

        if self.config_direction == 'outbound':
            endpoint["source"] = self.host_ip
        if self.config_direction == 'inbound':
            endpoint["destination"] = self.host_ip

        #update outbound/inbound packet count and ratio
        endpoint[direction] += 1
        buffer[direction] += 1
        endpoint["out_in_ratio"] = round(endpoint["outbound"] / max(1, endpoint["inbound"]), 3)

        #update bytes sent/received
        buffer["bytes_sent" if direction == "outbound" else "bytes_received"] += packet_size
        endpoint["bytes_sent" if direction == "outbound" else "bytes_received"] += packet_size

        #update average packet size
        endpoint["avg_size"] = round(
            (endpoint["bytes_sent"] + endpoint["bytes_received"]) / max(1, (endpoint["inbound"] + endpoint["outbound"])), 3
        )
        buffer["avg_size"] = round(
            (buffer["bytes_sent"] + buffer["bytes_received"]) / max(1, (buffer["inbound"] + buffer["outbound"])), 3
        )

        #update largest packet 
        endpoint["largest_packet"] = round(max(endpoint["largest_packet"], packet_size), 3)
        buffer["largest_packet"] = round(max(buffer["largest_packet"], packet_size), 3)

        #add port number
        if src_port and src_port not in endpoint["port_numbers"]:
            endpoint["port_numbers"].append(src_port)

        if dst_port and dst_port not in endpoint["port_numbers"]:
            endpoint["port_numbers"].append(dst_port)

        #add protocol
        if proto not in endpoint["protocols"]:
            endpoint["protocols"].append(proto)

        #add process
        process = get_process_info(remote_ip)
        if process not in endpoint["processes"]:
            endpoint["processes"].append(process)
        
        #add lat/long
        if endpoint["location"] is None:
            try:
                location = get_geolocation(remote_ip)
                if location == [0, 0]: 
                    location = None
                endpoint["location"] = location 
            except Exception as e:
                print(f"[Error] Failed to retrieve geolocation for {remote_ip}: {e}")

        #update packet inter-arrival time values
        packet_count = (endpoint["inbound"] + endpoint["outbound"])
        buffer_packet_count = (buffer["inbound"] + buffer["outbound"])

        last_time = endpoint["last_packet_time"]
        if last_time:
            interval = timestamp - last_time
            #rolling average iat
            endpoint["avg_iat"] = round(
                ((endpoint["avg_iat"] * (packet_count - 1)) + interval) / packet_count, 3
            )
            #rolling average iat for buffer
            buffer["avg_iat"] = round(
                ((buffer["avg_iat"] * (buffer_packet_count - 1)) + interval) / buffer_packet_count, 3
            )
            #iat high
            if endpoint["max_iat"] is None or interval > endpoint["max_iat"]:
                endpoint["max_iat"] = round(interval, 3)

        endpoint["last_packet_time"] = timestamp 

        #update packet TTL values
        #rolling average
        endpoint["avg_ttl"] = round(
            ((endpoint["avg_ttl"] * (packet_count - 1)) + ttl_value) / packet_count, 3
        )
        #rolling average for buffer
        buffer["avg_ttl"] = round(
            ((buffer["avg_ttl"] * (buffer_packet_count - 1)) + ttl_value) / buffer_packet_count, 3
        )
        #ttl high
        if endpoint["max_ttl"] is None or ttl_value > endpoint["max_ttl"]:
            endpoint["max_ttl"] = ttl_value

        #update syn and rst counts
        if pkt.haslayer(TCP):
            if pkt[TCP].flags & 0x02:  
                endpoint["syn_count"] += 1
                buffer["syn_count"] += 1
            if pkt[TCP].flags & 0x04:  
                endpoint["rst_count"] += 1
                buffer["rst_count"] += 1

        #calculate rates for endpoint
        elapsed_time = time.time() - self.start_time
        if elapsed_time > 0:
            #inbound/outbound average packets per second and minute
            endpoint["avg_inbound_per_second"] = round(endpoint["inbound"] / elapsed_time, 3)
            endpoint["avg_outbound_per_second"] = round(endpoint["outbound"] / elapsed_time, 3)
            endpoint["avg_inbound_per_minute"] = round((endpoint["inbound"] / elapsed_time) * 60, 3)
            endpoint["avg_outbound_per_minute"] = round((endpoint["outbound"] / elapsed_time) * 60, 3)

            #inbound/outbound average bytes per second and minute
            endpoint["avg_inbound_bps"] = round(endpoint["bytes_received"] / elapsed_time, 3)
            endpoint["avg_outbound_bps"] = round(endpoint["bytes_sent"] / elapsed_time, 3)
            endpoint["avg_inbound_bpm"] = round((endpoint["bytes_received"] / elapsed_time) * 60, 3)
            endpoint["avg_outbound_bpm"] = round((endpoint["bytes_sent"] / elapsed_time) * 60, 3)

        #calculate rates for aggregation interval history buffer
        buffer_elapsed_time = time.time() - self.last_agg_time
        if elapsed_time > 0:
            #inbound/outbound average packets per second  
            buffer["avg_inbound_per_second"] = round(buffer["inbound"] / buffer_elapsed_time, 3)
            buffer["avg_outbound_per_second"] = round(buffer["outbound"] / buffer_elapsed_time, 3)

            #inbound/outbound average bytes per second 
            buffer["avg_inbound_bps"] = round(buffer["bytes_received"] / buffer_elapsed_time, 3)
            buffer["avg_outbound_bps"] = round(buffer["bytes_sent"] / buffer_elapsed_time, 3)

        #update endpoint log data on per packet basis 
        self._write_log(remote_ip, direction, packet_size)
        
        #check if its time to aggregate history buffer 
        current_time = time.time()
        if current_time - self.last_agg_time >= self.agg_interval:
            self._aggregate_history()
            self.last_agg_time = current_time


    def _aggregate_history(self):
        now = time.time()
        interval = now - self.last_agg_time if self.last_agg_time else self.agg_interval

        for ip, buffer in self.history_buffer.items():
            if buffer["inbound"] == 0 and buffer["outbound"] == 0:
                continue

            snapshot = {
                "timestamp": now,
                "inbound": buffer["inbound"],
                "outbound": buffer["outbound"],
                "avg_inbound_per_second": buffer["avg_inbound_per_second"],
                "avg_outbound_per_second": buffer["avg_outbound_per_second"],
                "bytes_sent": buffer["bytes_sent"],
                "bytes_received": buffer["bytes_received"],
                "avg_inbound_bps": buffer["avg_inbound_bps"],
                "avg_outbound_bps": buffer["avg_outbound_bps"], 
                "avg_size": buffer["avg_size"],
                "largest_packet": buffer["largest_packet"],
                "avg_iat": buffer["avg_iat"],
                "avg_ttl": buffer["avg_ttl"],
                "syn_count": buffer["syn_count"],
                "rst_count": buffer["rst_count"], 
                "book_keeper_seen": False
            }
            
            self.endpoints[ip]["history"].append(snapshot)
            
            self.history_buffer[ip] = {  #reset buffer
                "inbound": 0, "outbound": 0,
                "avg_inbound_per_second": 0.0, "avg_outbound_per_second": 0.0,
                "bytes_sent": 0, "bytes_received": 0,
                "avg_inbound_bps": 0.0, "avg_outbound_bps": 0.0,
                "avg_size": 0.0, "largest_packet": 0.0,
                "avg_iat": 0.0, "avg_ttl": 0.0,
                "syn_count": 0, "rst_count": 0,
            }

        #write history snapshot to log
        self._write_log()


    #update log file with scan data
    def _write_log(self, remote_ip=None, direction=None, packet_size=None):
        with open(self.log_path, "w") as log_file:
            json.dump({"scan_config": self.scan_config, "timestamp": self.timestamp, "endpoints": self.endpoints}, log_file, indent=4)