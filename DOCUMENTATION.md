# ipflux.io Network Traffic Analyzer 

## Linux Installation Instructions 🐧🐧🐧

Download and install using one of the pre-packaged distribution formats below.
 
---

### For Debian-Based Systems (`.deb`)

#### Step 1 – Download the `.deb` package

```bash
curl -LO https://github.com/nathvnt/ipfluxio-linux/raw/master/release/ipfluxio_1.0.1_amd64.deb
```

#### Step 2 – Install the package

```bash
sudo dpkg -i ipfluxio_1.0.1_amd64.deb
```

---

### For Arch-Based or Other Linux Systems (`.tar.gz`)

#### Step 1 – Download the `.tar.gz` archive

```bash
curl -LO https://github.com/nathvnt/ipfluxio-linux/raw/master/release/ipfluxio-1.0.1.tar.gz
```

#### Step 2 – Extract archive contents

```bash
tar -xvzf ipfluxio-1.0.1.tar.gz
```

#### Step 3 – Navigate to the extracted directory

```bash
cd ipfluxio-1.0.1/
```

#### Step 3 – Run installation script

```bash
./ipflux.io 
```

> *Running this script will prompt for sudo privileges in order to run the post install script for setting up the environment* [  (https://github.com/nathvnt/ipfluxio-linux/blob/master/prod/postinstall.sh)  ](https://github.com/nathvnt/ipfluxio-linux/blob/master/prod/postinstall.sh)

#### If needed, make the script executable:

```bash
chmod +x ./ipflux.io
```

---
### Manual Build Instructions

If you would like to build the project manually using the source code, follow these steps:

---

#### Step 1 – Clone the GitHub repository to obtain the projects source code

```bash
git clone https://github.com/nathvnt/ipfluxio-linux.git
```

#### Step 2 – Navigate to the production folder

```bash
cd ipfluxio-linux/prod/
```

#### Step 3 – Build and bundle the source code to generate packaged distributions

```bash
npm install 
```

```bash
npm run dist
```

#### Step 4 – Navigate to the build output directory

```bash
cd ipflux-build/
```
*Follow the instructions above for installing the `.deb` or `.tar.gz` packages added to the `ipflux-build` directory*

---
## System Requirements

The packaged `.deb` and `.tar.gz` distributions of `ipflux.io` are self-contained, but your system must meet the following requirements for a successful install:

---

### Runtime Requirements (for all users)

- **Linux** system (tested on Debian-based and Arch-based distros)
- **Python 3.7+** must be installed and discoverable in `PATH`
- **`sudo` access** is required during installation to:
  - Set up system-wide services (via `systemd`)
  - Install packet capture permission policies (`polkit`)
  - Create necessary directories in `/opt` and `/var/log`

> *Python is used to create a dedicated virtual environment under `/opt/ipfluxio/venv`, and all backend dependencies are installed there automatically. This isolated Python environment is given setcap privileges to enable capturing network traffic; these escalated privileges will not impact your system’s default Python interpreter*

---
### (Recommended)

- `systemd` (for scheduling scans via `ipfluxio-scheduler.path`)
- `git` (if building from source)
- `curl` or `wget` (to download install packages)

---

### Manual Build Requirements

If you're building from source, you'll need:

- Node.js (v18+ recommended)
- npm (comes with Node.js)
- Git
- Linux (Debian, Arch, or any system with Bash and basic POSIX tools)

Install Node.js via [NodeSource](https://github.com/nodesource/distributions) or [nvm](https://github.com/nvm-sh/nvm).

---

## Data Storage, Privacy Notice, & Installation Paths

*ipflux.io fully respects your **privacy**, all network traffic logs and configuration files are stored **locally** on your device and are **never uploaded, transmitted, or accessible remotely**. No data processed by ipflux.io ever leaves the host system running the application.*

---

After installation, network traffic data logs and configuration files can be found at the following locations on your host machine: 

---
### Linux Data Storage Paths

**Active Scan Logs:**
```bash
/var/log/ipfluxio/logs/active/
```

**Passive (Baseline) Scan Logs:**
```bash
/var/log/ipfluxio/logs/baseline/
```

**Endpoint Data Dictionary:**
```bash
/var/log/ipfluxio/logs/archive/endpoint_dictionary.json
```

**Flagged Endpoint Dictionary:**
```bash
/var/log/ipfluxio/logs/archive/flagged_dictionary.json
```

**Trusted Endpoint Dictionary:**
```bash
/var/log/ipfluxio/logs/archive/trusted_dictionary.json
```

**Resolved Geo-Location Dictionary:**
```bash
/var/log/ipfluxio/logs/archive/geo_history.json
```

**Live Scan Process Tracking:**
```bash
/var/log/ipfluxio/logs/schedule/scan_pid_tracking.json
```

**Scheduled Baseline Scan Configurations:**
```bash
/var/lib/ipfluxio/scheduled_jobs.json
```

### Application Installation Paths (Linux)
---

*These are the paths where the application is installed naturally and where the post installation script places extra resources necessary to run the applicaiton.*

---

**Base Installation:**
```bash
/opt/ipfluxio/
```

**Python Virtual Environment:**
```bash
/opt/ipfluxio/venv/
```

**Default Environment:**
```bash
/opt/ipfluxio/default-env/
```

**Python Scripts:**
```bash
/opt/ipfluxio/backend/
```

**Python Virtual Environment Setcap Policy:**
```bash
/usr/share/polkit-1/actions/com.ipfluxio.setcap.policy
```

**Python Virtual Environment Grant Permissions Script:**
```bash
/usr/local/bin/grant-capture.sh
```

**Passive Baseline Scheduler Service:**
```bash
/etc/systemd/system/ipfluxio-scheduler.service
```

**Passive Baseline Scheduler Service.path:**
```bash
/etc/systemd/system/ipfluxio-scheduler.path
```

**Passive Baseline Register Jobs Script:**
```bash
/usr/local/bin/ipfluxio-register-jobs.sh
```

---

## Useage Guide

**Packet Capture Overview:**

Valid scan configurations are collected from the GUI and sent to the dispatcher script (/opt/ipfluxio/backend/scans/dispatcher.py) when clicking the Start Scan button (Electron main.js spawns the dispatcher as a subprocess). When the dispatcher receives a scan configuration, it is first parsed and then sent to either active_scan.py or passive_scan.py; this spawns another sub process that is now entirely removed from the Electron main process and run in the background. This background scan process first generates or accesses an appropiate traffic log file and then runs a packet capture callback using an instance of the packet_monitor class (/opt/ipfluxio/backend/scans/packet_utils/packet_monitor.py). 

---

### Configuring an Active Scan 
---

Active scans are designed to be run while the Electron GUI is open; any packet capture processes spawned using this mode will automatically be killed when the application is closed.

---

A valid Active scan configurtion requires **six** pieces of data correctly configured to successfully start a scan:

1. **Network Interface**

Valid network interfaces will automatically be detected by the Electron main process and added to the scan configuration menu. 

2. **Time Interval** (start time and end time)

**Start** times set in the past will default to start the scan at the current time. It is recommended to start active scans using the current time, however when configuring a time set the in the future, the active_scan.py process will sleep until desired start time (closing the applicaiton will cause the pending scan to be abandoned).

**End** times must always be set in the future. 

3. **Aggregation Interval**

The packet_monitor class works to collect cumulative data, rolling averages, mins/maxes, etc for the entire duration of a scan; this is the data displayed in the Traffic Table on the lower half of the GUI. The aggregation interval tells the packet_monitor how often it should take a snapshot of the traffic data for each endpoint seen. This defines the density of data points you will see when going to graph scan data (e.g. 5 second interval equals 12 data points per minute). If resource useage is an important factor, when performing long running scans it is reccommended to use a higher aggregation interval to ensure less resource useage and shorter log files.     

4. **Private IP Filtering**

In most cases it is reccomended to filter out Private IP addresses; this tells the packet_monitor to ignore traffic related to other devices connected to your local network and only look for traffic between your host machine and remote addresses.

5. **Traffic Direction Filtering**

This lets you choose if you would like to only capture data for inbound or outbound traffic.

6. **Protocol Filtering**

This lets you choose if you would like to only see traffic that is using specific protocols (e.g. Only capture packets using UDP protocol). 

---

### Configuring a Passive (Baseline) Scan 

---

Passive Baseline scans are mostly the same as Active scans except for they can be configured to run in the background, persisting even after the Electron GUI is closed.

---

A valid Passive scan configurtion requires the same six pieces of data used by Active scans (defined above) with these additional three configurations required:

1. **New Baseline or Existing Baseline**

Passive Baseline scans allow you the option to select an existing baseline log file to extend and continue adding data to.

2. **Run Scan In Background**

Selecting 'Run in Background' will tell Electron main to not kill the passive_scan.py PID when the application is closed, allowing the baseline scan to persist as a background process. The GUI will automatically attach to the background process if it is still running when the Electron GUI is re-opened. 

3. **Set Timing Windows**

Easily the most impactful feature unique to Passive scans, selecting 'Set Timing Windows' will allow you to configure custom timing windows for each day of the week using half-hour incremements. It is reccommended to select 'Run in Background' when setting timing windows to allow for scheduled scans to start smoothly while the GUI is not open. 

The dispatcher script parses configured timing windows and generates scheduled scan configurations for each instance of a given timing window between the scans configured start time and end time. These scheduled scan configurations are written to '/var/lib/ipfluxio/scheduled_jobs.json' where are they automatically read by ipfluxio-scheduler.path (/etc/systemd/system/ipfluxio-scheduler.path); this triggers the register jobs script (/usr/local/bin/ipfluxio-register-jobs.sh) to schedule jobs at a system level for each scheduled scan configuration. The scheduled scan configurations then will get automatically sent to dispatcher (completely passively) at the beginning of a given timing window. 

---

### Useful Commands

---

**View Current Scheduled Baseline Scans:**

*This will show you all the successfully generated systemd timers for the ipfluxio-scheduler.service.*
```bash
systemctl list-timers | grep ipfluxio
```

**View Current Scheduled Scan Output:**

*First run the list-timers command above and then replace the .service argument with the desired timer you want to see.*
```bash
journalctl -u ipfluxio-scan-2025-04-11-monday-1400.service -e --since "10 minutes ago"
```
