#!/bin/bash
set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run this installer as root (e.g. sudo ./INSTALL.sh)"
  exit 1
fi

INSTALL_DIR=/opt/ipfluxio

echo "[+] Installing IPFluxIO to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cp -r * "$INSTALL_DIR"

echo "[+] Running postinstall script..."
bash "$INSTALL_DIR/postinstall.sh"

echo "[✓] Installation complete. Run with: ipfluxio"
