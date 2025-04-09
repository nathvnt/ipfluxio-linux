#!/bin/bash
# ipfluxio-register-jobs.sh - Installs systemd .service/.timer units for each scheduled scan config.

set -e

#paths
CONFIG_PATH="/var/lib/ipfluxio/scheduled_jobs.json"
DISPATCHER="/opt/ipfluxio/backend/scans/dispatcher.py"
DISPATCHER_GUARD="/opt/ipfluxio/backend/scans/dispatcher_guard.py"
SYSTEMD_DIR="/etc/systemd/system"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "No scheduled job config found at $CONFIG_PATH"
  exit 0
fi

#clean up previously registered timers/services
for f in "$SYSTEMD_DIR"/ipfluxio-scan-*.{service,timer}; do
  [[ -e "$f" ]] || continue
  unit_name="$(basename "$f")"
  systemctl disable --now "$unit_name" || true
  rm -f "$f"
  echo "Removed old unit: $unit_name"
done

#reload systemd 
systemctl daemon-reexec
systemctl daemon-reload

#loop through each config to write new jobs
jq -c '.[]' "$CONFIG_PATH" | while read -r entry; do
  day=$(echo "$entry" | jq -r '.day')
  time_str=$(echo "$entry" | jq -r '.time')
  config=$(echo "$entry" | jq -c '.config')

  scan_date=$(echo "$config" | jq -r '.start' | cut -d'T' -f1)  
  unit_id="${scan_date}-${day}-${time_str//:/}"  
  service_name="ipfluxio-scan-${unit_id}.service"
  timer_name="ipfluxio-scan-${unit_id}.timer"
  service_path="$SYSTEMD_DIR/$service_name"
  timer_path="$SYSTEMD_DIR/$timer_name"

  config_json=$(echo "$config" | sed 's/"/\\"/g')
  python_bin=$(echo "$config" | jq -r '.pythonBinary')

  cat <<EOF > "$service_path"
[Unit]
Description=IPFluxio Scheduled Passive Scan $unit_id
After=network.target

[Service]
Type=oneshot
ExecStart=$DISPATCHER_GUARD "$config_json"
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW
NoNewPrivileges=false
EOF

  cat <<EOF > "$timer_path"
[Unit]
Description=Run IPFluxio scan $unit_id

[Timer]
OnCalendar=${day^} ${time_str}
Persistent=true

[Install]
WantedBy=timers.target
EOF

  #enable and start timer
  systemctl enable --now "$timer_name"
  echo "Registered and enabled $timer_name"
done

exit 0
