import sys
import json
import requests
import os

VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_KEY")
ABUSEIPDB_API_KEY = os.getenv("ABUSEIPDB_KEY")

# Check keys
if not VIRUSTOTAL_API_KEY or not ABUSEIPDB_API_KEY:
    print(json.dumps({"error": "Missing API keys"}))
    sys.exit(1)

#paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LOG_BASE_DIR = "/var/log/ipfluxio/logs"  
ENDPOINT_DICT_PATH = os.path.join(LOG_BASE_DIR, "archive", "endpoint_dictionary.json")

def fetch_virustotal_data(ip):
    url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
    headers = {"x-apikey": VIRUSTOTAL_API_KEY}

    try:
        response = requests.get(url, headers=headers)
        data = response.json()

        attributes = data.get("data", {}).get("attributes", {})

        return {
            "last_analysis_stats": attributes.get("last_analysis_stats", {}),
            "reputation": attributes.get("reputation", "N/A"),
            "country": attributes.get("country", "N/A"),
            "asn": attributes.get("asn", "N/A"),
            "as_owner": attributes.get("as_owner", "N/A"),
            "last_analysis_results": {
                engine: result.get("result", "clean")
                for engine, result in attributes.get("last_analysis_results", {}).items()
            }
        }

    except Exception as e:
        return {"error": f"Failed to fetch VirusTotal data: {str(e)}"}


def fetch_abuseipdb_data(ip):
    url = "https://api.abuseipdb.com/api/v2/check"
    headers = {"Key": ABUSEIPDB_API_KEY, "Accept": "application/json"}
    params = {"ipAddress": ip, "maxAgeInDays": "90"}

    try:
        response = requests.get(url, headers=headers, params=params)
        data = response.json()

        abuse_data = data.get("data", {})

        return {
            "abuse_score": abuse_data.get("abuseConfidenceScore", "N/A"),
            "is_public": abuse_data.get("isPublic", "N/A"),
            "isp": abuse_data.get("isp", "N/A"),
            "domain": abuse_data.get("domain", "N/A"),
            "usage_type": abuse_data.get("usageType", "N/A"),
            "country": abuse_data.get("countryCode", "N/A"),
            "total_reports": abuse_data.get("totalReports", 0),
            "last_reported_at": abuse_data.get("lastReportedAt", "N/A"),
        }

    except Exception as e:
        return {"error": f"Failed to fetch AbuseIPDB data: {str(e)}"}


def update_endpoint_dictionary(ip, vt_data, abuse_data):
    try:
        #load dictionary
        if os.path.exists(ENDPOINT_DICT_PATH):
            with open(ENDPOINT_DICT_PATH, "r") as file:
                endpoint_data = json.load(file)
        else:
            endpoint_data = {}

        #create entry with security data
        if ip not in endpoint_data:
            endpoint_data[ip] = {}

        endpoint_data[ip]["security_data"] = {"virustotal": vt_data, "abuseipdb": abuse_data}

        #save
        with open(ENDPOINT_DICT_PATH, "w") as file:
            json.dump(endpoint_data, file, indent=4)

        return {"success": True, "message": f"Security data updated for {ip}"}
    except Exception as e:
        return {"error": f"Failed to update endpoint dictionary: {str(e)}"}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No IP address provided"}))
        return

    ip_address = sys.argv[1]

    vt_data = fetch_virustotal_data(ip_address)
    abuse_data = fetch_abuseipdb_data(ip_address)

    result = update_endpoint_dictionary(ip_address, vt_data, abuse_data)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
