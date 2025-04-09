#!/bin/bash

set -e

# === paths ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_PAYLOAD_DIR="$(dirname "$SCRIPT_DIR")"

POLICY_SRC="$SCRIPT_DIR/assets/com.ipfluxio.setcap.policy"
SCRIPT_SRC="$SCRIPT_DIR/assets/grant-capture.sh"
REGISTER_HELPER_SRC="$SCRIPT_DIR/assets/ipfluxio-register-jobs.sh"
SCHEDULER_SERVICE_SRC="$SCRIPT_DIR/assets/ipfluxio-scheduler.service"
SCHEDULER_PATH_SRC="$SCRIPT_DIR/assets/ipfluxio-scheduler.path"

INSTALL_ROOT="/opt/ipfluxio"
BACKEND_SRC="$SCRIPT_DIR/backend"
LOGS_SRC="$SCRIPT_DIR/logs"
LOGS_DST="/var/log/ipfluxio"
ENV_SRC="$SCRIPT_DIR/default-env"

POLICY_DEST="/usr/share/polkit-1/actions/com.ipfluxio.setcap.policy"
SCRIPT_DEST="/usr/local/bin/grant-capture.sh"
REGISTER_HELPER_DEST="/usr/local/bin/ipfluxio-register-jobs.sh"
SCHEDULER_SERVICE_DEST="/etc/systemd/system/ipfluxio-scheduler.service"
SCHEDULER_PATH_DEST="/etc/systemd/system/ipfluxio-scheduler.path"

echo "Installing system policy and helper scripts..."
install -m 644 "$POLICY_SRC" "$POLICY_DEST"
install -m 755 "$SCRIPT_SRC" "$SCRIPT_DEST"
install -m 755 "$REGISTER_HELPER_SRC" "$REGISTER_HELPER_DEST"
install -m 644 "$SCHEDULER_SERVICE_SRC" "$SCHEDULER_SERVICE_DEST"
install -m 644 "$SCHEDULER_PATH_SRC" "$SCHEDULER_PATH_DEST"

# === Create /var/lib/ipfluxio if needed ===
echo "Setting up config directory at /var/lib/ipfluxio..."
mkdir -p /var/lib/ipfluxio
chown $SUDO_USER:$SUDO_USER /var/lib/ipfluxio
chmod 755 /var/lib/ipfluxio

# === Install backend and default-env ===
echo "Installing backend and default-env to $INSTALL_ROOT..."
mkdir -p "$INSTALL_ROOT"
mkdir -p "$LOGS_DST"

cp -r "$APP_PAYLOAD_DIR"/. "$INSTALL_ROOT"
cp -r "$BACKEND_SRC" "$INSTALL_ROOT/backend"
cp -r "$LOGS_SRC" "$LOGS_DST"
cp -r "$ENV_SRC" "$INSTALL_ROOT/default-env"

chmod -R o+rx "$INSTALL_ROOT"
chmod -R o+rwX "$INSTALL_ROOT/backend"
chmod -R o+rwX "$INSTALL_ROOT/default-env"

chown -R root:$SUDO_USER "$LOGS_DST/logs"
chmod -R 775 "$LOGS_DST/logs"
find /var/log/ipfluxio/logs -type d -exec chmod g+s {} \;

# === Create Python virtual environment ===
echo "Creating Python virtual environment..."
BOOTSTRAP_PYTHON=$(getent passwd "$SUDO_USER" | cut -d: -f6)/.pyenv/shims/python3

# Fallback if pyenv is not used
if [ ! -x "$BOOTSTRAP_PYTHON" ]; then
  BOOTSTRAP_PYTHON=$(command -v python3)
fi

if [ ! -x "$BOOTSTRAP_PYTHON" ]; then
  echo "Could not find a working python3 binary."
  exit 1
fi

$BOOTSTRAP_PYTHON -m venv --copies "$INSTALL_ROOT/venv"

echo "Installing Python dependencies into /opt/ipfluxio/venv..."
"$INSTALL_ROOT/venv/bin/pip" install --upgrade pip
"$INSTALL_ROOT/venv/bin/pip" install -r "$INSTALL_ROOT/backend/requirements.txt"

# Set permissions so root can run via systemd
chmod -R o+rx "$INSTALL_ROOT/venv"

# === Enable systemd path watcher ===
echo "Reloading systemd and enabling scheduler watcher..."
systemctl daemon-reexec
systemctl daemon-reload
systemctl enable --now ipfluxio-scheduler.path

# === Symlink for CLI ===
echo "Creating CLI launcher script at /usr/local/bin/ipfluxio..."
if [[ ! -f /usr/local/bin/ipfluxio ]]; then
  ln -s /opt/ipfluxio/ipfluxio /usr/local/bin/ipfluxio
  echo "Symlink created: /usr/local/bin/ipfluxio -> /opt/ipfluxio/ipfluxio"
else
  echo "Symlink already exists: /usr/local/bin/ipfluxio"
fi

chmod +x /usr/local/bin/ipfluxio

# === Desktop entry ===
echo "Installing icon and .desktop entry..."
cp "$SCRIPT_DIR/assets/cyborgcat.png" /usr/share/pixmaps/cyborgcat.png
chmod 644 /usr/share/pixmaps/cyborgcat.png

cat <<EOF > /usr/share/applications/ipfluxio.desktop
[Desktop Entry]
Name=ipfluxio
Comment=Network Analysis Tool
Exec=/usr/local/bin/ipfluxio
Icon=cyborgcat
Terminal=false
Type=Application
Categories=Utility;Network;
EOF

chmod 644 /usr/share/applications/ipfluxio.desktop
update-desktop-database /usr/share/applications || true

echo "Post-install setup complete. Scheduler watch active. Python venv ready in $INSTALL_ROOT/venv"

